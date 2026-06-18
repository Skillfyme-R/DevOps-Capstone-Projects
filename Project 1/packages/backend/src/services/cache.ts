/**
 * NexusFinance Cache Service (Redis)
 *
 * Redis is an in-memory key-value store we use for:
 *   1. Session storage (user is logged in)
 *   2. Rate limiting (user has made X requests)
 *   3. Caching expensive DB queries (account balance = $5,432.00, valid for 30s)
 *   4. Real-time fraud scores
 *   5. Exchange rate caching (don't call external API on every request)
 *
 * Why Redis vs PostgreSQL for these?
 *   - Redis reads in microseconds, DB reads in milliseconds
 *   - Redis has built-in TTL (expiry) — data auto-deletes
 *   - Redis handles 1M+ ops/second easily
 */

import { createClient, RedisClientType } from 'redis';
import { NexusConfig } from '../config/loader';
import { createLogger } from '../utils/logger';

const logger = createLogger('nexus-cache');

export type Cache = RedisClientType;

export async function createCache(config: NexusConfig): Promise<Cache> {
  const redisUrl = config.backend?.cache?.connection ?? 'redis://localhost:6379';

  const client = createClient({
    url: redisUrl,
    socket: {
      // Exponential backoff reconnection: 50ms, 100ms, 200ms... up to 2 seconds
      reconnectStrategy: (retries: number) => Math.min(retries * 50, 2_000),
      connectTimeout: 5_000,
    },
  }) as Cache;

  client.on('error',      (err) => logger.error('Redis connection error', { err }));
  client.on('connect',    ()    => logger.info('✓ Connecting to Redis...'));
  client.on('ready',      ()    => logger.info('✓ Redis ready'));
  client.on('reconnecting', ()  => logger.warn('Redis reconnecting...'));
  client.on('end',        ()    => logger.warn('Redis connection closed'));

  await client.connect();
  return client;
}

// ── Cache Key Builders ──────────────────────────────────────────────────────
// Functions that generate consistent Redis keys.
// Using functions prevents key collisions like two features using "user:123".

export const CACHE_KEYS = {
  // Session: user:session:{userId}
  userSession:    (userId: string)    => `nexus:session:${userId}`,

  // Account balance (refreshed every 30s from DB)
  accountBalance: (accountId: string) => `nexus:balance:${accountId}`,

  // All accounts for a user (refreshed every 30s)
  userAccounts:   (userId: string)    => `nexus:accounts:user:${userId}`,

  // Exchange rates (refreshed every 5 minutes)
  exchangeRates:  ()                  => 'nexus:exchange-rates:current',

  // Fraud risk score per user (0-100, higher = riskier)
  fraudScore:     (userId: string)    => `nexus:fraud:score:${userId}`,

  // Rate limiting: how many requests from this IP in the last minute
  rateLimitIp:    (ip: string)        => `nexus:rate:ip:${ip}`,
  rateLimitUser:  (userId: string)    => `nexus:rate:user:${userId}`,

  // Analytics cache (expensive aggregation queries)
  analyticsData:  (key: string)       => `nexus:analytics:${key}`,

  // Loan pre-approval offers (valid for 24 hours)
  loanOffers:     (userId: string)    => `nexus:loan-offers:${userId}`,

  // OTP codes for 2FA
  otpCode:        (userId: string)    => `nexus:otp:${userId}`,
} as const;

// ── Cache TTL Constants ────────────────────────────────────────────────────
// How long each type of cached data stays valid (in seconds)

export const CACHE_TTL = {
  SESSION:        3_600,    //  1 hour     — user login session
  ACCOUNT_BALANCE:   30,    // 30 seconds  — balance can change any moment
  USER_ACCOUNTS:     60,    //  1 minute   — account list
  EXCHANGE_RATES:   300,    //  5 minutes  — FX rates change slowly
  FRAUD_SCORE:      600,    // 10 minutes  — risk score
  ANALYTICS:        900,    // 15 minutes  — dashboard aggregations
  LOAN_OFFERS:   86_400,    // 24 hours    — pre-approved offers
  OTP_CODE:         300,    //  5 minutes  — 2FA codes expire quickly
} as const;
