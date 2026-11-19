import dns from 'dns';
import https from 'https';
import net from 'net';

/**
 * Server-side image resolution for PDF export (SSRF defence).
 *
 * The PDF renderer never touches the network: remote profile photos are
 * fetched here first, under strict rules, and inlined as data URLs.
 *  - only https:// on the default port, no credentials in the URL
 *  - every resolved address must be public (no loopback, private, link-local,
 *    CGNAT, multicast, reserved or IPv6 ULA ranges)
 *  - the TCP connection is pinned to the validated address (no DNS rebinding)
 *  - redirects are re-validated hop by hop (max 2)
 *  - Content-Type and magic bytes must be JPEG, PNG or WebP
 *  - size limit and overall timeout
 */

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 2;

export class UnsafeImageError extends Error {}

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function inIpv4Range(ip: string, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split('/');
  const bits = Number(bitsRaw);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

const BLOCKED_IPV4 = [
  '0.0.0.0/8', // "this" network
  '10.0.0.0/8', // private
  '100.64.0.0/10', // carrier-grade NAT
  '127.0.0.0/8', // loopback
  '169.254.0.0/16', // link-local / cloud metadata
  '172.16.0.0/12', // private
  '192.0.0.0/24', // IETF protocol assignments
  '192.0.2.0/24', // documentation
  '192.168.0.0/16', // private
  '198.18.0.0/15', // benchmarking
  '198.51.100.0/24', // documentation
  '203.0.113.0/24', // documentation
  '224.0.0.0/4', // multicast
  '240.0.0.0/4', // reserved + broadcast
];

/** True when the address must never be contacted from the server. */
export function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return BLOCKED_IPV4.some(cidr => inIpv4Range(address, cidr));
  if (family === 6) {
    const lower = address.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedAddress(mapped[1]);
    if (lower === '::' || lower === '::1') return true;
    const firstHextet = parseInt(lower.split(':')[0] || '0', 16);
    if ((firstHextet & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((firstHextet & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((firstHextet & 0xff00) === 0xff00) return true; // ff00::/8 multicast
    if (lower.startsWith('64:ff9b:') || lower.startsWith('2001:db8:')) return true; // NAT64 / documentation
    return false;
  }
  return true; // not an IP at all
}

export function sniffImageType(bytes: Buffer): AllowedImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return 'image/jpeg';
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/** Validate an inline data URL; returns it normalised or null. */
export function validateDataUrl(value: string): string | null {
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  const bytes = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return null;
  const sniffed = sniffImageType(bytes);
  if (!sniffed) return null;
  return `data:${sniffed};base64,${bytes.toString('base64')}`;
}

export function parseSafeImageUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new UnsafeImageError('invalid_url');
  }
  if (url.protocol !== 'https:') throw new UnsafeImageError('https_required');
  if (url.username || url.password) throw new UnsafeImageError('credentials_not_allowed');
  if (url.port && url.port !== '443') throw new UnsafeImageError('port_not_allowed');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && isBlockedAddress(host)) throw new UnsafeImageError('blocked_address');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.internal') ||
    host.endsWith('.local')
  ) {
    throw new UnsafeImageError('blocked_host');
  }
  return url;
}

type Lookup = (hostname: string) => Promise<Array<{ address: string; family: number }>>;

const defaultLookup: Lookup = hostname =>
  dns.promises.lookup(hostname, { all: true, verbatim: true });

/** Resolve the host and require every address to be public; returns the one to pin. */
export async function resolvePublicAddress(hostname: string, lookup: Lookup = defaultLookup) {
  const host = hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(host)
    ? [{ address: host, family: net.isIP(host) }]
    : await lookup(host);
  if (!addresses.length) throw new UnsafeImageError('unresolvable_host');
  if (addresses.some(entry => isBlockedAddress(entry.address)))
    throw new UnsafeImageError('blocked_address');
  return addresses[0];
}

