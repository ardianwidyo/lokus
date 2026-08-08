/**
 * Handing a blob to the browser's own download machinery.
 *
 * An `<a download>` clicked from script is the only route that works in every
 * browser the demo might run in and that survives a blob built in memory — the
 * seeded console has no URL to link to, because the file does not exist until
 * the moment it is asked for (AC-10.7).
 */
export function saveBlob({ blob, filename }, { doc = globalThis.document, urls = globalThis.URL } = {}) {
  // A test environment without object URLs, or a browser old enough to lack
  // them, must fail loudly here. A silent no-op looks exactly like a download
  // the user's browser swallowed, and they would go looking in the wrong place.
  if (typeof urls?.createObjectURL !== 'function') {
    throw new Error('Browser ini tidak bisa menyimpan berkas dari konsol.');
  }

  const url = urls.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  // Appended rather than clicked detached: Firefox ignores a click on an
  // element that is not in the document.
  doc.body.append(link);
  link.click();
  link.remove();

  // Revoked on the next tick, not immediately: Safari cancels a download whose
  // object URL is released in the same task that started it.
  setTimeout(() => urls.revokeObjectURL(url), 0);
}
