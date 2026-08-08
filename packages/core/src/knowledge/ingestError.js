/**
 * The refusal every ingest path shares, in its own module so the upload rules
 * and the store can both raise it without importing each other.
 *
 * The code is the contract: `api/src/server.js` turns any error carrying one
 * into a 422 with that code, and the console maps the code to the sentence a
 * reader sees. A message alone would be a 500 and an apology.
 */
export class IngestError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'IngestError';
    this.code = code;
  }
}
