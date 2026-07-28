/**
 * API errors carry a stable machine code. The UI maps the code to the
 * Indonesian copy in design/UI-GUIDELINES.md; the API never ships user-facing
 * prose, and never leaks why a token failed beyond the code.
 */

export class HttpError extends Error {
  constructor(statusCode, code, message, details) {
    super(message ?? code);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, details: this.details } };
  }
}

export const ERROR_CODES = Object.freeze({
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TENANT_CLAIM_MISSING: 'AUTH_TENANT_CLAIM_MISSING',
  TENANT_REQUIRED: 'TENANT_REQUIRED',
  TENANT_FORBIDDEN: 'TENANT_FORBIDDEN',
  ROLE_FORBIDDEN: 'ROLE_FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
});

export const unauthorized = (code, message) => new HttpError(401, code, message);
export const forbidden = (code, message) => new HttpError(403, code, message);
export const badRequest = (code, message) => new HttpError(400, code, message);
export const notFound = (message) => new HttpError(404, ERROR_CODES.NOT_FOUND, message);
