/**
 * Every agent tool returns the same envelope (plan.md, "Agent contracts"):
 *
 *   { data, sources[], latencyMs }
 *
 * `sources` is not decoration. The supervisor refuses to emit a claim whose
 * sources array is empty, so a tool that cannot cite anything must say so by
 * returning an empty array rather than omitting the field.
 */
export function toolResult({ data, sources = [], startedAt = Date.now() }) {
  return {
    data,
    sources,
    latencyMs: Math.max(0, Date.now() - startedAt),
  };
}

/** True when a result can legitimately back a user-visible claim. */
export function isGrounded(result) {
  return Array.isArray(result?.sources) && result.sources.length > 0;
}
