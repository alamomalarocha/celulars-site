import { randomUUID } from 'node:crypto';
import type { PlatformDatabase } from '../database/db.js';
import { withTransaction } from '../database/db.js';
import type { Principal } from './types.js';

interface PriceRevisionInput {
  readonly priceListId?: string;
  readonly variantId?: string;
  readonly amountCents?: number;
}

interface InventoryMovementInput {
  readonly inventoryItemId?: string;
  readonly movementType?: string;
  readonly quantity?: number;
  readonly notes?: string;
}

function isWholesale(principal: Principal): boolean {
  return principal.roles.includes('WHOLESALE');
}

function assignedPriceList(database: PlatformDatabase, principal: Principal): string | null {
  if (!isWholesale(principal) || !principal.companyId) return null;
  return String(database.prepare('SELECT price_list_id FROM companies WHERE id=?').get(principal.companyId)?.price_list_id ?? '') || null;
}

export function catalogData(database: PlatformDatabase): object {
  const products = database.prepare(`SELECT p.id,p.canonical_key,p.model_name,p.year,p.product_type,p.demo_active,
      COUNT(v.id) AS variant_count,GROUP_CONCAT(DISTINCT v.capacity) AS capacities,GROUP_CONCAT(DISTINCT v.color) AS colors
    FROM products p LEFT JOIN product_variants v ON v.product_id=p.id AND v.active=1
    GROUP BY p.id ORDER BY p.year DESC,p.model_name`).all().map((row) => ({
      ...row,
      capacities: String(row.capacities ?? '').split(',').filter(Boolean),
      colors: String(row.colors ?? '').split(',').filter(Boolean)
    }));
  return { products, source: 'catalogo-publico-sincronizado', environment: 'DEMO' };
}

export function priceListData(database: PlatformDatabase, principal: Principal): object {
  const selectedList = assignedPriceList(database, principal);
  const lists = selectedList
    ? database.prepare(`SELECT id,code,name,list_type,currency,status,valid_from,valid_until
        FROM price_lists WHERE id=? ORDER BY name`).all(selectedList)
    : database.prepare(`SELECT id,code,name,list_type,currency,status,valid_from,valid_until
        FROM price_lists ORDER BY list_type,name`).all();
  return { lists, readOnly: isWholesale(principal), environment: 'DEMO' };
}

export function priceData(database: PlatformDatabase, principal: Principal, requestedListId: string | null, search: string): object {
  const selectedList = assignedPriceList(database, principal);
  if (selectedList && requestedListId && requestedListId !== selectedList) throw new Error('FORBIDDEN:prices.read');
  const listId = selectedList ?? requestedListId;
  const term = `%${search.trim().slice(0, 80)}%`;
  const rows = database.prepare(`SELECT pr.id,pr.price_list_id,pl.name AS price_list_name,pr.variant_id,
      p.model_name,p.product_type,v.capacity,v.color,v.sku_demo,pr.amount_cents,pr.currency,pr.valid_from,pr.valid_until
    FROM prices pr
    JOIN price_lists pl ON pl.id=pr.price_list_id
    JOIN product_variants v ON v.id=pr.variant_id
    JOIN products p ON p.id=v.product_id
    WHERE pr.valid_until IS NULL AND (? IS NULL OR pr.price_list_id=?)
      AND (?='%%' OR p.model_name LIKE ? OR v.capacity LIKE ? OR v.color LIKE ? OR v.sku_demo LIKE ?)
    ORDER BY p.year DESC,p.model_name,v.capacity,v.color LIMIT 150`).all(listId, listId, term, term, term, term, term);
  return { prices: rows, priceListId: listId, readOnly: isWholesale(principal), environment: 'DEMO' };
}

export function createPriceRevision(database: PlatformDatabase, principal: Principal, input: PriceRevisionInput): object {
  const priceListId = input.priceListId?.trim() ?? '';
  const variantId = input.variantId?.trim() ?? '';
  const amountCents = Number(input.amountCents);
  if (!priceListId || !variantId || !Number.isInteger(amountCents) || amountCents < 0 || amountCents > 100_000_000) {
    throw new Error('INVALID_PRICE_REVISION');
  }
  const now = new Date().toISOString();
  return withTransaction(database, () => {
    const list = database.prepare("SELECT id,currency FROM price_lists WHERE id=? AND status='ACTIVE'").get(priceListId);
    const variant = database.prepare('SELECT id FROM product_variants WHERE id=? AND active=1').get(variantId);
    if (!list || !variant) throw new Error('INVALID_PRICE_REVISION');
    const previous = database.prepare(`SELECT id,amount_cents,currency,valid_from FROM prices
      WHERE price_list_id=? AND variant_id=? AND valid_until IS NULL ORDER BY valid_from DESC LIMIT 1`).get(priceListId, variantId);
    if (previous) database.prepare('UPDATE prices SET valid_until=?,updated_at=? WHERE id=?').run(now, now, String(previous.id));
    const id = randomUUID();
    database.prepare(`INSERT INTO prices
      (id,price_list_id,variant_id,amount_cents,currency,valid_from,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?)`).run(id, priceListId, variantId, amountCents, String(list.currency), now, now, now);
    return { id, previous: previous ?? null, current: { amountCents, currency: String(list.currency), validFrom: now }, actor: principal.userId };
  });
}

