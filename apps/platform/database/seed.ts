import { createHmac, randomBytes, scryptSync } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, type PlatformConfig } from '../src/config.js';
import { openDatabase, withTransaction, type PlatformDatabase } from './db.js';
import { migrateDatabase } from './migrate.js';

const FIXED_NOW = '2026-07-17T12:00:00.000Z';
const permissionCodes = [
  'catalog.read', 'catalog.write', 'prices.read', 'prices.write', 'inventory.read', 'inventory.write',
  'customers.read', 'customers.write', 'companies.read', 'companies.approve', 'quotes.read', 'quotes.write',
  'orders.read', 'orders.write', 'requests.read', 'requests.write', 'messages.read', 'messages.write', 'users.read', 'users.write',
  'settings.read', 'settings.write', 'audit.read', 'reports.read'
] as const;

const mutableTables = [
  'inbound_webhooks', 'delivery_outbox', 'delivery_templates', 'documents',   'mfa_recovery_codes', 'mfa_credentials', 'team_members', 'teams', 'user_consents', 'terms_versions', 'account_tokens', 'user_invitations',
  'settings', 'notifications', 'audit_events', 'approvals', 'shipments', 'reservations', 'order_items', 'orders',
  'quote_items', 'quotes', 'messages', 'conversations', 'requests', 'leads', 'inventory_movements',
  'inventory_items', 'prices', 'product_variants', 'products', 'message_templates', 'customer_addresses',
  'customers', 'company_documents', 'sessions', 'user_roles', 'users', 'role_permissions', 'permissions',
  'roles', 'companies', 'price_lists'
] as const;

type CatalogCapacity = { readonly usd: number };
type CatalogProduct = {
  readonly id: string;
  readonly model: string;
  readonly year: number;
  readonly group: 'new' | 'cpo';
  readonly colors: readonly string[];
  readonly capacities: Readonly<Record<string, CatalogCapacity>>;
};
type Catalog = { readonly products: readonly CatalogProduct[] };

export interface SeedSummary {
  readonly admin: number;
  readonly employees: number;
  readonly wholesalers: number;
  readonly companies: number;
  readonly customers: number;
  readonly requests: number;
  readonly quotes: number;
  readonly orders: number;
  readonly messages: number;
  readonly products: number;
  readonly variants: number;
}

function id(prefix: string, index: number): string {
  return `${prefix}-demo-${String(index).padStart(4, '0')}`;
}

function requiredAt<T>(values: readonly T[], index: number, label: string): T {
  const value = values[index];
  if (value === undefined) throw new Error(`Valor DEMO ausente em ${label}: ${index}`);
  return value;
}

