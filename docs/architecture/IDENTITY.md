# ProSolutions Identity — Guía de Integración y Escalabilidad

**Estado:** activo  
**Propietario:** plataforma ProSolutions  
**Módulos soportados:** `PROCV`, `PROJOBS`, `PROSKILLS`, `PROCAREER`, `PROINTERVIEW`, `PRORECRUIT`  
**Servicio:** `apps/identity/` (Express + Prisma + PostgreSQL)  
**Puerto por defecto:** `4001`

---

## 1. Visión general

**ProSolutions Identity** es el servicio centralizado de autenticación, perfil profesional y control de accesos para todo el ecosistema ProSolutions. Cada módulo (`procv`, `projobs`, y futuros módulos) delega la emisión y validación de tokens a Identity, manteniendo sus datos de negocio aislados.

Principios clave:

- Una cuenta, un inicio de sesión y un token único para todos los módulos.
- Cada módulo valida el JWT de forma independiente (firma, `issuer`, `audience`, `expiry`).
- La autorización se resuelve mediante el claim `modules[]` del token, no mediante credenciales locales.
- No se duplican tiendas de contraseñas por módulo.

---

## 2. Esquema del Token JWT

El access token emitido por Identity contiene los siguientes claims:

| Claim | Tipo | Descripción |
|-------|------|-------------|
| `iss` | string | Emisor del token. Valor: `https://identity.prosolutions.dev` (desarrollo: `http://localhost:4001`) |
| `aud` | string | Audiencia. Cada módulo define la suya (ej: `projobs-api`, `procv-api`) |
| `sub` | string | Identificador universal del usuario (`user_id`, UUID) |
| `email` | string | Correo electrónico del usuario |
| `role` | string | Rol de cuenta (`user`, `admin`) |
| `modules` | string[] | Módulos a los que el usuario tiene acceso activo (ej: `["PROCV", "PROJOBS"]`) |
| `iat` | number | Momento de emisión (unix timestamp) |
| `exp` | number | Momento de expiración (unix timestamp) |

Ejemplo de payload decodificado:

```json
{
  "iss": "https://identity.prosolutions.dev",
  "aud": "projobs-api",
  "sub": "cuid_abc123",
  "email": "usuario@ejemplo.com",
  "role": "user",
  "modules": ["PROCV", "PROJOBS"],
  "iat": 1789920000,
  "exp": 1789920900
}
```

El refresh token se almacena únicamente en una cookie HttpOnly (`refreshToken`) y nunca se expone al JavaScript del navegador.

---

## 3. Enum de Módulos (`ProSolutionsModule`)

Definido en `apps/identity/src/types/modules.ts`:

```typescript
export enum ProSolutionsModule {
  PROCV = 'PROCV',
  PROJOBS = 'PROJOBS',
  PROSKILLS = 'PROSKILLS',
  PROCAREER = 'PROCAREER',
  PROINTERVIEW = 'PROINTERVIEW',
  PRORECRUIT = 'PRORECRUIT',
}

export const ALL_MODULES: ProSolutionsModule[] = [
  ProSolutionsModule.PROCV,
  ProSolutionsModule.PROJOBS,
  ProSolutionsModule.PROSKILLS,
  ProSolutionsModule.PROCAREER,
  ProSolutionsModule.PROINTERVIEW,
  ProSolutionsModule.PRORECRUIT,
];
```

Cuando se crea una cuenta nueva, se le asigna por defecto el módulo `PROCV`. Los administradores pueden conceder acceso a otros módulos mediante los endpoints de administración.

---

## 4. Validación de Tokens en Backend (Node.js/Express)

Cada módulo debe validar el JWT de Identity en sus propias rutas protegidas. No se debe confiar en un `user_id` enviado solo por el cliente.

### 4.1 Middleware de ejemplo (Express)

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface ModuleAuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
  modules?: string[];
}

const REQUIRED_MODULE = 'TU_MODULO'; // ej: 'PROSKILLS'

