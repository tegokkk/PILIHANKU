import { readEnv } from './config/env.js';
import { startServer } from './operations/lifecycle.js';
try {
  const env = readEnv(),
    running = await startServer(env);
  console.log(JSON.stringify({ event: 'server_started', port: env.port }));
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.once(signal, () => {
      running
        .stop()
        .then(() => process.exit(0))
        .catch(() => {
          console.error('shutdown_failed');
          process.exit(1);
        });
    });
} catch (e) {
  console.error(
    JSON.stringify({
      event: 'startup_failed',
      code: e.code === 'MIGRATION_REQUIRED' ? 'MIGRATION_REQUIRED' : 'STARTUP_FAILED',
      message:
        e.code === 'MIGRATION_REQUIRED'
          ? 'Run npm run migrate before starting the server.'
          : 'Check database, environment and production prerequisites.',
    })
  );
  process.exitCode = 1;
}
