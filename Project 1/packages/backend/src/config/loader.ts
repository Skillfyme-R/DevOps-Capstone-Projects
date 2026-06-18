/**
 * NexusFinance Config Loader
 *
 * Reads YAML configuration files and environment variables, then merges them.
 * Load order (each one overrides the previous):
 *   1. app-config.yaml           (base defaults)
 *   2. app-config.<env>.yaml     (environment-specific overrides)
 *   3. app-config.local.yaml     (developer-local overrides, never committed)
 *
 * All ${VAR} placeholders in YAML are replaced with process.env values.
 */

import fs   from 'fs';
import path from 'path';
import yaml from 'yaml';

// TypeScript interface — defines the shape of our entire config object.
// This gives you autocomplete when using config throughout the codebase.
export interface NexusConfig {
  app?: {
    title?:   string;
    baseUrl?: string;
  };
  organization?: {
    name?: string;
  };
  backend?: {
    baseUrl?: string;
    listen?: {
      port?: number;
      host?: string;
    };
    cors?: {
      origin?: string;
    };
    database?: {
      client?: string;
      connection?: {
        host?:     string;
        port?:     number;
        user?:     string;
        password?: string;
        database?: string;
        ssl?:      boolean | { rejectUnauthorized: boolean };
      };
      pool?: { min?: number; max?: number };
    };
    cache?: {
      store?:      string;
      connection?: string;
    };
  };
  auth?: {
    environment?: string;
    session?:     { secret?: string };
    providers?:   Record<string, any>;
  };
  payments?: {
    stripe?: { publicKey?: string; secretKey?: string; webhookSecret?: string };
    plaid?:  { clientId?: string; secret?: string; environment?: string };
    wise?:   { apiKey?: string; environment?: string };
  };
  nexusfinance?: {
    platform?: {
      name?:        string;
      version?:     string;
      environment?: string;
    };
    banking?: {
      supportedCurrencies?: string[];
      defaultCurrency?:     string;
      transactionLimits?: {
        singleTransfer?: number;
        dailyTotal?:     number;
        weeklyTotal?:    number;
        monthlyTotal?:   number;
      };
      kycRequired?:   boolean;
      amlEnabled?:    boolean;
      fraudScoring?:  boolean;
    };
    loans?: {
      maxLoanAmount?:    number;
      minLoanAmount?:    number;
      maxTermMonths?:    number;
      baseInterestRate?: number;
    };
    notifications?: {
      emailProvider?: string;
      smsProvider?:   string;
      fromEmail?:     string;
    };
  };
  integrations?: {
    sendgrid?: { apiKey?: string };
    twilio?:   { accountSid?: string; authToken?: string };
    datadog?:  { apiKey?: string; appKey?: string };
    sentry?:   { dsn?: string };
  };
  aws?: {
    region?:    string;
    accountId?: string;
    s3?: { documentsBucket?: string; backupsBucket?: string };
  };
}

// Replace ${ENV_VAR} in strings with actual environment variable values
function interpolateEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, varName: string) => {
    return process.env[varName] ?? '';
  });
}

// Walk the entire config object and interpolate all string values
function deepInterpolate(obj: unknown): unknown {
  if (typeof obj === 'string')  return interpolateEnvVars(obj);
  if (Array.isArray(obj))       return obj.map(deepInterpolate);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, deepInterpolate(v)])
    );
  }
  return obj;
}

// Deep merge two objects (source values override target values)
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const [key, sourceVal] of Object.entries(source)) {
    const targetVal = target[key];
    if (
      targetVal !== null &&
      sourceVal !== null &&
      typeof targetVal === 'object' &&
      typeof sourceVal === 'object' &&
      !Array.isArray(targetVal) &&
      !Array.isArray(sourceVal)
    ) {
      // Both are plain objects — recursively merge
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      );
    } else {
      // Primitive or array — source wins
      result[key] = sourceVal;
    }
  }
  return result;
}

function loadYamlFile(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.parse(content) as Record<string, unknown> ?? {};
}

export async function loadConfig(): Promise<NexusConfig> {
  // Walk up directory tree to find the project root (where app-config.yaml lives)
  const projectRoot = findProjectRoot();
  const env = process.env.NEXUS_ENVIRONMENT ?? 'development';

  const configFiles = [
    path.join(projectRoot, 'app-config.yaml'),           // Base config
    path.join(projectRoot, `app-config.${env}.yaml`),    // Environment override
    path.join(projectRoot, 'app-config.local.yaml'),     // Local developer override
  ];

  let merged: Record<string, unknown> = {};
  for (const filePath of configFiles) {
    const parsed = loadYamlFile(filePath);
    merged = deepMerge(merged, parsed);
  }

  // Replace all ${ENV_VAR} placeholders with real environment variable values
  const interpolated = deepInterpolate(merged) as NexusConfig;
  return interpolated;
}

function findProjectRoot(): string {
  // Walk up from current directory until we find package.json with "nexusfinance"
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name === 'nexusfinance-platform') return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // Reached filesystem root
    dir = parent;
  }
  return process.cwd();
}
