import { readFile } from 'node:fs/promises';

import { loadConfig } from './config.js';
import { buildServer } from './server.js';

const config = loadConfig();

// The Admin screen shows the gates the eval runner last produced. Missing file
// means no gates shown, never invented ones.
const evaluationReport = await readFile(new URL('../../eval/report.sample.json', import.meta.url), 'utf8')
  .then(JSON.parse)
  .catch(() => undefined);

const fastify = buildServer({ config, evaluationReport });

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
