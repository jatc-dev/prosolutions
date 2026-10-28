import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

jest.mock('../src/prismaClient', () => ({
  __esModule: true,
  default: {
    platformSetting: {
      findUnique: jest.fn(),
    },
  },
}));

import { createApp } from '../src/app';
import prisma from '../src/prismaClient';

const findUnique = prisma.platformSetting.findUnique as jest.Mock;

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
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to English and returns only public feature fields', async () => {
    findUnique.mockResolvedValue({
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
    expect(findUnique).toHaveBeenCalledWith({ where: { key: 'landing_features_en' } });
    expect(await response.json()).toEqual([
      {
        id: 'cv-builder',
        title: 'CV builder',
        description: 'Create and export your CV.',
      },
    ]);
  });

  it('normalizes regional Spanish locales and filters malformed entries', async () => {
    findUnique.mockResolvedValue({
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
    expect(findUnique).toHaveBeenCalledWith({ where: { key: 'landing_features_es' } });
    expect(await response.json()).toEqual([
      { id: 'cv', title: 'Crear CV', description: 'Crea tu hoja de vida.' },
    ]);
  });

  it('does not return settings marked as non-public', async () => {
    findUnique.mockResolvedValue({
      key: 'landing_features_en',
      isPublic: false,
      value: JSON.stringify([
        { id: 'private', title: 'Internal copy', description: 'Not public.' },
      ]),
    });

    const response = await fetch(`${baseUrl}/api/public/landing-features?lang=en`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it('fails closed with an empty array when the setting is malformed or storage fails', async () => {
    findUnique.mockResolvedValueOnce({
      key: 'landing_features_en',
      isPublic: true,
      value: '{not valid json',
    });

    const malformedResponse = await fetch(`${baseUrl}/api/public/landing-features?lang=en`);
    expect(malformedResponse.status).toBe(200);
    expect(await malformedResponse.json()).toEqual([]);

    findUnique.mockRejectedValueOnce(new Error('database unavailable'));
    const unavailableResponse = await fetch(`${baseUrl}/api/public/landing-features?lang=en`);
    expect(unavailableResponse.status).toBe(200);
    expect(await unavailableResponse.json()).toEqual([]);
  });
});