interface FetchResult {
  status: number;
  location?: string;
  contentType?: string;
  body?: Buffer;
}

function fetchPinned(
  url: URL,
  pinned: { address: string; family: number },
  deadline: number,
): Promise<FetchResult> {
  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return reject(new UnsafeImageError('timeout'));
    const request = https.request(
      {
        protocol: 'https:',
        hostname: url.hostname.replace(/^\[|\]$/g, ''),
        servername: net.isIP(url.hostname) ? undefined : url.hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: { accept: ALLOWED_IMAGE_TYPES.join(','), 'user-agent': 'ProCV-PDF-Export/1.0' },
        // Connect only to the address that passed validation.
        lookup: (_host, _options, callback) => callback(null, pinned.address, pinned.family),
        timeout: remaining,
      },
      response => {
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          response.resume();
          return resolve({ status, location: response.headers.location });
        }
        if (status !== 200) {
          response.resume();
          return resolve({ status });
        }
        const declared = Number(response.headers['content-length'] || 0);
        if (declared > MAX_IMAGE_BYTES) {
          response.destroy();
          return reject(new UnsafeImageError('too_large'));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_IMAGE_BYTES) {
            response.destroy();
            reject(new UnsafeImageError('too_large'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () =>
          resolve({
            status,
            contentType: String(response.headers['content-type'] || ''),
            body: Buffer.concat(chunks),
          }),
        );
        response.on('error', reject);
      },
    );
    request.on('timeout', () => request.destroy(new UnsafeImageError('timeout')));
    request.on('error', reject);
    request.end();
  });
}

/**
 * Fetch a remote image under the SSRF rules above and return it as a data URL.
 * Throws UnsafeImageError for anything that does not qualify.
 */
export async function fetchImageAsDataUrl(
  value: string,
  lookup: Lookup = defaultLookup,
): Promise<string> {
  const deadline = Date.now() + FETCH_TIMEOUT_MS;
  let url = parseSafeImageUrl(value);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const pinned = await resolvePublicAddress(url.hostname, lookup);
    const result = await fetchPinned(url, pinned, deadline);
    if (result.location) {
      url = parseSafeImageUrl(new URL(result.location, url).toString());
      continue;
    }
    if (result.status !== 200 || !result.body) throw new UnsafeImageError(`http_${result.status}`);
    const declared = (result.contentType || '').split(';')[0].trim().toLowerCase();
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(declared))
      throw new UnsafeImageError('content_type');
    const sniffed = sniffImageType(result.body);
    if (!sniffed) throw new UnsafeImageError('not_an_image');
    return `data:${sniffed};base64,${result.body.toString('base64')}`;
  }
  throw new UnsafeImageError('too_many_redirects');
}

/**
 * Return a copy of the CV whose profile photo is either a validated inline
 * data URL or removed. Never throws: an unusable photo is simply omitted.
 */
export async function withSafeProfileImage<T extends { data?: unknown }>(
  cv: T,
  options: { lookup?: Lookup; onRejected?: (reason: string) => void } = {},
): Promise<T> {
  const data = (cv.data && typeof cv.data === 'object' ? cv.data : {}) as Record<string, any>;
  const personal = data.personal && typeof data.personal === 'object' ? data.personal : null;
  const source = personal?.profileImage;
  if (!personal || typeof source !== 'string' || !source.trim()) return cv;

  let safe: string | null = null;
  try {
    if (source.startsWith('data:')) {
      safe = validateDataUrl(source.trim());
      if (!safe) options.onRejected?.('invalid_data_url');
    } else {
      safe = await fetchImageAsDataUrl(source.trim(), options.lookup);
    }
  } catch (error) {
    options.onRejected?.(error instanceof Error ? error.message : 'fetch_failed');
    safe = null;
  }

  const nextPersonal = { ...personal };
  if (safe) nextPersonal.profileImage = safe;
  else delete nextPersonal.profileImage;
  return { ...cv, data: { ...data, personal: nextPersonal } };
}
