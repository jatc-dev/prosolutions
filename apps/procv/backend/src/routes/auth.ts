import { Router } from 'express';
import { config } from '../config';

const router = Router();

/**
 * Proxy temporal hacia ProIdentity.
 * Todas las peticiones a /api/auth/* se reenvían al servicio de Identity.
 * Esto permite una transición progresiva sin romper el frontend de ProCV.
 */
const proxyToIdentity = async (path: string, req: any, res: any) => {
  const url = `${config.identityUrl}/api/auth${path}`;
  const method = req.method;
  const headers: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;

  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  if (req.headers.authorization) {
    headers.authorization = req.headers.authorization;
  }

  if (req.headers['x-csrf-token']) {
    headers['x-csrf-token'] = req.headers['x-csrf-token'];
  }

  headers['content-type'] = 'application/json';

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(req.body),
      credentials: 'include',
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    res.status(response.status);

    // Reenviar cookies de refresh (Set-Cookie)
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('set-cookie', setCookie);
    }

    if (isJson) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (error) {
    res.status(502).json({ message: 'Identity service unavailable' });
  }
};

// Rutas públicas (sin autenticación)
router.post('/register', (req, res) => proxyToIdentity('/register', req, res));
router.post('/login', (req, res) => proxyToIdentity('/login', req, res));
router.post('/refresh', (req, res) => proxyToIdentity('/refresh', req, res));
router.post('/logout', (req, res) => proxyToIdentity('/logout', req, res));
router.post('/forgot-password', (req, res) => proxyToIdentity('/forgot-password', req, res));
router.post('/reset-password', (req, res) => proxyToIdentity('/reset-password', req, res));
router.post('/verify-email', (req, res) => proxyToIdentity('/verify-email', req, res));
router.post('/resend-verification', (req, res) => proxyToIdentity('/resend-verification', req, res));

// Ruta de cooldown (pública)
router.get('/verification-cooldown', (req, res) => proxyToIdentity('/verification-cooldown', req, res));

export default router;
