// Datadog APM tracer — must be imported BEFORE any other module in index.ts
// It monkey-patches Node.js internals to collect traces automatically.

if (process.env.DATADOG_API_KEY) {
  const tracer = require('dd-trace');
  tracer.init({
    service:     'vendorvault-backend',
    env:         process.env.VV_ENVIRONMENT ?? 'development',
    version:     process.env.npm_package_version ?? '1.0.0',
    logInjection: true,   // Automatically injects trace IDs into Winston logs
    runtimeMetrics: true, // Collects Node.js runtime metrics (memory, CPU, GC)
  });
}
