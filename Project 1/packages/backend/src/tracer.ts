/**
 * Datadog APM Tracer
 *
 * This file MUST be imported first in index.ts (before any other imports).
 * It instruments the Node.js runtime to automatically trace:
 *   - Every Express HTTP request
 *   - Every PostgreSQL query (shows slow queries in Datadog)
 *   - Every Redis command
 *   - External HTTP calls (Stripe, Plaid, etc.)
 *
 * In production, you see in Datadog:
 *   POST /api/v1/payments → DB query (10ms) → Redis write (2ms) → Stripe API (120ms)
 */
import tracer from 'dd-trace';

tracer.init({
  service:     'nexusfinance-backend',
  env:         process.env.NEXUS_ENVIRONMENT ?? 'development',
  version:     process.env.npm_package_version ?? '1.0.0',
  logInjection: true,        // Correlates logs with traces (you see logs IN the trace)
  runtimeMetrics: true,      // Track Node.js heap, GC, event loop lag
  profiling:   process.env.NEXUS_ENVIRONMENT === 'production', // CPU/memory profiling in prod only
  plugins: {
    // These are auto-instrumented — you get traces for free, no code changes needed
    express:    { enabled: true },
    pg:         { enabled: true, service: 'nexusfinance-postgres' },
    redis:      { enabled: true, service: 'nexusfinance-redis' },
    http:       { enabled: true },        // Tracks outbound HTTP (Stripe, Plaid calls)
    knex:       { enabled: true },
  },
});

export default tracer;
