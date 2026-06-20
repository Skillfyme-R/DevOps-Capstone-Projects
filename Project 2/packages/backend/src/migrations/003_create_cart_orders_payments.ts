import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Coupons
  await knex.schema.createTable('vv_coupons', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('code', 50).notNullable().unique();
    t.enum('discount_type', ['percentage', 'fixed_amount', 'free_shipping']).notNullable();
    t.decimal('discount_value', 10, 2).notNullable();
    t.decimal('minimum_order_amount', 10, 2).nullable();
    t.integer('usage_limit').nullable();
    t.integer('used_count').notNullable().defaultTo(0);
    t.timestamp('expires_at').nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // Shopping carts
  await knex.schema.createTable('vv_carts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('vv_users').onDelete('CASCADE');
    t.uuid('coupon_id').nullable().references('id').inTable('vv_coupons');
    t.enum('status', ['active', 'checked_out', 'abandoned']).notNullable().defaultTo('active');
    t.timestamps(true, true);

    t.index(['user_id', 'status']);
  });

  // Cart items
  await knex.schema.createTable('vv_cart_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('cart_id').notNullable().references('id').inTable('vv_carts').onDelete('CASCADE');
    t.uuid('product_id').notNullable().references('id').inTable('vv_products').onDelete('CASCADE');
    t.uuid('variant_id').nullable().references('id').inTable('vv_product_variants');
    t.integer('quantity').notNullable().defaultTo(1);
    t.decimal('unit_price', 12, 2).notNullable();
    t.timestamps(true, true);

    t.unique(['cart_id', 'product_id', 'variant_id']);
  });

  // Wishlists
  await knex.schema.createTable('vv_wishlists', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('vv_users').onDelete('CASCADE').unique();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('vv_wishlist_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('vv_users').onDelete('CASCADE');
    t.uuid('product_id').notNullable().references('id').inTable('vv_products').onDelete('CASCADE');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.unique(['user_id', 'product_id']);
  });

  // Payment methods (saved cards)
  await knex.schema.createTable('vv_payment_methods', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('vv_users').onDelete('CASCADE');
    t.enum('type', ['card', 'paypal', 'bank_account']).notNullable();
    t.string('stripe_payment_method_id', 100).nullable();
    t.string('last4', 4).nullable();
    t.string('brand', 20).nullable();
    t.integer('exp_month').nullable();
    t.integer('exp_year').nullable();
    t.boolean('is_default').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });

  // Orders
  await knex.schema.createTable('vv_orders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('vv_users').onDelete('RESTRICT');
    t.enum('status', ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']).notNullable().defaultTo('pending');
    t.decimal('subtotal', 12, 2).notNullable();
    t.decimal('tax_amount', 12, 2).notNullable().defaultTo(0);
    t.decimal('shipping_fee', 12, 2).notNullable().defaultTo(0);
    t.decimal('discount_amount', 12, 2).notNullable().defaultTo(0);
    t.decimal('total_amount', 12, 2).notNullable();
    t.uuid('coupon_id').nullable().references('id').inTable('vv_coupons');
    t.uuid('payment_method_id').nullable().references('id').inTable('vv_payment_methods');
    t.string('stripe_payment_intent_id', 100).nullable();
    t.jsonb('shipping_address').nullable();
    t.text('notes').nullable();
    t.timestamp('paid_at').nullable();
    t.timestamp('confirmed_at').nullable();
    t.timestamp('shipped_at').nullable();
    t.timestamp('delivered_at').nullable();
    t.timestamps(true, true);

    t.index('user_id');
    t.index('status');
    t.index('created_at');
  });

  // Order items (per vendor split)
  await knex.schema.createTable('vv_order_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('order_id').notNullable().references('id').inTable('vv_orders').onDelete('CASCADE');
    t.uuid('product_id').notNullable().references('id').inTable('vv_products').onDelete('RESTRICT');
    t.uuid('vendor_id').notNullable().references('id').inTable('vv_vendors').onDelete('RESTRICT');
    t.uuid('variant_id').nullable().references('id').inTable('vv_product_variants');
    t.integer('quantity').notNullable();
    t.decimal('unit_price', 12, 2).notNullable();
    t.decimal('total', 12, 2).notNullable();
    t.enum('fulfillment_status', ['pending', 'confirmed', 'shipped', 'delivered', 'returned']).defaultTo('pending');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index('order_id');
    t.index('vendor_id');
    t.index('product_id');
  });

  // Order status logs
  await knex.schema.createTable('vv_order_status_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('order_id').notNullable().references('id').inTable('vv_orders').onDelete('CASCADE');
    t.string('status', 50).notNullable();
    t.text('note').nullable();
    t.uuid('actor_id').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // Payments
  await knex.schema.createTable('vv_payments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('order_id').notNullable().references('id').inTable('vv_orders').onDelete('RESTRICT');
    t.uuid('user_id').notNullable().references('id').inTable('vv_users').onDelete('RESTRICT');
    t.decimal('amount', 12, 2).notNullable();
    t.string('currency', 3).notNullable().defaultTo('USD');
    t.enum('status', ['pending', 'succeeded', 'failed', 'refunded']).defaultTo('pending');
    t.string('provider', 20).notNullable().defaultTo('stripe');
    t.string('provider_payment_id', 200).nullable();
    t.timestamps(true, true);
  });

  // Refunds
  await knex.schema.createTable('vv_refunds', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('payment_id').notNullable().references('id').inTable('vv_payments').onDelete('RESTRICT');
    t.decimal('amount', 12, 2).notNullable();
    t.string('reason', 500).nullable();
    t.enum('status', ['pending', 'processed', 'failed']).defaultTo('pending');
    t.string('provider_refund_id', 200).nullable();
    t.timestamps(true, true);
  });

  // Vendor payouts
  await knex.schema.createTable('vv_vendor_payouts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('vendor_id').notNullable().references('id').inTable('vv_vendors').onDelete('RESTRICT');
    t.decimal('amount', 12, 2).notNullable();
    t.string('currency', 3).notNullable().defaultTo('USD');
    t.enum('status', ['scheduled', 'processing', 'completed', 'failed']).defaultTo('scheduled');
    t.string('stripe_transfer_id', 200).nullable();
    t.timestamp('scheduled_for').nullable();
    t.timestamp('paid_at').nullable();
    t.timestamps(true, true);
  });

  // Shipments
  await knex.schema.createTable('vv_shipments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('order_id').notNullable().references('id').inTable('vv_orders').onDelete('CASCADE');
    t.string('tracking_number', 200).nullable();
    t.string('carrier', 50).nullable();
    t.enum('status', ['pending', 'in_transit', 'out_for_delivery', 'delivered', 'failed']).defaultTo('pending');
    t.jsonb('tracking_events').defaultTo('[]');
    t.timestamp('shipped_at').nullable();
    t.timestamp('delivered_at').nullable();
    t.timestamp('estimated_delivery').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // Returns
  await knex.schema.createTable('vv_returns', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('order_id').notNullable().references('id').inTable('vv_orders').onDelete('RESTRICT');
    t.uuid('user_id').notNullable().references('id').inTable('vv_users').onDelete('RESTRICT');
    t.string('reason', 500).notNullable();
    t.enum('status', ['requested', 'approved', 'received', 'refunded', 'rejected']).defaultTo('requested');
    t.timestamps(true, true);
  });

  // Notifications
  await knex.schema.createTable('vv_notifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('vv_users').onDelete('CASCADE');
    t.string('type', 100).notNullable();
    t.string('title', 200).notNullable();
    t.text('body').nullable();
    t.jsonb('data').nullable();
    t.boolean('is_read').notNullable().defaultTo(false);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'vv_notifications', 'vv_returns', 'vv_shipments', 'vv_vendor_payouts',
    'vv_refunds', 'vv_payments', 'vv_order_status_logs', 'vv_order_items',
    'vv_orders', 'vv_payment_methods', 'vv_wishlist_items', 'vv_wishlists',
    'vv_cart_items', 'vv_carts', 'vv_coupons',
  ];
  for (const t of tables) await knex.schema.dropTableIfExists(t);
}
