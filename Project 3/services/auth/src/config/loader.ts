import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

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
    return obj.replace(/\$\{([^}]+)\}/g, (_, key) => process.env[key] ?? '');
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
  return resolveEnvVars(parsed) as AppConfig;
}
