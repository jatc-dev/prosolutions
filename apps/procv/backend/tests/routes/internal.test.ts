import { parseUserIds, requireInternalToken } from '../../src/routes/internal';

function run(env: NodeJS.ProcessEnv, authorization?: string) {
  const res: any = { statusCode: 200, status(code: number) { this.statusCode = code; return this; }, json() { return this; } };
  let passed = false;
  requireInternalToken(env)({ headers: authorization ? { authorization } : {} } as any, res, () => { passed = true; });
  return { status: res.statusCode, passed };
}

describe('ProCV internal API', () => {
  const token = 'x'.repeat(40);

  it('is disabled without a strong service token', () => {
    expect(run({}, `Bearer ${token}`)).toEqual({ status: 404, passed: false });
    expect(run({ PROCV_INTERNAL_TOKEN: 'short' }, 'Bearer short')).toEqual({ status: 404, passed: false });
  });

  it('accepts only the configured token', () => {
    expect(run({ PROCV_INTERNAL_TOKEN: token }, `Bearer ${token}`)).toEqual({ status: 200, passed: true });
    expect(run({ PROCV_INTERNAL_TOKEN: token }, 'Bearer wrong').passed).toBe(false);
    expect(run({ PROCV_INTERNAL_TOKEN: token }).status).toBe(401);
  });

  it('validates user id lists', () => {
    expect(parseUserIds('ckabc123,ckdef456,ckabc123')).toEqual(['ckabc123', 'ckdef456']);
    expect(parseUserIds('')).toBeNull();
    expect(parseUserIds('ok1,bad id')).toBeNull();
    expect(parseUserIds(Array.from({ length: 101 }, (_, i) => `user${i}`).join(','))).toBeNull();
  });
});
