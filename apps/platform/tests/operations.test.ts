import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { openDatabase } from '../database/db.js';
import { migrateDatabase } from '../database/migrate.js';
import { seedDatabase } from '../database/seed.js';
import { AuthService } from '../server/auth.js';
import { catalogData, createPriceRevision, inventoryData, priceData, priceListData, recordInventoryMovement } from '../server/operations.js';
import { loadConfig } from '../src/config.js';

const password = 'Local-Demo-Operations-Test!';

function removeDatabase(filePath: string): void {
  for (const candidate of [filePath, `${filePath}-wal`, `${filePath}-shm`]) if (existsSync(candidate)) rmSync(candidate);
}

test('catalog, prices and immutable inventory ledger stay scoped and auditable', () => {
  const base = loadConfig();
  const databasePath = path.join(base.platformRoot, 'data', `operations-test-${process.pid}.sqlite`);
  const config = loadConfig({ databasePath, sessionSecret: 'operations-test-secret-that-is-long-enough' });
  removeDatabase(databasePath);
  const database = openDatabase(config);
  migrateDatabase(database);
  seedDatabase(database, config, password);
  const auth = new AuthService(database, config);

  try {
    const admin = auth.login('admin@demo.invalid', password, { ipAddress: '127.0.0.1', userAgent: 'test' }).principal;
    const wholesale = auth.login('atacadista1@demo.invalid', password, { ipAddress: '127.0.0.1', userAgent: 'test' }).principal;
    const catalog = catalogData(database) as { products: readonly object[] };
    assert.equal(catalog.products.length, 31);

    const wholesaleLists = priceListData(database, wholesale) as { lists: readonly { id: string }[]; readOnly: boolean };
    assert.equal(wholesaleLists.lists.length, 1);
    assert.equal(wholesaleLists.readOnly, true);
    const wholesalePrices = priceData(database, wholesale, null, '') as { prices: readonly object[]; priceListId: string };
    assert.equal(wholesalePrices.priceListId, wholesaleLists.lists[0]?.id);
    assert.ok(wholesalePrices.prices.length > 0);
    assert.throws(() => priceData(database, wholesale, 'price-list-demo-retail', ''), /FORBIDDEN/);

    const current = database.prepare('SELECT price_list_id,variant_id,amount_cents FROM prices WHERE valid_until IS NULL LIMIT 1').get();
    assert.ok(current);
    const revision = createPriceRevision(database, admin, {
      priceListId: String(current.price_list_id), variantId: String(current.variant_id), amountCents: Number(current.amount_cents) + 100
    }) as { id: string };
    assert.ok(revision.id);
    assert.equal(Number(database.prepare('SELECT COUNT(*) AS count FROM prices WHERE price_list_id=? AND variant_id=? AND valid_until IS NULL').get(String(current.price_list_id), String(current.variant_id))?.count), 1);
    assert.equal(Number(database.prepare('SELECT amount_cents FROM prices WHERE id=?').get(revision.id)?.amount_cents), Number(current.amount_cents) + 100);

    const inventoryBefore = inventoryData(database, '', false) as { inventory: readonly { id: string; physical_quantity: number; available_quantity: number }[] };
    const item = inventoryBefore.inventory[0];
    assert.ok(item);
    const movement = recordInventoryMovement(database, admin, {
      inventoryItemId: item.id, movementType: 'RECEIPT', quantity: 2, notes: 'Recebimento de homologacao'
    }) as { balance: { physical: number; available: number } };
    assert.equal(movement.balance.physical, Number(item.physical_quantity) + 2);
    assert.equal(movement.balance.available, Number(item.available_quantity) + 2);
    assert.throws(() => recordInventoryMovement(database, admin, {
      inventoryItemId: item.id, movementType: 'SALE', quantity: 10_000, notes: 'Venda impossivel DEMO'
    }), /INSUFFICIENT_INVENTORY/);
    const transfer = recordInventoryMovement(database, admin, {
      inventoryItemId: item.id,
      movementType: 'TRANSFER',
      quantity: 1,
      notes: 'Transferencia interna de homologacao DEMO'
    }) as { movementType: string; quantity: number };
    assert.equal(transfer.movementType, 'TRANSFER');
    assert.equal(transfer.quantity, 1);
    assert.equal(Number(database.prepare(`SELECT COUNT(*) AS count FROM inventory_movements
      WHERE inventory_item_id=? AND movement_type='TRANSFER'`).get(item.id)?.count), 1);
  } finally {
    database.close();
    removeDatabase(databasePath);
  }
});
