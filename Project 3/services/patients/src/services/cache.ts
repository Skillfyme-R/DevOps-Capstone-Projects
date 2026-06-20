import Redis from 'ioredis';
import { AppConfig } from '../config/loader';
import { logger } from '../utils/logger';

let cache: Redis;

export async function initCache(config: AppConfig): Promise<Redis> {
  cache = new Redis(config.cache.url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: true,
  });

  await cache.connect();
  logger.info('Redis cache connected');
  return cache;
}

export function getCache(): Redis {
  if (!cache) throw new Error('Cache not initialised');
  return cache;
}

export const CACHE_KEYS = {
  session: (userId: string) => `mc:session:${userId}`,
  revokedToken: (suffix: string) => `mc:token:revoked:${suffix}`,
  loginAttempts: (email: string) => `mc:login:attempts:${email}`,
  mfaPending: (userId: string) => `mc:mfa:pending:${userId}`,
};

export const CACHE_TTL = {
  session: 60 * 60 * 24 * 7,
  revokedToken: 60 * 60 * 24,
  loginAttempts: 60 * 30,
  mfaPending: 60 * 5,
};
