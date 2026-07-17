import type { PlatformDatabase } from '../database/db.js';
import type { Principal } from './types.js';

function count(database: PlatformDatabase, sql: string, ...parameters: (string | number | null)[]): number {
  return Number(database.prepare(sql).get(...parameters)?.count ?? 0);
}

export function dashboardData(database: PlatformDatabase, principal: Principal): object {
  const wholesale = principal.roles.includes('WHOLESALE');
  const companyId = principal.companyId;
  const common = {
    products: count(database, 'SELECT COUNT(*) AS count FROM products WHERE demo_active=1'),
    unreadNotifications: count(database, 'SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND read_at IS NULL', principal.userId)
  };

  if (wholesale) {
    return {
      profile: 'WHOLESALE',
      metrics: {
        ...common,
        quotes: count(database, 'SELECT COUNT(*) AS count FROM quotes WHERE company_id=?', companyId),
        orders: count(database, 'SELECT COUNT(*) AS count FROM orders WHERE company_id=?', companyId),
        conversations: count(database, 'SELECT COUNT(*) AS count FROM conversations WHERE company_id=?', companyId)
      },
      recent: database.prepare(`SELECT order_number AS label,status,created_at FROM orders
        WHERE company_id=? ORDER BY created_at DESC LIMIT 5`).all(companyId)
    };
  }

  return {
    profile: principal.roles.includes('ADMIN') ? 'ADMIN' : 'EMPLOYEE',
    metrics: {
      ...common,
      openRequests: count(database, "SELECT COUNT(*) AS count FROM requests WHERE status NOT IN ('RESOLVED','CLOSED')"),
      companiesInReview: count(database, "SELECT COUNT(*) AS count FROM companies WHERE approval_status IN ('SUBMITTED','UNDER_REVIEW')"),
      activeOrders: count(database, "SELECT COUNT(*) AS count FROM orders WHERE status NOT IN ('DELIVERED','CANCELLED','RETURNED')"),
      lowStock: count(database, `SELECT COUNT(*) AS count FROM inventory_items i WHERE
        (SELECT COALESCE(SUM(m.physical_delta-m.reserved_delta),0) FROM inventory_movements m WHERE m.inventory_item_id=i.id) <= i.low_stock_threshold`)
    },
    recent: database.prepare(`SELECT action AS status,entity_type || ' ' || entity_id AS label,created_at
      FROM audit_events ORDER BY created_at DESC LIMIT 8`).all()
  };
}

export function notificationData(database: PlatformDatabase, principal: Principal): readonly object[] {
  return database.prepare(`SELECT id,notification_type,title,body,read_at,created_at FROM notifications
    WHERE user_id=? ORDER BY created_at DESC LIMIT 12`).all(principal.userId);
}
