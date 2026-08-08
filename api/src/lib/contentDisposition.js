/**
 * `Content-Disposition` for a download whose name is tenant data.
 *
 * Document titles are typed by people: they contain spaces, quotes, "·", and
 * Indonesian words no `token68` grammar accepts. Two forms are sent, per RFC
 * 6266: a flattened ASCII `filename` every client understands, and the exact
 * name in `filename*` (RFC 5987) for every client since IE8.
 *
 * The flattening is a security control as much as a compatibility one. A
 * filename reaching a response header is attacker-adjacent input — anything
 * below 0x20 includes CR and LF, and a header value containing those is a
 * response-splitting vector. Stripping the whole non-printable range costs
 * nothing and removes the class.
 */
export function attachmentDisposition(filename) {
  const name = String(filename ?? '').trim() || 'dokumen.txt';

  const ascii = name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');

  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
