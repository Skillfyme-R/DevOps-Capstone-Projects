import fs   from 'fs';
import path from 'path';
import yaml from 'yaml';

export interface VVConfig {
  app?: { title?: string; baseUrl?: string };
  organization?: { name?: string };
  backend?: {
    baseUrl?: string;
    listen?: { port?: number; host?: string };
    cors?: { origin?: string };
    database?: {
      client?: string;
      connection?: {
        host?: string; port?: number; user?: string; password?: string;
        database?: string; ssl?: boolean | { rejectUnauthorized: boolean };
      };
      pool?: { min?: number; max?: number };
    };
    cache?: { store?: string; connection?: string };
  };
  auth?: {
    environment?: string;
    session?: { secret?: string };
    providers?: Record<string, unknown>;
  };
  payments?: {
    stripe?: { publicKey?: string; secretKey?: string; webhookSecret?: string; connectEnabled?: boolean };
    paypal?: { clientId?: string; clientSecret?: string; environment?: string };
    razorpay?: { keyId?: string; keySecret?: string };
  };
  vendorvault?: {
    platform?: { name?: string; version?: string; environment?: string };
    marketplace?: {
      commissionRate?: number;
      vendorPayoutDelay?: number;
      maxProductImages?: number;
      supportedCurrencies?: string[];
      defaultCurrency?: string;
      taxCalculation?: boolean;
      multiVendorCart?: boolean;
      flashSaleEnabled?: boolean;
    };
    catalog?: {
      maxCategoriesDepth?: number;
      searchProvider?: string;
      recommendationEngine?: boolean;
      inventoryTracking?: boolean;
      lowStockThreshold?: number;
    };
    orders?: {
      maxItemsPerOrder?: number;
      returnWindowDays?: number;
      autoConfirmDays?: number;
    };
    shipping?: {
      providers?: string[];
      trackingEnabled?: boolean;
      internationalEnabled?: boolean;
    };
    notifications?: {
      emailProvider?: string;
      smsProvider?: string;
      pushEnabled?: boolean;
      fromEmail?: string;
    };
  };
  integrations?: {
    sendgrid?: { apiKey?: string };
    twilio?: { accountSid?: string; authToken?: string };
    elasticsearch?: { url?: string; apiKey?: string; index?: string };
    datadog?: { apiKey?: string; appKey?: string };
    sentry?: { dsn?: string };
    cloudinary?: { cloudName?: string; apiKey?: string; apiSecret?: string };
  };
  aws?: {
    region?: string;
    accountId?: string;
    s3?: { productImagesBucket?: string; backupsBucket?: string; exportsBucket?: string };
    eks?: { clusterName?: string };
    rds?: { instanceId?: string };
  };
}

function interpolateEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, varName: string) => process.env[varName] ?? '');
}

function deepInterpolate(obj: unknown): unknown {
  if (typeof obj === 'string') return interpolateEnvVars(obj);
  if (Array.isArray(obj))      return obj.map(deepInterpolate);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, deepInterpolate(v)])
    );
  }
  return obj;
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const [key, sourceVal] of Object.entries(source)) {
    const targetVal = target[key];
    if (targetVal !== null && sourceVal !== null &&
        typeof targetVal === 'object' && typeof sourceVal === 'object' &&
        !Array.isArray(targetVal) && !Array.isArray(sourceVal)) {
      result[key] = deepMerge(targetVal as Record<string, unknown>, sourceVal as Record<string, unknown>);
    } else {
      result[key] = sourceVal;
    }
  }
  return result;
}

function loadYamlFile(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  return yaml.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown> ?? {};
}

function findProjectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name === 'vendorvault-platform') return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

export async function loadConfig(): Promise<VVConfig> {
  const root = findProjectRoot();
  const env  = process.env.VV_ENVIRONMENT ?? 'development';

  const files = [
    path.join(root, 'app-config.yaml'),
    path.join(root, `app-config.${env}.yaml`),
    path.join(root, 'app-config.local.yaml'),
  ];

  let merged: Record<string, unknown> = {};
  for (const f of files) merged = deepMerge(merged, loadYamlFile(f));

  return deepInterpolate(merged) as VVConfig;
}
