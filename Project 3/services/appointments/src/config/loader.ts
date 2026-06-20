import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export interface AppConfig {
  platform: { name: string; version: string; environment: string };
  cors: { allowedOrigins: string[] };
  services: { auth: { port: number; jwtExpiry: string; refreshTokenExpiry: string; bcryptRounds: number } };
  database: { host: string; port: number; user: string; password: string; name: string; ssl: boolean; pool: { min: number; max: number } };
  cache: { url: string; defaultTtl: number };
  security: { hipaaCompliance: boolean; auditAllAccess: boolean };
  logging: { level: string; format: string };
}

function resolveEnvVars(obj: unknown): unknown {
  if (typeof obj === 'string') {
    const resolved = obj.replace(/\$\{([^}]+)\}/g, (_, key) => process.env[key] ?? '');
    if (resolved === 'true') return true;
    if (resolved === 'false') return false;
    if (resolved !== '' && !isNaN(Number(resolved))) return Number(resolved);
    return resolved;
  }
  if (Array.isArray(obj)) return obj.map(resolveEnvVars);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, resolveEnvVars(v)]));
  }
  return obj;
}

export function loadConfig(): AppConfig {
  const configPath = path.resolve(__dirname, '../../../../app-config.yaml');
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = yaml.parse(raw);
  const resolved = resolveEnvVars(parsed) as Record<string, unknown>;

  if (!resolved.cors && resolved.gateway) {
    resolved.cors = (resolved.gateway as Record<string, unknown>).cors;
  }

  return resolved as unknown as AppConfig;
}
