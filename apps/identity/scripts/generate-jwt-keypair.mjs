#!/usr/bin/env node
/**
 * Generates the ES256 (P-256) key pair ProIdentity uses to sign access tokens.
 *
 *   node scripts/generate-jwt-keypair.mjs
 *
 * Paste IDENTITY_JWT_PRIVATE_KEY into ProIdentity's environment (Render) only.
 * The private key must never be configured in any other service: consumers
 * verify tokens with the public JWKS at /.well-known/jwks.json.
 */
import { generateKeyPairSync, createHash } from 'node:crypto';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
const jwk = publicKey.export({ format: 'jwk' });
const kid = createHash('sha256')
  .update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y }))
  .digest('base64url');

console.log('# ProIdentity only (secret):');
console.log(`IDENTITY_JWT_PRIVATE_KEY=${Buffer.from(privatePem).toString('base64')}`);
console.log(`IDENTITY_JWT_KID=${kid}`);
console.log('');
console.log('# Public key (safe to share; keep it to accept old tokens after a future rotation via IDENTITY_JWT_PREVIOUS_PUBLIC_KEY):');
console.log(Buffer.from(publicPem).toString('base64'));