export function moduleAuthMiddleware(
  req: ModuleAuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const payload = jwt.verify(token, process.env.IDENTITY_JWT_SECRET!, {
      issuer: process.env.IDENTITY_ISSUER, // https://identity.prosolutions.dev
      audience: process.env.IDENTITY_AUDIENCE, // ej: proskills-api
    }) as {
      sub: string;
      email?: string;
      role?: string;
      modules?: string[];
    };

    req.userId = payload.sub;
    req.email = payload.email;
    req.role = payload.role;
    req.modules = payload.modules;

    const hasAccess = Array.isArray(payload.modules)
      ? payload.modules.includes(REQUIRED_MODULE)
      : false;

    if (!hasAccess) {
      return res.status(403).json({
        message: 'Module access required',
        requiredModule: REQUIRED_MODULE,
      });
    }

    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
```

### 4.2 Variables de entorno requeridas por módulo

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `IDENTITY_URL` | URL base del servicio Identity | `https://identity.prosolutions.dev` |
| `IDENTITY_JWT_SECRET` | Secreto compartido para verificar la firma | igual al de Identity |
| `IDENTITY_ISSUER` | Emisor esperado | `https://identity.prosolutions.dev` |
| `IDENTITY_AUDIENCE` | Audiencia del módulo | `proskills-api` |
| `PORT` | Puerto del módulo | `5177` |

---

## 5. Rutas de Administración de Acceso a Módulos

Identity expone endpoints para conceder y revocar acceso por módulo. Solo el rol `admin` puede usarlos.

### 5.1 Conceder acceso a un módulo

```
POST /api/modules/grant
Headers: Authorization: Bearer <admin_token>, Content-Type: application/json
Body: { "userId": "cuid_xyz", "module": "PROSKILLS", "expiresAt": "2027-01-01T00:00:00Z" }
```

### 5.2 Revocar acceso a un módulo

```
POST /api/modules/revoke
Headers: Authorization: Bearer <admin_token>, Content-Type: application/json
Body: { "userId": "cuid_xyz", "module": "PROSKILLS" }
```

### 5.3 Consultar módulos de un usuario

```
GET /api/modules/me/modules
Headers: Authorization: Bearer <token>
Respuesta: { "moduleAccess": [ { "module": "PROCV", "active": true, ... } ] }
```

---

## 6. Patrón de Cliente (Frontend)

Cada módulo frontend debe seguir este patrón para integrarse con Identity:

### 6.1 Almacenamiento del token

- Guardar el access token en `localStorage` bajo una clave específica del módulo (ej: `projobs_access_token`).
- Nunca almacenar el refresh token en localStorage (vive en cookie HttpOnly gestionada por Identity).

### 6.2 Validación al iniciar

Al cargar la aplicación, enviar el token a `GET {IDENTITY_URL}/api/identity/me` con el header `Authorization: Bearer <token>`. Si responde 401/403, limpiar el token y tratar al usuario como anónimo.

### 6.3 Redirección a login

Cuando el usuario intente acceder a una funcionalidad que requiera autenticación y no tenga token válido, redirigir al flujo central de Identity:

```typescript
window.location.href = `${IDENTITY_URL}/api/auth/login?redirect=${encodeURIComponent(window.location.origin + window.location.pathname)}`;
```

### 6.4 Ejemplo de cliente (ProJobs — `auth.js`)

El archivo `apps/projobs/auth.js` implementa este patrón:

- `window.proJobsAuth.isAuthenticated()` — devuelve boolean
- `window.proJobsAuth.getUser()` — devuelve el perfil (`userId`, `email`, `role`, `modules`)
- `window.proJobsAuth.login()` — redirige a Identity
- `window.proJobsAuth.logout()` — limpia token y recarga
- Botones con atributo `data-auth-required` se muestran solo si está autenticado

### 6.5 Llamadas a API protegidas

Enviar el token en el header `Authorization: Bearer <token>` a las rutas propias del módulo. El backend valida el token y extrae `sub` (`user_id`) para asociar la operación al usuario.

---

## 7. Cómo Agregar un Nuevo Módulo (Checklist)

1. **Definir el enum** — Agregar el módulo a `ProSolutionsModule` en `apps/identity/src/types/modules.ts` si no existe.
2. **Crear el servicio backend** — Nuevo servicio Express que sirva el frontend estático y exponga rutas API propias.
3. **Agregar middleware de auth** — Copiar el patrón de `apps/projobs/server/src/middleware/auth.ts`, ajustando `REQUIRED_MODULE` y `IDENTITY_AUDIENCE`.
4. **Proteger rutas personales** — Aplicar el middleware solo a rutas que requieran sesión (postulaciones, guardados, perfil, etc.). Mantener la navegación pública anónima.
5. **Agregar cliente auth** — Crear un archivo `auth.js` similar al de ProJobs que valide contra `Identity /api/identity/me` y maneje UI de login/logout.
6. **Registrar en el navegador del ecosistema** — Agregar el enlace al módulo en la barra de navegación compartida (`pro-nav`).
7. **Definir variables de entorno** — `IDENTITY_URL`, `IDENTITY_JWT_SECRET`, `IDENTITY_ISSUER`, `IDENTITY_AUDIENCE`, `PORT`.
8. **No crear tienda de contraseñas local** — Todo módulo nuevo debe delegar auth a Identity. Prohibido crear tablas `users`/`passwords` propias.

---

## 8. Seguridad y Límites No Negociables

- Validar siempre `issuer`, `audience`, firma y `exp` del JWT en el servidor.
- Nunca confiar en un `user_id` enviado únicamente por el cliente.
- Los refresh tokens viven en cookies HttpOnly, Secure y SameSite.
- Los tokens de acceso son de corta vida (15 min por defecto).
- Cada módulo tiene su propia `audience`; no se aceptan tokens de otra audiencia.
- El acceso a un módulo se concede explícitamente mediante `ModuleAccess`; no se hereda automáticamente.
- El rol `admin` no otorga acceso automático a todos los módulos; se debe conceder por módulo.
- Nunca enviar tokens en URLs ni copiar tokens entre almacenes de diferentes orígenes.

---

## 9. Referencia Rápida de Endpoints Identity

| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|----------------|
| POST | `/api/auth/register` | Registro de cuenta | No |
| POST | `/api/auth/login` | Inicio de sesión | No |
| POST | `/api/auth/refresh` | Renovar access token | Cookie refresh |
| POST | `/api/auth/logout` | Cerrar sesión | Cookie refresh |
| GET | `/api/auth/me` | Perfil del usuario | Bearer token |
| PUT | `/api/auth/profile` | Actualizar perfil | Bearer token |
| POST | `/api/auth/verify-email` | Verificar correo | No |
| POST | `/api/auth/resend-verification` | Reenviar verificación | No |
| POST | `/api/auth/forgot-password` | Recuperar contraseña | No |
| POST | `/api/auth/reset-password` | Restablecer contraseña | No |
| GET | `/api/profile/me` | Perfil profesional central | Bearer token |
| PUT | `/api/profile/me` | Actualizar perfil profesional | Bearer token |
| GET | `/api/modules/me/modules` | Módulos activos del usuario | Bearer token |
| POST | `/api/modules/grant` | Conceder acceso a módulo | Admin + Bearer |
| POST | `/api/modules/revoke` | Revocar acceso a módulo | Admin + Bearer |

---

## 10. Ejemplo Completo: Módulo `PROSKILLS`

**Backend middleware:**

```typescript
const REQUIRED_MODULE = 'PROSKILLS';
const IDENTITY_AUDIENCE = 'proskills-api';
// ... mismo patrón que proJobsAuthMiddleware
```

**Frontend auth.js (resumido):**

```typescript
const IDENTITY_URL = 'http://localhost:4001';
const TOKEN_KEY = 'proskills_access_token';

// Validar al cargar
const profile = await fetch(`${IDENTITY_URL}/api/identity/me`, {
  headers: { Authorization: `Bearer ${token}` },
});

// UI
document.querySelectorAll('[data-auth-required]').forEach(el => {
  el.style.display = isAuthenticated ? '' : 'none';
});
```

Con esta guía, cualquier nuevo módulo del ecosistema ProSolutions puede integrarse de forma segura y consistente con ProSolutions Identity.