export function inventoryData(database: PlatformDatabase, search: string, lowOnly: boolean): object {
  const term = `%${search.trim().slice(0, 80)}%`;
  const rows = database.prepare(`SELECT i.id,i.variant_id,p.model_name,p.product_type,v.capacity,v.color,v.sku_demo,i.low_stock_threshold,
      COALESCE(SUM(m.physical_delta),0) AS physical_quantity,
      COALESCE(SUM(m.reserved_delta),0) AS reserved_quantity,
      COALESCE(SUM(m.physical_delta-m.reserved_delta),0) AS available_quantity
    FROM inventory_items i
    JOIN product_variants v ON v.id=i.variant_id
    JOIN products p ON p.id=v.product_id
    LEFT JOIN inventory_movements m ON m.inventory_item_id=i.id
    WHERE (?='%%' OR p.model_name LIKE ? OR v.capacity LIKE ? OR v.color LIKE ? OR v.sku_demo LIKE ?)
    GROUP BY i.id
    HAVING (?=0 OR available_quantity<=i.low_stock_threshold)
    ORDER BY available_quantity ASC,p.year DESC,p.model_name,v.capacity,v.color`).all(term, term, term, term, term, lowOnly ? 1 : 0);
  return { inventory: rows, immutableLedger: true, environment: 'DEMO' };
}

function movementDeltas(type: string, quantity: number): { physical: number; reserved: number } | null {
  const rules: Readonly<Record<string, { physical: number; reserved: number }>> = {
    RECEIPT: { physical: 1, reserved: 0 }, RETURN: { physical: 1, reserved: 0 }, ADJUSTMENT_IN: { physical: 1, reserved: 0 },
    SALE: { physical: -1, reserved: 0 }, ADJUSTMENT_OUT: { physical: -1, reserved: 0 },
    RESERVATION: { physical: 0, reserved: 1 }, RELEASE: { physical: 0, reserved: -1 },
    TRANSFER: { physical: 0, reserved: 0 }, CANCELLATION: { physical: 0, reserved: -1 }
  };
  const rule = rules[type];
  return rule ? { physical: rule.physical * quantity, reserved: rule.reserved * quantity } : null;
}

export function recordInventoryMovement(database: PlatformDatabase, principal: Principal, input: InventoryMovementInput): object {
  const inventoryItemId = input.inventoryItemId?.trim() ?? '';
  const movementType = input.movementType?.trim().toUpperCase() ?? '';
  const quantity = Number(input.quantity);
  const notes = input.notes?.trim().slice(0, 500) ?? '';
  const deltas = Number.isInteger(quantity) && quantity > 0 && quantity <= 10_000 ? movementDeltas(movementType, quantity) : null;
  if (!inventoryItemId || !deltas || notes.length < 3) throw new Error('INVALID_INVENTORY_MOVEMENT');
  const now = new Date().toISOString();
  return withTransaction(database, () => {
    const balance = database.prepare(`SELECT i.id,COALESCE(SUM(m.physical_delta),0) AS physical,
        COALESCE(SUM(m.reserved_delta),0) AS reserved
      FROM inventory_items i LEFT JOIN inventory_movements m ON m.inventory_item_id=i.id
      WHERE i.id=? GROUP BY i.id`).get(inventoryItemId);
    if (!balance) throw new Error('INVALID_INVENTORY_MOVEMENT');
    const nextPhysical = Number(balance.physical) + deltas.physical;
    const nextReserved = Number(balance.reserved) + deltas.reserved;
    if (nextPhysical < 0 || nextReserved < 0 || nextReserved > nextPhysical) throw new Error('INSUFFICIENT_INVENTORY');
    const id = randomUUID();
    database.prepare(`INSERT INTO inventory_movements
      (id,inventory_item_id,movement_type,physical_delta,reserved_delta,reference_type,reference_id,notes,actor_user_id,created_at)
      VALUES (?,?,?,?,?,'MANUAL_DEMO',?,?,?,?)`).run(id, inventoryItemId, movementType, deltas.physical, deltas.reserved, id, notes, principal.userId, now);
    return { id, inventoryItemId, movementType, quantity, balance: { physical: nextPhysical, reserved: nextReserved, available: nextPhysical - nextReserved }, actor: principal.userId };
  });
}
