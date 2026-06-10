/**
 * Shared utility helpers for YuzukiMD-Lite
 */

/**
 * Fetch a URL and return its body as a Node.js Buffer.
 * Used by image-based games (tebakgambar, tebakepep, etc.)
 *
 * @param {string} url
 * @param {object} [opts]  - extra fetch options (headers, signal, …)
 * @returns {Promise<Buffer>}
 */
export async function fetchBuffer(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": "YuzukiMD-Lite/1.0" },
    ...opts,
  });
  if (!res.ok) throw new Error(`fetchBuffer: ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
