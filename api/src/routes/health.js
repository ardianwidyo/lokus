/** Cloud Run startup and liveness probes hit this; it must never need auth. */
export function healthRoutes(fastify, { config }) {
  fastify.get('/healthz', async () => ({
    status: 'ok',
    environment: config.environment,
    region: config.region,
  }));
}
