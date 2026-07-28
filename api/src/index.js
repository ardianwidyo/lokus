import { loadConfig } from './config.js';
import { buildServer } from './server.js';

const config = loadConfig();
const fastify = buildServer({ config });

try {
  await fastify.listen({ port: config.port, host: config.host });
} catch (error) {
  fastify.log.error(error, 'failed to start');
  process.exit(1);
}

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, async () => {
    await fastify.close();
    process.exit(0);
  });
}
