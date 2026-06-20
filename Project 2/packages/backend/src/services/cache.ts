import { createClient, RedisClientType } from 'redis';
import { VVConfig } from '../config/loader';
import { createLogger } from '../utils/logger';

const logger = createLogger('vv-cache');

export type Cache = RedisClientType;

export async function createCache(config: VVConfig): Promise<Cache> {
  const redisUrl = config.backend?.cache?.connection ?? 'redis://localhost:6381';

  const client = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries: number) => Math.min(retries * 50, 2_000),
      connectTimeout: 5_000,
    },
  }) as Cache;

  client.on('error',        (err) => logger.error('Redis error', { err }));
  client.on('connect',      ()    => logger.info('Connecting to Redis...'));
  client.on('ready',        ()    => logger.info('Redis ready'));
  client.on('reconnecting', ()    => logger.warn('Redis reconnecting...'));
  client.on('end',          ()    => logger.warn('Redis connection closed'));

  await client.connect();
  return client;
}

// ── Cache Key Builders ─────────────────────────────────────────────────────

export const CACHE_KEYS = {
  userSession:       (userId: string)    => `vv:session:${userId}`,
  userCart:          (userId: string)    => `vv:cart:${userId}`,
  productDetail:     (productId: string) => `vv:product:${productId}`,
  catalogPage:       (page: number, filters: string) => `vv:catalog:${page}:${filters}`,
  vendorProfile:     (vendorId: string)  => `vv:vendor:${vendorId}`,
  vendorProducts:    (vendorId: string)  => `vv:vendor-products:${vendorId}`,
  searchResults:     (query: string)     => `vv:search:${encodeURIComponent(query)}`,
  analyticsOverview: (period: string)    => `vv:analytics:overview:${period}`,
  topProducts:       (limit: number)     => `vv:analytics:top-products:${limit}`,
  inventoryLevel:    (variantId: string) => `vv:inventory:${variantId}`,
  couponDetails:     (code: string)      => `vv:coupon:${code}`,
  flashSales:        ()                  => 'vv:flash-sales:active',
  taxRate:           (country: string, state: string) => `vv:tax:${country}:${state}`,
  shippingRates:     (zone: string)      => `vv:shipping:rates:${zone}`,
  rateLimitIp:       (ip: string)        => `vv:rate:ip:${ip}`,
  rateLimitUser:     (userId: string)    => `vv:rate:user:${userId}`,
  otpCode:           (userId: string)    => `vv:otp:${userId}`,
} as const;

// ── Cache TTL Constants (seconds) ──────────────────────────────────────────

export const CACHE_TTL = {
  SESSION:          3_600,   //  1 hour
  CART:               120,   //  2 minutes (carts change frequently)
  PRODUCT_DETAIL:   3_600,   //  1 hour (product details rarely change)
  CATALOG_PAGE:       300,   //  5 minutes
  VENDOR_PROFILE:   3_600,   //  1 hour
  SEARCH_RESULTS:     120,   //  2 minutes
  ANALYTICS:          900,   // 15 minutes
  INVENTORY:           30,   // 30 seconds (stock can change any moment)
  COUPON:          86_400,   // 24 hours
  FLASH_SALES:        300,   //  5 minutes
  TAX_RATES:      604_800,   //  7 days (tax rates rarely change)
  SHIPPING_RATES: 604_800,   //  7 days
  OTP_CODE:           300,   //  5 minutes
} as const;
