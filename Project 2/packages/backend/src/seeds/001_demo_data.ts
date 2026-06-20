import { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // Clean in reverse dependency order
  await knex('vv_notifications').del();
  await knex('vv_order_status_logs').del();
  await knex('vv_order_items').del();
  await knex('vv_orders').del();
  await knex('vv_cart_items').del();
  await knex('vv_carts').del();
  await knex('vv_wishlist_items').del();
  await knex('vv_product_images').del();
  await knex('vv_product_variants').del();
  await knex('vv_products').del();
  await knex('vv_categories').del();
  await knex('vv_vendors').del();
  await knex('vv_coupons').del();
  await knex('vv_users').del();

  const pw = await bcrypt.hash('Password123!', 12);

  // ── Users ─────────────────────────────────────────────────────────────────
  const adminId    = uuidv4();
  const vendorId1U = uuidv4();
  const vendorId2U = uuidv4();
  const customerId = uuidv4();

  await knex('vv_users').insert([
    { id: adminId,    name: 'Platform Admin',  email: 'admin@vendorvault.io',         password_hash: pw, role: 'admin',    is_active: true, email_verified: true },
    { id: vendorId1U, name: 'SoundWave Owner', email: 'soundwave@vendorvault.io',      password_hash: pw, role: 'vendor',   is_active: true, email_verified: true },
    { id: vendorId2U, name: 'EcoThreads Owner',email: 'ecothreads@vendorvault.io',     password_hash: pw, role: 'vendor',   is_active: true, email_verified: true },
    { id: customerId, name: 'Alex Johnson',     email: 'customer@vendorvault.io',       password_hash: pw, role: 'customer', is_active: true, email_verified: true },
  ]);

  // ── Vendors ───────────────────────────────────────────────────────────────
  const vendorId1 = uuidv4();
  const vendorId2 = uuidv4();

  await knex('vv_vendors').insert([
    {
      id: vendorId1, user_id: vendorId1U,
      store_name: 'SoundWave Store',
      description: 'Premium audio equipment, headphones, and smart speakers.',
      is_active: true, is_verified: true, avg_rating: 4.9, review_count: 12400, total_sales: 234000,
    },
    {
      id: vendorId2, user_id: vendorId2U,
      store_name: 'EcoThreads',
      description: 'Sustainable fashion for a better planet.',
      is_active: true, is_verified: true, avg_rating: 4.7, review_count: 8760, total_sales: 98000,
    },
  ]);

  // ── Categories ────────────────────────────────────────────────────────────
  const catElec = uuidv4();
  const catFash = uuidv4();
  const catHome = uuidv4();
  const catSprt = uuidv4();

  await knex('vv_categories').insert([
    { id: catElec, name: 'Electronics',  slug: 'electronics',  sort_order: 1, is_active: true },
    { id: catFash, name: 'Fashion',      slug: 'fashion',      sort_order: 2, is_active: true },
    { id: catHome, name: 'Home & Garden',slug: 'home-garden',  sort_order: 3, is_active: true },
    { id: catSprt, name: 'Sports',       slug: 'sports',       sort_order: 4, is_active: true },
  ]);

  // ── Products ──────────────────────────────────────────────────────────────
  const prod1 = uuidv4();
  const prod2 = uuidv4();
  const prod3 = uuidv4();
  const prod4 = uuidv4();

  await knex('vv_products').insert([
    {
      id: prod1, vendor_id: vendorId1, category_id: catElec,
      name: 'Wireless Noise-Cancelling Headphones XR1',
      description: 'Professional-grade ANC with 40-hour battery life and Bluetooth 5.3.',
      sku: 'SW-XR1-BLK', price: 149.99, compare_price: 199.99,
      stock: 87, is_active: true, is_featured: true, avg_rating: 4.8, review_count: 2341,
    },
    {
      id: prod2, vendor_id: vendorId1, category_id: catElec,
      name: 'Smart Speaker Pro 360',
      description: '360° room-filling sound with built-in voice assistant.',
      sku: 'SW-SP360-WHT', price: 120.00, compare_price: null,
      stock: 43, is_active: true, is_featured: false, avg_rating: 4.7, review_count: 980,
    },
    {
      id: prod3, vendor_id: vendorId2, category_id: catFash,
      name: 'Organic Cotton Relaxed-Fit Joggers',
      description: '100% GOTS-certified organic cotton. Available in 8 colors.',
      sku: 'ET-JOG-ORG-M', price: 59.95, compare_price: null,
      stock: 240, is_active: true, is_featured: true, avg_rating: 4.5, review_count: 876,
    },
    {
      id: prod4, vendor_id: vendorId2, category_id: catFash,
      name: 'Recycled Fleece Pullover Hoodie',
      description: 'Made from 100% post-consumer recycled plastic bottles.',
      sku: 'ET-HOOD-REC-L', price: 79.95, compare_price: 99.95,
      stock: 156, is_active: true, is_featured: false, avg_rating: 4.6, review_count: 540,
    },
  ]);

  // ── Coupons ───────────────────────────────────────────────────────────────
  await knex('vv_coupons').insert([
    {
      id: uuidv4(), code: 'SAVE10', discount_type: 'percentage', discount_value: 10,
      minimum_order_amount: 30, usage_limit: 1000, expires_at: '2026-12-31 23:59:59', is_active: true,
    },
    {
      id: uuidv4(), code: 'WELCOME20', discount_type: 'fixed_amount', discount_value: 20,
      minimum_order_amount: 50, usage_limit: 500, expires_at: '2026-12-31 23:59:59', is_active: true,
    },
    {
      id: uuidv4(), code: 'FREESHIP', discount_type: 'free_shipping', discount_value: 0,
      minimum_order_amount: 0, usage_limit: null, expires_at: null, is_active: true,
    },
  ]);

  console.log('✓ VendorVault demo seed data loaded');
  console.log('  Admin:    admin@vendorvault.io    / Password123!');
  console.log('  Vendor 1: soundwave@vendorvault.io / Password123!');
  console.log('  Vendor 2: ecothreads@vendorvault.io / Password123!');
  console.log('  Customer: customer@vendorvault.io / Password123!');
}
