import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const mockFindFirst = jest.fn();
jest.mock('../src/dbContext', () => ({
  withPublicContext: (operation: (tx: unknown) => Promise<unknown>) =>
    operation({ platformSetting: { findFirst: mockFindFirst } }),
}));

import { createApp } from '../src/app';

const findFirst = mockFindFirst as jest.Mock;

describe('public Landing Features endpoint', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createApp().listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    const closed = new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });

    // Node fetch keeps HTTP connections alive; explicitly close remaining
    // sockets so Jest cannot hang while waiting for the server to drain.
    server.closeAllConnections();
    await closed;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to English and returns only public feature fields', async () => {
    findFirst.mockResolvedValue({
      key: 'landing_features_en',
      isPublic: true,
      value: JSON.stringify([
        {
          id: 'cv-builder',
          title: '  CV builder  ',
          description: ' Create and export your CV. ',
          internalNote: 'must not be returned',
        },
      ]),
    });

    const response = await fetch(`${baseUrl}/api/public/landing-features`);

    expect(response.status).toBe(200);
    expect(findFirst).toHaveBeenCalledWith({
      where: { key: 'landing_features_en', isPublic: true },
    });
    expect(await response.json()).toEqual([
      {
        id: 'cv-builder',
        title: 'CV builder',
        description: 'Create and export your CV.',
      },
    ]);
  });

  it('normalizes regional Spanish locales and filters malformed entries', async () => {
    findFirst.mockResolvedValue({
      key: 'landing_features_es',
      isPublic: true,
      value: JSON.stringify([
        { id: 'cv', title: 'Crear CV', description: 'Crea tu hoja de vida.' },
        { id: 'blank-title', title: '  ', description: 'No debe aparecer.' },
        { id: 'blank-description', title: 'Título válido', description: ' ' },
        null,
        'invalid',
      ]),
    });

    const response = await fetch(`${baseUrl}/api/public/landing-features?lang=es-CO`);

    expect(response.status).toBe(200);
    expect(findFirst).toHaveBeenCalledWith({
      where: { key: 'landing_features_es', isPublic: true },
    });
    expect(await response.json()).toEqual([
      { id: 'cv', title: 'Crear CV', description: 'Crea tu hoja de vida.' },
    ]);
  });

  it('does not return settings marked as non-public', async () => {
    findFirst.mockResolvedValue(null);

    const response = await fetch(`${baseUrl}/api/public/landing-features?lang=en`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it('fails closed with an empty array when the setting is malformed or storage fails', async () => {
    findFirst.mockResolvedValueOnce({
      key: 'landing_features_en',
      isPublic: true,
      value: '{not valid json',
    });

    const malformedResponse = await fetch(`${baseUrl}/api/public/landing-features?lang=en`);
    expect(malformedResponse.status).toBe(200);
    expect(await malformedResponse.json()).toEqual([]);

    findFirst.mockRejectedValueOnce(new Error('database unavailable'));
    const unavailableResponse = await fetch(`${baseUrl}/api/public/landing-features?lang=en`);
    expect(unavailableResponse.status).toBe(200);
    expect(await unavailableResponse.json()).toEqual([]);
  });
});
