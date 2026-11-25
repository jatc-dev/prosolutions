import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../../src/services/cvService', () => ({
  CVService: { updateCV: jest.fn() },
}));
jest.mock('../../src/services/cvImportService', () => ({}));
jest.mock('../../src/services/atsService', () => ({}));
jest.mock('../../src/services/cvAtsService', () => ({}));

import { updateCV } from '../../src/controllers/cvController';
import { CVService } from '../../src/services/cvService';

const updateMock = CVService.updateCV as unknown as jest.Mock<
  (...args: unknown[]) => Promise<unknown>
>;

function call(body: unknown) {
  const res = {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };
  const req = { userId: 'user-1', params: { id: 'cv-1' }, body };
  return updateCV(req as never, res as never).then(() => res);
}

describe('PUT /api/cvs/:id', () => {
  beforeEach(() => {
    updateMock.mockReset();
    updateMock.mockResolvedValue({
      id: 'cv-1',
      title: 'Nuevo',
      data: '{"personal":{"fullName":"Ana"}}',
    });
  });

  it('a title-only rename leaves the stored content untouched', async () => {
    const res = await call({ title: 'Nuevo' });
    expect(res.statusCode).toBe(200);
    expect(updateMock).toHaveBeenCalledWith('cv-1', 'user-1', 'Nuevo', undefined, undefined);
  });

  it('still saves content when the editor sends it', async () => {
    await call({ data: { personal: { fullName: 'Ana' } } });
    expect(updateMock).toHaveBeenCalledWith('cv-1', 'user-1', undefined, undefined, {
      personal: { fullName: 'Ana' },
    });
  });
});
