import { AsyncLocalStorage } from 'node:async_hooks';

const identityTokenStorage = new AsyncLocalStorage<string>();

export function runWithIdentityToken<T>(token: string, callback: () => T): T {
  if (!token || !token.trim()) {
    throw new Error('A verified ProIdentity database context token is required');
  }
  return identityTokenStorage.run(token, callback);
}

export function getIdentityToken(): string | undefined {
  return identityTokenStorage.getStore();
}
