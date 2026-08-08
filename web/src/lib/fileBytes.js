/**
 * Reading a chosen file in the tab.
 *
 * `File.arrayBuffer()` and `File.text()` would be shorter, and they are what
 * this used to call. `FileReader` is used instead because it is the one API
 * present everywhere the console has to run: every target browser, Safari
 * included, and jsdom — where the newer methods do not exist at all, so an
 * upload could be built but never tested. One path in every environment beats
 * a shorter path plus a fallback nobody exercises.
 */

function read(file, as) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(reader.error ?? new Error(`Berkas ${file?.name ?? ''} gagal dibaca`));
    reader[as](file);
  });
}

/** The bytes, unchanged — what gets stored and handed back (AC-10.11). */
export async function fileBytes(file) {
  return new Uint8Array(await read(file, 'readAsArrayBuffer'));
}

/** The text, for a file the console may show before it is indexed. */
export function fileText(file) {
  return read(file, 'readAsText');
}
