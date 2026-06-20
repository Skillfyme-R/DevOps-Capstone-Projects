import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Vendors
  await knex.schema.createTable('vv_vendors', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('vv_users').onDelete('CASCADE');
    t.string('store_name', 150).notNullable();
    t.text('description').nullable();
    t.string('logo_url', 500).nullable();
    t.string('banner_url', 500).nullable();
    t.string('contact_email', 255).nullable();
    t.string('contact_phone', 20).nullable();
    t.string('website_url', 500).nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.boolean('is_verified').notNullable().defaultTo(false);
    t.decimal('commission_rate', 5, 4).notNullable().defaultTo(0.12);
    t.integer('payout_delay_days').notNullable().defaultTo(7);
    t.decimal('avg_rating', 3, 2).nullable();
    t.integer('review_count').notNullable().defaultTo(0);
    t.bigInteger('total_sales').notNullable().defaultTo(0);
    t.string('stripe_account_id', 100).nullable();
    t.timestamps(true, true);

    t.index('user_id');
    t.index('is_active');
    t.index('avg_rating');
  });

  // Vendor KYC / documents
  await knex.schema.createTable('vv_vendor_documents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('vendor_id').notNullable().references('id').inTable('vv_vendors').onDelete('CASCADE');
    t.enum('doc_type', ['id_proof', 'business_license', 'tax_certificate', 'bank_statement']).notNullable();
    t.string('file_url', 500).notNullable();
    t.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    t.timestamps(true, true);
  });

  // Vendor reviews (by customers)
  await knex.schema.createTable('vv_vendor_reviews', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('vendor_id').notNullable().references('id').inTable('vv_vendors').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('vv_users').onDelete('CASCADE');
    t.integer('rating').notNullable().checkBetween([1, 5]);
    t.text('comment').nullable();
    t.timestamps(true, true);
  });

  // Categories (hierarchical)
  await knex.schema.createTable('vv_categories', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('parent_id').nullable().references('id').inTable('vv_categories');
    t.string('name', 100).notNullable();
    t.string('slug', 100).notNullable().unique();
    t.text('description').nullable();
    t.string('image_url', 500).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // Products
  await knex.schema.createTable('vv_products', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('vendor_id').notNullable().references('id').inTable('vv_vendors').onDelete('CASCADE');
    t.uuid('category_id').notNullable().references('id').inTable('vv_categories');
    t.string('name', 200).notNullable();
    t.text('description').nullable();
    t.string('sku', 100).notNullable().unique();
    t.decimal('price', 12, 2).notNullable();
    t.decimal('compare_price', 12, 2).nullable();
    t.integer('stock').notNullable().defaultTo(0);
    t.decimal('weight', 8, 3).nullable();
    t.jsonb('tags').defaultTo('[]');
    t.jsonb('attributes').defaultTo('{}');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.boolean('is_featured').notNullable().defaultTo(false);
    t.decimal('avg_rating', 3, 2).nullable();
    t.integer('review_count').notNullable().defaultTo(0);
    t.bigInteger('sales_count').notNullable().defaultTo(0);
    t.timestamps(true, true);

    t.index('vendor_id');
    t.index('category_id');
    t.index('is_active');
    t.index('is_featured');
    t.index('price');
    t.index('avg_rating');
  });

  // Product variants (size, color)
  await knex.schema.createTable('vv_product_variants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('product_id').notNullable().references('id').inTable('vv_products').onDelete('CASCADE');
    t.string('name', 100).notNullable();
    t.string('value', 100).notNullable();
    t.decimal('price_modifier', 10, 2).notNullable().defaultTo(0);
    t.integer('stock').notNullable().defaultTo(0);
    t.string('sku', 100).nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // Product images
  await knex.schema.createTable('vv_product_images', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('product_id').notNullable().references('id').inTable('vv_products').onDelete('CASCADE');
    t.string('url', 500).notNullable();
    t.string('alt_text', 200).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_primary').notNullable().defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Product reviews
  await knex.schema.createTable('vv_product_reviews', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('product_id').notNullable().references('id').inTable('vv_products').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('vv_users').onDelete('CASCADE');
    t.uuid('order_id').nullable(); // FK to vv_orders added in migration 003
    t.integer('rating').notNullable().checkBetween([1, 5]);
    t.string('title', 200).nullable();
    t.text('comment').nullable();
    t.boolean('verified_purchase').notNullable().defaultTo(false);
    t.boolean('is_published').notNullable().defaultTo(true);
    t.timestamps(true, true);

    t.unique(['product_id', 'user_id']);
  });

  // Flash sales
  await knex.schema.createTable('vv_flash_sales', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('product_id').notNullable().references('id').inTable('vv_products').onDelete('CASCADE');
    t.decimal('sale_price', 12, 2).notNullable();
    t.integer('quantity_limit').nullable();
    t.integer('quantity_sold').notNullable().defaultTo(0);
    t.timestamp('starts_at').notNullable();
    t.timestamp('ends_at').notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'vv_flash_sales', 'vv_product_reviews', 'vv_product_images',
    'vv_product_variants', 'vv_products', 'vv_categories',
    'vv_vendor_reviews', 'vv_vendor_documents', 'vv_vendors',
  ];
  for (const t of tables) await knex.schema.dropTableIfExists(t);
}
