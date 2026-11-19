import {
  fetchImageAsDataUrl,
  isBlockedAddress,
  parseSafeImageUrl,
  resolvePublicAddress,
  sniffImageType,
  UnsafeImageError,
  validateDataUrl,
  withSafeProfileImage,
} from '../../src/utils/safeImage';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

describe('PDF profile image SSRF protection', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::1',
    '::',
    'fe80::1',
    'fd00::1',
    '::ffff:127.0.0.1',
    'not-an-ip',
  ])('blocks %s', address => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700:4700::1111'])(
    'allows public %s',
    address => {
      expect(isBlockedAddress(address)).toBe(false);
    },
  );

  it.each([
    ['http://example.com/a.png', 'https_required'],
    ['file:///etc/passwd', 'https_required'],
    ['ftp://example.com/a.png', 'https_required'],
    ['https://user:pass@example.com/a.png', 'credentials_not_allowed'],
    ['https://example.com:8443/a.png', 'port_not_allowed'],
    ['https://169.254.169.254/latest/meta-data', 'blocked_address'],
    ['https://[::1]/a.png', 'blocked_address'],
    ['https://localhost/a.png', 'blocked_host'],
    ['https://metadata.google.internal/a.png', 'blocked_host'],
  ])('rejects %s', (url, reason) => {
    expect(() => parseSafeImageUrl(url)).toThrow(new UnsafeImageError(reason));
  });

  it('rejects hosts that resolve to any private address (DNS rebinding / split answers)', async () => {
    const lookup = async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.5', family: 4 },
    ];
    await expect(resolvePublicAddress('evil.example', lookup)).rejects.toThrow('blocked_address');
    await expect(fetchImageAsDataUrl('https://evil.example/a.png', lookup)).rejects.toThrow(
      'blocked_address',
    );
  });

  it('accepts only real JPEG/PNG/WebP data URLs within the size limit', () => {
    expect(sniffImageType(PNG)).toBe('image/png');
    expect(validateDataUrl(`data:image/png;base64,${PNG.toString('base64')}`)).toMatch(
      /^data:image\/png;base64,/,
    );
    expect(
      validateDataUrl(`data:image/png;base64,${Buffer.from('<svg onload=x>').toString('base64')}`),
    ).toBeNull();
    expect(validateDataUrl(`data:image/svg+xml;base64,${PNG.toString('base64')}`)).toBeNull();
    expect(
      validateDataUrl(
        `data:image/png;base64,${Buffer.alloc(2 * 1024 * 1024 + 1, 1).toString('base64')}`,
      ),
    ).toBeNull();
  });

  it('drops unsafe photos from the exported CV instead of failing the export', async () => {
    const rejected: string[] = [];
    const cv = {
      title: 'CV',
      data: { personal: { name: 'Ana', profileImage: 'http://169.254.169.254/latest' } },
    };
    const safe = await withSafeProfileImage(cv, { onRejected: reason => rejected.push(reason) });
    expect((safe.data as any).personal.profileImage).toBeUndefined();
    expect((safe.data as any).personal.name).toBe('Ana');
    expect(rejected).toEqual(['https_required']);
    expect((cv.data as any).personal.profileImage).toBe('http://169.254.169.254/latest');
  });
});
