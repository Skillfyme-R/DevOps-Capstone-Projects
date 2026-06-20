import knex, { Knex } from 'knex';
import { VVConfig } from '../config/loader';
import { createLogger } from '../utils/logger';

const logger = createLogger('vv-database');

export type Database = Knex;

export async function createDatabase(config: VVConfig): Promise<Database> {
  const dbConf = config.backend?.database;

  const db = knex({
    client: dbConf?.client ?? 'pg',
    connection: {
      host:     dbConf?.connection?.host     ?? 'localhost',
      port:     Number(dbConf?.connection?.port ?? 5433),
      user:     dbConf?.connection?.user     ?? 'vv_user',
      password: dbConf?.connection?.password,
      database: dbConf?.connection?.database ?? 'vendorvault_dev',
      ssl:      dbConf?.connection?.ssl,
    },
    pool: {
      min:                  dbConf?.pool?.min ?? 2,
      max:                  dbConf?.pool?.max ?? 20,
      acquireTimeoutMillis: 30_000,
      idleTimeoutMillis:    600_000,
    },
    debug: process.env.VV_ENVIRONMENT === 'development' && process.env.SQL_DEBUG === 'true',
  });

  try {
    await db.raw('SELECT 1 + 1 AS connection_test');
    logger.info(`Connected to PostgreSQL: ${dbConf?.connection?.database}`);
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL', { error });
    throw error;
  }

  return db;
}

// ── Table Name Registry ───────────────────────────────────────────────────
// All table names as typed constants to prevent typos in query code.

export const TABLES = {
  // Users & Auth
  USERS:              'vv_users',
  USER_ADDRESSES:     'vv_user_addresses',
  USER_SESSIONS:      'vv_user_sessions',
  OAUTH_PROVIDERS:    'vv_oauth_providers',

  // Vendor Management
  VENDORS:            'vv_vendors',
  VENDOR_DOCUMENTS:   'vv_vendor_documents',
  VENDOR_PAYOUTS:     'vv_vendor_payouts',
  VENDOR_REVIEWS:     'vv_vendor_reviews',

  // Product Catalog
  CATEGORIES:         'vv_categories',
  PRODUCTS:           'vv_products',
  PRODUCT_VARIANTS:   'vv_product_variants',
  PRODUCT_IMAGES:     'vv_product_images',
  PRODUCT_REVIEWS:    'vv_product_reviews',
  PRODUCT_TAGS:       'vv_product_tags',
  INVENTORY:          'vv_inventory',
  FLASH_SALES:        'vv_flash_sales',

  // Shopping Cart
  CARTS:              'vv_carts',
  CART_ITEMS:         'vv_cart_items',
  WISHLISTS:          'vv_wishlists',
  WISHLIST_ITEMS:     'vv_wishlist_items',
  COUPONS:            'vv_coupons',
  COUPON_USAGES:      'vv_coupon_usages',

  // Orders & Fulfillment
  ORDERS:             'vv_orders',
  ORDER_ITEMS:        'vv_order_items',
  ORDER_STATUS_LOGS:  'vv_order_status_logs',
  RETURNS:            'vv_returns',
  RETURN_ITEMS:       'vv_return_items',

  // Payments
  PAYMENTS:           'vv_payments',
  PAYMENT_METHODS:    'vv_payment_methods',
  REFUNDS:            'vv_refunds',

  // Shipping
  SHIPMENTS:          'vv_shipments',
  SHIPPING_ZONES:     'vv_shipping_zones',
  SHIPPING_RATES:     'vv_shipping_rates',

  // Notifications & Communications
  NOTIFICATIONS:      'vv_notifications',
  EMAIL_LOGS:         'vv_email_logs',

  // Analytics & Reporting
  ANALYTICS_EVENTS:   'vv_analytics_events',
  SEARCH_LOGS:        'vv_search_logs',

  // System
  AUDIT_LOGS:         'vv_audit_logs',
  MIGRATIONS:         'vv_migrations',
  FEATURE_FLAGS:      'vv_feature_flags',
} as const;

export type TableName = typeof TABLES[keyof typeof TABLES];
