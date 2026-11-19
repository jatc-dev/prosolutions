import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { forbidden, unauthorized } from '../http/errors.js';
import type { KeyStore } from './jwks.js';

/** Capability modules issued by ProIdentity in the access token `modules[]` claim. */
export const CANDIDATE_MODULE = 'PROJOBS';
export const RECRUITER_MODULE = 'PRORECRUIT';

export interface Principal {
  userId: string;
  email: string | null;
  modules: string[];
  isCandidate: boolean;
  isRecruiter: boolean;
  /** Raw bearer token, forwarded only to first-party services acting for this user (ProCV). */
  token: string;
}

export interface IdentityVerifierOptions {
  issuer: string;
  audience: string;
  /** ProIdentity public keys (ES256). Preferred: consumers hold no signing secret. */
  keyStore?: KeyStore | null;
  /** Legacy shared HS256 secret; accepted only while configured (migration window). */
  secret?: string | null;
}

declare module 'express-serve-static-core' {
  interface Request {
    principal?: Principal;
  }
}

const SUBJECT = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Verifies ProIdentity access tokens locally: ES256 signature against the
 * published JWKS (or the legacy HS256 secret while it is still configured),
 * issuer, audience, expiry and `token_use: "access"`. ProIdentity remains the
 * only authority that issues sessions and grants modules.
 */
export function createIdentityVerifier(options: IdentityVerifierOptions) {
  return function verify(token: string): Principal {
    let claims: jwt.JwtPayload;
    try {
      const header = jwt.decode(token, { complete: true })?.header;
      const verifyOptions = { issuer: options.issuer, audience: options.audience };
      let decoded: string | jwt.JwtPayload;
      if (header?.alg === 'ES256' && options.keyStore && header.kid) {
        const key = options.keyStore.getKey(header.kid);
        if (!key) throw new Error('unknown signing key');
        decoded = jwt.verify(token, key, { ...verifyOptions, algorithms: ['ES256'] });
      } else if (header?.alg === 'HS256' && options.secret) {
        decoded = jwt.verify(token, options.secret, { ...verifyOptions, algorithms: ['HS256'] });
      } else {
        throw new Error('unsupported token');
      }
      if (typeof decoded === 'string') throw new Error('unexpected token payload');
      if (decoded.token_use !== 'access') throw new Error('not an access token');
      claims = decoded;
    } catch {
      throw unauthorized('Invalid or expired session');
    }
    const userId = typeof claims.sub === 'string' ? claims.sub : '';
    if (!SUBJECT.test(userId)) throw unauthorized('Invalid session subject');
    const modules = Array.isArray(claims.modules)
      ? claims.modules.filter((value): value is string => typeof value === 'string')
      : [];
    return {
      userId,
      email: typeof claims.email === 'string' ? claims.email : null,
      modules,
      isCandidate: modules.includes(CANDIDATE_MODULE),
      isRecruiter: modules.includes(RECRUITER_MODULE),
      token,
    };
  };
}

export type IdentityVerifier = ReturnType<typeof createIdentityVerifier>;

function bearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/** Attach the principal when a valid token is present; anonymous otherwise. */
export function optionalAuth(verify: IdentityVerifier): RequestHandler {
  return (req, _res, next) => {
    const token = bearer(req);
    if (!token) return next();
    try {
      req.principal = verify(token);
    } catch {
      // Public endpoints degrade to anonymous on stale tokens instead of failing.
    }
    next();
  };
}

function guard(verify: IdentityVerifier, check?: (principal: Principal) => void): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = bearer(req);
    if (!token) return next(unauthorized());
    try {
      const principal = verify(token);
      check?.(principal);
      req.principal = principal;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireUser = (verify: IdentityVerifier) => guard(verify);

export const requireCandidate = (verify: IdentityVerifier) =>
  guard(verify, (principal) => {
    if (!principal.isCandidate) throw forbidden('ProJobs access required', 'module_required');
  });

export const requireRecruiter = (verify: IdentityVerifier) =>
  guard(verify, (principal) => {
    if (!principal.isRecruiter) throw forbidden('Recruiter access (PRORECRUIT) required', 'recruiter_required');
  });

/** Narrow `req.principal` after an auth guard has run. */
export function principalOf(req: Request): Principal {
  if (!req.principal) throw unauthorized();
  return req.principal;
}
