/** Cloud Run startup and liveness probes hit this; it must never need auth. */
export function healthRoutes(fastify, { config, reasoning = 'deterministic', model = null }) {
  fastify.get('/healthz', async () => ({
    status: 'ok',
    environment: config.environment,
    region: config.region,
    // Which path answers a question: `vertex` means Gemini is called for real,
    // `deterministic` means passages are assembled. Before this, telling the
    // two apart meant asking a question and burning tokens to read the answer's
    // metadata — an expensive way to check a boolean, and one nobody runs
    // before a demo.
    //
    // Deliberately not the project id, the location, or anything else that
    // names a billable resource: this endpoint is unauthenticated by design,
    // and "which mode am I in" is the operational question. Which project pays
    // is answered by Cloud Monitoring, where the tokens actually land.
    reasoning,
    // The pinned model, so a run recorded against an older pin is not mistaken
    // for this one. Null on the deterministic path, because naming a model
    // there would imply one was called.
    model,
  }));
}
