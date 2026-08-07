/** Cloud Run startup and liveness probes hit this; it must never need auth. */
export function healthRoutes(fastify, { config, snapshot = () => ({}) }) {
  fastify.get('/healthz', async () => {
    // Read per request, not once at registration. The reasoning path can be
    // changed from screen 14 while the process runs, and the first version of
    // this route captured the boot value and then reported it forever.
    const { reasoning = 'deterministic', model = null } = snapshot();

    return {
      status: 'ok',
      environment: config.environment,
      region: config.region,
      // Which path answers a question: a model path means Gemini is called for
      // real, `deterministic` means passages are assembled. Before this,
      // telling them apart meant asking a question and burning tokens to read
      // the answer's metadata — an expensive way to check a boolean, and one
      // nobody runs before a demo.
      //
      // Deliberately not the project id, the location, the key, or a prefix of
      // it: this endpoint is unauthenticated by design, and "which mode am I
      // in" is the operational question. Which project pays is answered by
      // Cloud Monitoring, where the tokens actually land.
      reasoning,
      // The pinned model, so a run recorded against an older pin is not
      // mistaken for this one. Null on the deterministic path, because naming
      // a model there would imply one was called.
      model,
    };
  });
}