function demoPasswordHash(password: string, email: string, config: PlatformConfig): { hash: string; salt: string } {
  const salt = createHmac('sha256', config.sessionSecret).update(`demo-salt:${email}`).digest('hex').slice(0, 32);
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function insertUser(
  database: PlatformDatabase,
  config: PlatformConfig,
  userId: string,
  email: string,
  name: string,
  password: string,
  companyId: string | null,
  roleId: string
): void {
  const passwordData = demoPasswordHash(password, email, config);
  database.prepare(`
    INSERT INTO users (id,email,display_name,password_hash,password_salt,status,company_id,created_at,updated_at)
    VALUES (?,?,?,?,?,'ACTIVE',?,?,?)
  `).run(userId, email, name, passwordData.hash, passwordData.salt, companyId, FIXED_NOW, FIXED_NOW);
  database.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(userId, roleId);
}

export function seedDatabase(
  database: PlatformDatabase,
  config: PlatformConfig,
  password: string
): SeedSummary {
  migrateDatabase(database);
  const catalogPath = path.join(config.repositoryRoot, 'data', 'catalog-public.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as Catalog;

  return withTransaction(database, () => {
    for (const table of mutableTables) database.exec(`DELETE FROM ${table}`);

    const priceLists = [
      ['price-list-demo-retail', 'DEMO-RETAIL', 'Varejo DEMO', 'RETAIL'],
      ['price-list-demo-cpo', 'DEMO-CPO', 'CPO DEMO', 'CPO'],
      ['price-list-demo-wholesale', 'DEMO-WHOLESALE', 'Atacado Padrao DEMO', 'WHOLESALE'],
      ['price-list-demo-premium', 'DEMO-WHOLESALE-PREMIUM', 'Atacado Premium DEMO', 'WHOLESALE']
    ] as const;
    for (const list of priceLists) {
      database.prepare(`INSERT INTO price_lists
        (id,code,name,list_type,currency,status,valid_from,created_at,updated_at)
        VALUES (?,?,?,?,?,'ACTIVE',?,?,?)`).run(list[0], list[1], list[2], list[3], 'USD', FIXED_NOW, FIXED_NOW, FIXED_NOW);
    }

    const companies = [
      ['company-demo-internal', 'CELULARS Operacao DEMO', 'INTERNAL', 'US', 'DEMO-US-INTERNAL', 'Administrador Demo', 'APPROVED', 'INTERNAL', 'price-list-demo-retail'],
      ['company-demo-1', 'Loja Exemplo Miami LLC', 'WHOLESALE', 'US', 'DEMO-US-001', 'Comprador Demo 01', 'APPROVED', 'PREMIUM', 'price-list-demo-premium'],
      ['company-demo-2', 'Revenda Modelo Brasil Ltda.', 'WHOLESALE', 'BR', 'DEMO-BR-002', 'Comprador Demo 02', 'UNDER_REVIEW', 'STANDARD', 'price-list-demo-wholesale'],
      ['company-demo-3', 'Mobile Partner Demo Inc.', 'WHOLESALE', 'US', 'DEMO-US-003', 'Comprador Demo 03', 'SUBMITTED', 'STANDARD', 'price-list-demo-wholesale'],
      ['company-demo-4', 'Distribuidora Exemplo SA', 'WHOLESALE', 'BR', 'DEMO-BR-004', 'Comprador Demo 04', 'DRAFT', 'STANDARD', 'price-list-demo-wholesale'],
      ['company-demo-5', 'Tech Outlet Demonstracao LLC', 'WHOLESALE', 'US', 'DEMO-US-005', 'Comprador Demo 05', 'SUSPENDED', 'STANDARD', 'price-list-demo-wholesale']
    ] as const;
    for (const company of companies) {
      database.prepare(`INSERT INTO companies
        (id,name,company_type,country,demo_identifier,contact_name,contact_email,approval_status,classification,price_list_id,carrier_name,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?, ?,?,?,?, ?,?)`).run(
        company[0], company[1], company[2], company[3], company[4], company[5],
        `${company[0]}@demo.invalid`, company[6], company[7], company[8], 'Transportadora Demonstracao', FIXED_NOW, FIXED_NOW
      );
    }

    const roles = [
      ['role-admin', 'ADMIN', 'Administrador'],
      ['role-employee', 'EMPLOYEE', 'Funcionario'],
      ['role-wholesale', 'WHOLESALE', 'Atacadista']
    ] as const;
    for (const role of roles) {
      database.prepare('INSERT INTO roles (id,code,name,created_at) VALUES (?,?,?,?)').run(...role, FIXED_NOW);
    }
    for (const [index, code] of permissionCodes.entries()) {
      database.prepare('INSERT INTO permissions (id,code,description,created_at) VALUES (?,?,?,?)')
        .run(id('permission', index + 1), code, `Permissao DEMO ${code}`, FIXED_NOW);
    }
    const adminPermissions = [...permissionCodes];
    const employeePermissions = permissionCodes.filter((code) => !['users.read','users.write','settings.read','settings.write','companies.approve'].includes(code));
    const wholesalePermissions = ['catalog.read','prices.read','quotes.read','quotes.write','orders.read','requests.read','requests.write','messages.read','messages.write','companies.read','reports.read'] as const;
    for (const [roleId, codes] of [['role-admin', adminPermissions], ['role-employee', employeePermissions], ['role-wholesale', wholesalePermissions]] as const) {
      for (const code of codes) {
        const permission = database.prepare('SELECT id FROM permissions WHERE code = ?').get(code);
        if (!permission) throw new Error(`Permissao ausente: ${code}`);
        database.prepare('INSERT INTO role_permissions (role_id,permission_id) VALUES (?,?)').run(roleId, String(permission.id));
      }
    }

    insertUser(database, config, 'user-demo-admin', 'admin@demo.invalid', 'Administrador Demo', password, 'company-demo-internal', 'role-admin');
    for (let index = 1; index <= 3; index += 1) {
      insertUser(database, config, id('user-employee', index), `funcionario${index}@demo.invalid`, `Funcionario Demo ${String(index).padStart(2, '0')}`, password, 'company-demo-internal', 'role-employee');
    }
    for (let index = 1; index <= 5; index += 1) {
      insertUser(database, config, id('user-wholesale', index), `atacadista${index}@demo.invalid`, `Atacadista Demo ${String(index).padStart(2, '0')}`, password, `company-demo-${index}`, 'role-wholesale');
      database.prepare(`INSERT INTO company_documents (id,company_id,file_name,mime_type,storage_key,status,created_at)
        VALUES (?,?,?,?,?,'DEMO',?)`).run(id('document', index), `company-demo-${index}`, `DOCUMENTO-DEMO-${index}.pdf`, 'application/pdf', `demo/documents/company-${index}.pdf`, FIXED_NOW);
    }

    for (let index = 1; index <= 15; index += 1) {
      const customerId = id('customer', index);
      database.prepare(`INSERT INTO customers
        (id,name,email,phone_demo,country,language,source,status,notes,assigned_user_id,company_id,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        customerId, `Cliente Demo ${String(index).padStart(3, '0')}`, `cliente${index}@example.test`, `DEMO-PHONE-${index}`,
        index % 2 === 0 ? 'BR' : 'US', index % 2 === 0 ? 'pt-BR' : 'en-US', index % 3 === 0 ? 'WhatsApp DEMO' : 'Site DEMO',
        index % 4 === 0 ? 'LEAD' : 'ACTIVE', 'Registro totalmente ficticio para homologacao.', id('user-employee', ((index - 1) % 3) + 1),
        index <= 5 ? `company-demo-${index}` : null, FIXED_NOW, FIXED_NOW
      );
      database.prepare(`INSERT INTO customer_addresses (id,customer_id,label,address_demo,country,created_at)
        VALUES (?,?,?,?,?,?)`).run(id('address', index), customerId, 'Endereco DEMO', `ENDERECO FICTICIO DEMO ${index}`, index % 2 === 0 ? 'BR' : 'US', FIXED_NOW);
    }

    let variantIndex = 0;
    for (const [productIndex, product] of catalog.products.entries()) {
      const productId = `product-demo-${product.id}`;
      database.prepare(`INSERT INTO products
        (id,canonical_key,model_name,year,product_type,demo_active,canonical_snapshot,created_at,updated_at)
        VALUES (?,?,?,?,?,1,?,?,?)`).run(productId, product.id, product.model, product.year, product.group === 'new' ? 'NEW' : 'CPO', JSON.stringify(product), FIXED_NOW, FIXED_NOW);
      for (const [capacityIndex, capacity] of Object.keys(product.capacities).entries()) {
        for (const [colorIndex, color] of product.colors.entries()) {
          variantIndex += 1;
          const variantId = id('variant', variantIndex);
          database.prepare(`INSERT INTO product_variants
            (id,product_id,capacity,color,sku_demo,active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)`)
            .run(variantId, productId, capacity, color, `DEMO-SKU-${String(variantIndex).padStart(5, '0')}`, FIXED_NOW, FIXED_NOW);
          const amounts = [11111, 22222, 33333, 44444];
          for (const [listIndex, list] of priceLists.entries()) {
            database.prepare(`INSERT INTO prices
              (id,price_list_id,variant_id,amount_cents,currency,valid_from,created_at,updated_at)
              VALUES (?,?,?,?,?,?,?,?)`).run(id('price', variantIndex * 10 + listIndex), list[0], variantId, requiredAt(amounts, (productIndex + capacityIndex + colorIndex + listIndex) % amounts.length, 'precos'), 'USD', FIXED_NOW, FIXED_NOW, FIXED_NOW);
          }
          if (variantIndex <= 36) {
            const itemId = id('inventory', variantIndex);
            database.prepare(`INSERT INTO inventory_items (id,variant_id,low_stock_threshold,created_at,updated_at)
              VALUES (?,?,2,?,?)`).run(itemId, variantId, FIXED_NOW, FIXED_NOW);
            database.prepare(`INSERT INTO inventory_movements
              (id,inventory_item_id,movement_type,physical_delta,reserved_delta,reference_type,reference_id,notes,actor_user_id,created_at)
              VALUES (?,?,'RECEIPT',?,0,'SEED',?,'Entrada ficticia DEMO','user-demo-admin',?)`)
              .run(id('movement', variantIndex), itemId, 5 + (variantIndex % 8), `DEMO-RECEIPT-${variantIndex}`, FIXED_NOW);
          }
        }
      }
    }

    for (let index = 1; index <= 20; index += 1) {
      const leadId = id('lead', index);
      const status = requiredAt(['NEW','ASSIGNED','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED'], index % 5, 'status do lead');
      database.prepare(`INSERT INTO leads
        (id,customer_id,company_id,lead_type,status,priority,tags_json,assigned_user_id,internal_notes,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(leadId, id('customer', ((index - 1) % 15) + 1), index <= 5 ? `company-demo-${index}` : null,
        requiredAt(['RETAIL','WHOLESALE','PRODUCT','PRICE','SHIPPING'], index % 5, 'tipo do lead'), status, requiredAt(['LOW','NORMAL','HIGH','URGENT'], index % 4, 'prioridade do lead'),
        JSON.stringify(['DEMO', `LOTE-${(index % 3) + 1}`]), id('user-employee', ((index - 1) % 3) + 1), 'Observacao interna ficticia.', FIXED_NOW, FIXED_NOW);
      database.prepare(`INSERT INTO requests
        (id,lead_id,title,description,status,created_by_user_id,assigned_user_id,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?)`).run(id('request', index), leadId, `Solicitacao DEMO ${String(index).padStart(4, '0')}`, 'Solicitacao ficticia para teste de fluxo.', status,
        index <= 5 ? id('user-wholesale', index) : 'user-demo-admin', id('user-employee', ((index - 1) % 3) + 1), FIXED_NOW, FIXED_NOW);
    }

    for (let index = 1; index <= 10; index += 1) {
      const conversationId = id('conversation', index);
      database.prepare(`INSERT INTO conversations
        (id,company_id,customer_id,subject,status,assigned_user_id,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?)`).run(conversationId, index <= 5 ? `company-demo-${index}` : null, id('customer', index), `Conversa DEMO ${index}`, index % 3 === 0 ? 'CLOSED' : 'OPEN', id('user-employee', ((index - 1) % 3) + 1), FIXED_NOW, FIXED_NOW);
      for (let messageIndex = 1; messageIndex <= 3; messageIndex += 1) {
        const globalIndex = (index - 1) * 3 + messageIndex;
        database.prepare(`INSERT INTO messages
          (id,conversation_id,sender_user_id,body,message_type,external_delivery,created_at)
          VALUES (?,?,?,?,?,'DEMO_NOT_SENT',?)`).run(id('message', globalIndex), conversationId,
          messageIndex % 2 === 0 ? id('user-employee', ((index - 1) % 3) + 1) : (index <= 5 ? id('user-wholesale', index) : 'user-demo-admin'),
          `Mensagem ficticia DEMO ${globalIndex}. Nenhum envio externo foi realizado.`, messageIndex === 3 ? 'INTERNAL_NOTE' : 'MESSAGE', FIXED_NOW);
      }
    }
    database.prepare(`INSERT INTO message_templates (id,name,body,active,created_at,updated_at)
      VALUES ('template-demo-1','Resposta inicial DEMO','Esta e uma resposta interna de demonstracao.',1,?,?)`).run(FIXED_NOW, FIXED_NOW);

    for (let index = 1; index <= 10; index += 1) {
      const quoteId = id('quote', index);
      const quoteStatus = requiredAt(['DRAFT','SENT','VIEWED','ACCEPTED','REJECTED','EXPIRED','CONVERTED'], index % 7, 'status da cotacao');
      database.prepare(`INSERT INTO quotes
        (id,quote_number,company_id,customer_id,status,currency,discount_cents,notes,created_by_user_id,expires_at,created_at,updated_at)
        VALUES (?,?,?,?,?,'USD',?,'Cotacao inteiramente ficticia DEMO',?,?,?,?)`).run(quoteId, `DEMO-Q-${String(index).padStart(4, '0')}`,
        index <= 5 ? `company-demo-${index}` : null, id('customer', index), quoteStatus, index * 100, id('user-employee', ((index - 1) % 3) + 1), '2026-08-17T12:00:00.000Z', FIXED_NOW, FIXED_NOW);
      database.prepare(`INSERT INTO quote_items (id,quote_id,variant_id,quantity,unit_price_cents,discount_cents,notes)
        VALUES (?,?,?,?,?,?,?)`).run(id('quote-item', index), quoteId, id('variant', index), (index % 3) + 1, requiredAt([11111,22222,33333], index % 3, 'preco do item da cotacao'), 0, 'Item DEMO');
    }

    for (let index = 1; index <= 8; index += 1) {
      const orderId = id('order', index);
      const orderStatus = requiredAt(['DRAFT','CONFIRMED','RESERVED','READY_FOR_PICKUP','SHIPPED','DELIVERED','CANCELLED','RETURNED'], index - 1, 'status do pedido');
      database.prepare(`INSERT INTO orders
        (id,order_number,quote_id,company_id,customer_id,status,payment_status,currency,delivery_method,address_demo,carrier_demo,notes,assigned_user_id,created_at,updated_at)
        VALUES (?,?,?,?,?,?,'PENDING','USD',?,?,?,?,?,?,?)`).run(orderId, `DEMO-${String(index).padStart(4, '0')}`, id('quote', index), index <= 5 ? `company-demo-${index}` : null,
        id('customer', index), orderStatus, requiredAt(['MIAMI_PICKUP','US_DOMESTIC','BRAZIL_CARRIER','WHOLESALE_CARRIER'], index % 4, 'metodo de entrega'), `ENDERECO FICTICIO DEMO ${index}`,
        'Transportadora Demonstracao', 'Pedido ficticio sem pagamento real.', id('user-employee', ((index - 1) % 3) + 1), FIXED_NOW, FIXED_NOW);
      database.prepare('INSERT INTO order_items (id,order_id,variant_id,quantity,unit_price_cents) VALUES (?,?,?,?,?)')
        .run(id('order-item', index), orderId, id('variant', index), 1, requiredAt([11111,22222,33333,44444], index % 4, 'preco do item do pedido'));
      database.prepare(`INSERT INTO shipments
        (id,order_id,status,method,carrier_demo,tracking_demo,shipping_cost_cents,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?)`).run(id('shipment', index), orderId, index >= 5 ? 'IN_TRANSIT' : 'PENDING', requiredAt(['MIAMI_PICKUP','US_DOMESTIC','BRAZIL_CARRIER','WHOLESALE_CARRIER'], index % 4, 'metodo de envio'),
        'Transportadora Demonstracao', `DEMO-TRACK-${index}`, index % 4 === 2 ? 12500 : index % 4 === 3 ? 20000 : 2500, FIXED_NOW, FIXED_NOW);
    }

    for (let index = 1; index <= 5; index += 1) {
      database.prepare(`INSERT INTO approvals (id,company_id,from_status,to_status,notes,actor_user_id,created_at)
        VALUES (?,?,?,?,?,'user-demo-admin',?)`).run(id('approval', index), `company-demo-${index}`, 'SUBMITTED', companies[index]?.[6] ?? 'UNDER_REVIEW', 'Decisao ficticia DEMO.', FIXED_NOW);
    }
    for (let index = 1; index <= 12; index += 1) {
      database.prepare(`INSERT INTO notifications (id,user_id,notification_type,title,body,entity_type,entity_id,dedupe_key,created_at)
        VALUES (?,?,?,?,?,?,?,?,?)`).run(id('notification', index), index % 4 === 0 ? 'user-demo-admin' : id('user-employee', ((index - 1) % 3) + 1),
        requiredAt(['NEW_REQUEST','COMPANY_REVIEW','QUOTE_ACCEPTED','LOW_STOCK'], index % 4, 'tipo de notificacao'), `Notificacao DEMO ${index}`, 'Evento ficticio para homologacao.',
        'DEMO_ENTITY', `demo-${index}`, `SEED:${index}`, FIXED_NOW);
      database.prepare(`INSERT INTO audit_events
        (id,actor_user_id,actor_role,action,entity_type,entity_id,before_json,after_json,company_id,ip_address,user_agent,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(id('audit', index), index % 2 === 0 ? 'user-demo-admin' : id('user-employee', ((index - 1) % 3) + 1),
        index % 2 === 0 ? 'ADMIN' : 'EMPLOYEE', requiredAt(['CREATE','UPDATE','APPROVE','INVENTORY_MOVEMENT'], index % 4, 'acao de auditoria'),
        'DEMO_ENTITY', `demo-${index}`, null, JSON.stringify({ demo: true, index }), 'company-demo-internal', '127.0.0.1', 'CELULARS-DEMO-SEED', FIXED_NOW);
    }

    const settings = {
      operation_name: 'CELULARS DEMO', currency: 'USD', celulares_adjustment: '0.1500', brazil_cpo_shipping: '125.00',
      brazil_new_shipping: '200.00', reservation_minutes: '60', default_language: 'pt-BR', low_stock_threshold: '2',
      notification_templates: JSON.stringify({ request: 'Nova solicitacao DEMO', quote: 'Cotacao DEMO atualizada', order: 'Pedido DEMO atualizado' }),
      default_order_status: 'DRAFT', quote_sequence_prefix: 'DEMO-Q', order_sequence_prefix: 'DEMO-O',
      notifications_enabled: 'true', demo_mode: 'true'
    };
    let settingIndex = 0;
    for (const [key, value] of Object.entries(settings)) {
      settingIndex += 1;
      database.prepare(`INSERT INTO settings (id,setting_key,setting_value,value_type,updated_by_user_id,created_at,updated_at)
        VALUES (?,?,?,'STRING','user-demo-admin',?,?)`).run(id('setting', settingIndex), key, value, FIXED_NOW, FIXED_NOW);
    }

    return {
      admin: 1, employees: 3, wholesalers: 5, companies: 5, customers: 15, requests: 20,
      quotes: 10, orders: 8, messages: 30, products: catalog.products.length, variants: variantIndex
    };
  });
}

function generatedPassword(): string {
  return process.env.PLATFORM_DEMO_PASSWORD?.trim() || `Demo-${randomBytes(12).toString('base64url')}!`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  const database = openDatabase(config);
  const password = generatedPassword();
  try {
    const summary = seedDatabase(database, config, password);
    writeFileSync(config.credentialsPath, `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      warning: 'CREDENCIAIS EXCLUSIVAS DO AMBIENTE LOCAL DEMO',
      password,
      accounts: {
        admin: 'admin@demo.invalid',
        employees: ['funcionario1@demo.invalid','funcionario2@demo.invalid','funcionario3@demo.invalid'],
        wholesalers: ['atacadista1@demo.invalid','atacadista2@demo.invalid','atacadista3@demo.invalid','atacadista4@demo.invalid','atacadista5@demo.invalid']
      }
    }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    console.log(`Seed DEMO concluido: ${JSON.stringify(summary)}`);
    console.log(`Credenciais locais gravadas em ${config.credentialsPath}`);
  } finally {
    database.close();
  }
}
