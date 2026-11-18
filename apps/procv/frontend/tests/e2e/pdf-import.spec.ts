import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Suite E2E de importación y guardado de PDF en ProCV QA.
 *
 * REQUISITOS DE ENTORNO (NUNCA hardcodear credenciales):
 *   E2E_BASE_URL   URL del frontend QA de ProCV
 *   E2E_EMAIL      Correo de ProIdentity QA para autenticar
 *   E2E_PASSWORD   Contraseña de ProIdentity QA
 *
 * Los fixtures PDF sintéticos se reutilizan de
 * apps/procv/backend/tests/fixtures/ (documentos sintéticos QA con leyenda
 * "DATOS FICTICIOS", sin datos personales reales).
 *
 * NOTA DE SELECTORES: los nombres accesibles (aria-label) dependen de i18n. Los
 * regex usados abajo son mejores esfuerzos basados en el código inspeccionado
 * de CompleteCVEditor.tsx e ImportReviewModal.tsx y deben confirmarse contra
 * la UI en vivo de QA. Se recomienda añadir data-testid a los botones para
 * estabilizar la suite.
 *
 * ============================================================================
 * ADVERTENCIA DE SEGURIDAD — Login central
 * ============================================================================
 * Según render.yaml y el código fuente (App.tsx:12-14, App.tsx:35, App.tsx:54),
 * el frontend ProCV redirige al login central en ${PROSOLUTIONS_URL}/login, donde
 * PROSOLUTIONS_URL = VITE_PROSOLUTIONS_URL con default "https://prosolutions.page"
 * (producción). render.yaml (no reconciliado, líneas 104-105) declara para
 * procv-frontend:
 *   VITE_PROSOLUTIONS_URL = https://prosolutions.page
 *   VITE_IDENTITY_API_URL = https://identity.prosolutions.page/api/auth
 *
 * Por tanto:
 *   1. El formulario central de login está en PRODUCCIÓN (prosolutions.page/login),
 *      salvo que el frontend QA live tenga una VITE_PROSOLUTIONS_URL distinta
 *      (desconocida; render.yaml no está reconciliado con los servicios live).
 *   2. NO existe un frontend ProIdentity QA separado en render.yaml; solo hay el
 *      backend `proidentity`.
 *   3. El login central utiliza un dominio de PRODUCCIÓN, no QA.
 *   4. El frontend QA APUNTA ACCIDENTALMENTE al login de producción según
 *      render.yaml y el default del código.
 *
 * CONSECUENCIA: esta suite NO puede autenticar credenciales QA contra QA live
 * sin enviarlas a producción. La guardia de dominio impide cualquier llenado de
 * credenciales si la navegación de login apunta a un dominio no-QA.
 *
 * Para habilitar un flujo de autenticación de pruebas aislado (sin modificar
 * producción ni desactivar controles), se requiere:
 *   a) Un login central en dominio QA (ej. un frontend de identidad QA propio),
 *      o bien
 *   b) Sobreescribir VITE_PROSOLUTIONS_URL y VITE_IDENTITY_API_URL en el
 *      frontend QA para que apunten a servicios QA (cambio de configuración de
 *      Render, fuera del alcance de esta tarea y sujeto a aprobación).
 *   c) Mientras tanto, los tests de importación quedan documentados como
 *      "bloqueados por falta de login central QA seguro".
 * ============================================================================
 */

const FIXTURES_DIR = path.resolve(
  __dirname,
  '../../../backend/tests/fixtures',
);
const FIXTURES = [
  '01_cv_completo.pdf',
  '02_cv_registros_parciales.pdf',
  '03_cv_con_registros_para_excluir_o_completar.pdf',
  '04_cv_basico_sin_secciones_secundarias.pdf',
];

// Verificar que los 4 fixtures existen ANTES de ejecutar cualquier test.
const missingFixtures = FIXTURES.filter(
  (f) => !fs.existsSync(path.join(FIXTURES_DIR, f)),
);
if (missingFixtures.length > 0) {
  throw new Error(
    `Fixtures PDF no encontrados en ${FIXTURES_DIR}: ${missingFixtures.join(', ')}`,
  );
}

const BASE_URL = process.env.E2E_BASE_URL;
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

/**
 * Dominios permitidos para autenticación QA. Se bloquea cualquier intento de
 * enviar credenciales a dominios de producción (prosolutions.page).
 */
const QA_DOMAINS = [
  'prosolutions-qa-preview.onrender.com',
  'proidentity-qa-v2.onrender.com',
];

function isQADomain(urlString: string): boolean {
  try {
    const hostname = new URL(urlString).hostname;
    return QA_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith('.' + d),
    );
  } catch {
    return false;
  }
}

function requireEnv(): void {
  const missing: string[] = [];
  if (!BASE_URL) missing.push('E2E_BASE_URL (URL del frontend QA de ProCV)');
  if (!EMAIL) missing.push('E2E_EMAIL');
  if (!PASSWORD) missing.push('E2E_PASSWORD');
  if (missing.length > 0) {
    throw new Error(
      `Variables de entorno requeridas para E2E no definidas: ${missing.join(', ')}`,
    );
  }
}

// -------- Diagnóstico de respuestas HTTP 401 -------------------------------
// Se capturan TODAS las respuestas 401 con URL, método, endpoint, momento y
// cuerpo (cuando sea seguro leerlo). Solo los 401 del flujo principal
// (autenticación/importación/guardado) provocan fallo.
type Http401Record = {
  timestamp: string;
  method: string;
  url: string;
  pathname: string;
  status: number;
  bodyPreview: string | null;
};

function isOptionalResource(url: string): boolean {
  const u = new URL(url);
  const isStatic =
    u.pathname.startsWith('/_next/') ||
    u.pathname.startsWith('/static/') ||
    u.pathname.endsWith('.ico') ||
    u.pathname.endsWith('.png') ||
    u.pathname.endsWith('.jpg') ||
    u.pathname.endsWith('.svg') ||
    u.pathname.endsWith('.woff2') ||
    u.pathname.endsWith('.css') ||
    u.pathname.endsWith('.js') ||
    u.pathname === '/favicon.ico';
  const isBrowserExtension = u.protocol === 'chrome-extension:';
  return isStatic || isBrowserExtension;
}

test.describe('PDF import flow (ProCV QA)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    requireEnv();
    // Guardia de dominio: BASE_URL debe ser QA. Nunca apuntar a producción.
    if (!isQADomain(BASE_URL)) {
      throw new Error(
        `E2E_BASE_URL apunta a dominio no-QA: ${BASE_URL}. Abortando para no enviar credenciales a producción.`,
      );
    }
    testInfo.annotations.push({
      type: 'fixture',
      description: `BASE_URL=${BASE_URL}`,
    });
  });

  // -------- Autenticación SSO real (bloqueada si login está en producción) --
  // ProCV nunca guarda credenciales ni bearer tokens en localStorage. La sesión
  // se intercambia desde la cookie HttpOnly de refresh mediante ProIdentity SSO.
  // El flujo UI redirige al login central cuando no hay sesión.
  //
  // BLOQUEO DOCUMENTADO: el login central (${PROSOLUTIONS_URL}/login) apunta a
  // producción según render.yaml y App.tsx. No existe login central QA seguro
  // confirmado. Por tanto, authenticateSSO() navega al editor y, si hay
  // redirección a login, verifica que el destino sea QA; si es producción,
  // aborta SIN llenar credenciales.
  async function authenticateSSO(page: import('@playwright/test').Page): Promise<void> {
    requireEnv();

    const http401s: Http401Record[] = [];

    page.on('response', async (response) => {
      if (response.status() === 401) {
        let bodyPreview: string | null = null;
        try {
          bodyPreview = (await response.text()).slice(0, 500);
        } catch {
          bodyPreview = null;
        }
        http401s.push({
          timestamp: new Date().toISOString(),
          method: response.request().method(),
          url: response.url(),
          pathname: new URL(response.url()).pathname,
          status: 401,
          bodyPreview,
        });
        console.log(
          `[DIAGNOSTICO 401] ${response.request().method()} ${response.url()} | body: ${bodyPreview}`,
        );
      }
    });

    // 1. Navegar al frontend QA. Puede disparar redirección al login central.
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // 2. Si ya está en editor/dashboard con sesión activa, continuar.
    const isEditorOrDashboard =
      page.url().includes('/editor') ||
      page.url().includes('/dashboard');
    if (isEditorOrDashboard) {
      const unauthNotice = page
        .locator('text=Guardar en la nube requiere autenticación')
        .first();
      expect(
        await unauthNotice.isVisible().catch(() => false),
        'La sesión no quedó autenticada',
      ).toBe(false);
      return;
    }

    // 3. Detectar si hay aviso de "requiere autenticación" o redirección a login.
    const unauthNotice = page
      .locator('text=Guardar en la nube requiere autenticación')
      .first();
    const needsAuth = await unauthNotice.isVisible().catch(() => false);
    const isLoginPage = page.url().includes('/login');

    if (!needsAuth && !isLoginPage) {
      // No hay sesión ni login visible: estado inesperado. Abortar sin credenciales.
      throw new Error(
        `Estado inesperado tras navegar a ${BASE_URL}: ${page.url()}. No se puede autenticar sin confirmar dominio QA del login.`,
      );
    }

    // 4. Si estamos en una página de login, verificar que el dominio sea QA.
    //    Si el dominio es producción (prosolutions.page), ABORTAR sin llenar
    //    credenciales para evitar enviarlas a producción.
    if (isLoginPage || needsAuth) {
      if (!isQADomain(page.url())) {
        throw new Error(
          `Bloqueo de seguridad: el formulario de login está en dominio no-QA (${page.url()}). ` +
          `No se enviarán credenciales QA a producción. ` +
          `Se requiere un login central en dominio QA para continuar.`,
        );
      }

      // 5. Dominio QA confirmado: llenar credenciales.
      const emailInput = page.getByRole('textbox', {
        name: /correo|email|usuario|user/i,
      });
      const passwordInput = page.getByRole('textbox', {
        name: /contraseña|password|pass/i,
      });
      await emailInput.waitFor({ state: 'visible', timeout: 15_000 });
      await emailInput.fill(EMAIL);
      await passwordInput.fill(PASSWORD);

      const submit = page.getByRole('button', {
        name: /iniciar|entrar|login|sign.?in|acceder/i,
      });
      if ((await submit.count()) > 0) {
        await submit.click();
      } else {
        await passwordInput.press('Enter');
      }

      // 6. Esperar navegación de retorno al frontend QA (callback SSO).
      await page.waitForURL((url) => {
        const qa = isQADomain(url.url());
        const notLogin = !url.pathname.includes('/login');
        return qa && notLogin;
      }, { timeout: 30_000 });

      // 7. Confirmar que seguimos en dominio QA tras el callback.
      if (!isQADomain(page.url())) {
        throw new Error(
          `Tras el callback SSO se navegó a dominio no-QA: ${page.url()}`,
        );
      }

      // 8. Verificar que la cookie de refresh está presente (sin leer su valor).
      const cookies = await page.context().cookies();
      const refreshCookie = cookies.find((c) => c.name === 'refreshToken');
      expect(
        refreshCookie,
        'Cookie de refresh (HttpOnly) no presente tras login SSO',
      ).toBeDefined();

      // 9. Verificar que /api/auth/refresh no devolvió 401.
      const refresh401s = http401s.filter(
        (r) => r.pathname.includes('/auth/refresh'),
      );
      expect(
        refresh401s,
        `/api/auth/refresh devolvió 401 (refresh token inválido o faltante): ${JSON.stringify(
          refresh401s.map((r) => ({ method: r.method, url: r.url, bodyPreview: r.bodyPreview })),
        )}`,
      ).toEqual([]);

      // 10. Verificar ausencia del aviso de "requiere autenticación".
      const unauthNotice2 = page
        .locator('text=Guardar en la nube requiere autenticación')
        .first();
      expect(
        await unauthNotice2.isVisible().catch(() => false),
        'La sesión no quedó autenticada tras el login SSO',
      ).toBe(false);
    }
  }

  // -------- Flujo de importación por fixture --------------------------------
  for (const fixture of FIXTURES) {
    test(`importa y persiste "${fixture}"`, async ({ page }) => {
      const fixturePath = path.join(FIXTURES_DIR, fixture);

      const http401s: Http401Record[] = [];
      page.on('response', async (response) => {
        if (response.status() === 401) {
          let bodyPreview: string | null = null;
          try {
            bodyPreview = (await response.text()).slice(0, 500);
          } catch {
            bodyPreview = null;
          }
          http401s.push({
            timestamp: new Date().toISOString(),
            method: response.request().method(),
            url: response.url(),
            pathname: new URL(response.url()).pathname,
            status: 401,
            bodyPreview,
          });
          console.log(
            `[DIAGNOSTICO 401] ${response.request().method()} ${response.url()} | body: ${bodyPreview}`,
          );
        }
      });

      // 1. Autenticar SSO (puede abortar si login está en producción).
      await authenticateSSO(page);
      await page.goto(`${BASE_URL}/editor`);
      await expect(page).toHaveURL(/\/editor(\/|$)/);

      // 2. Localizar el input real de archivo en el editor.
      const fileInput = page.locator('input[type="file"]').first();
      await expect(fileInput).toBeAttached();

      // Verificar que acepta PDF.
      const accept = await fileInput.getAttribute('accept');
      expect(
        accept,
        'El input de archivo no declara aceptar PDF',
      ).toMatch(/\.pdf|application\/pdf/i);

      // 3. Seleccionar el PDF directamente en el input (sin filechooser).
      await fileInput.setInputFiles(fixturePath);

      // 4. Esperar la respuesta de importación y el modal de revisión.
      const importResponsePromise = page.waitForResponse(
        (r) =>
          r.url().includes('/cvs/import/parse') &&
          r.request().method() === 'POST',
        { timeout: 30_000 },
      );
      const reviewModal = page.getByRole('dialog').first();
      await expect(reviewModal).toBeVisible({ timeout: 15_000 });

      const importResponse = await importResponsePromise;
      expect(
        importResponse.status(),
        `La importación de ${fixture} no retornó 2xx`,
      ).toBeLessThan(400);

      // El nombre del archivo debe reflejarse en el modal.
      await expect(reviewModal).toContainText(fixture);

      // 5. Comprobar extracción: debe haberse detectado contenido.
      const nothingDetected = page.getByText(/nada detectado|nothing detected/i);
      await expect(
        nothingDetected.isVisible().catch(() => false),
        `Se esperaba extraer contenido de ${fixture}`,
      ).toBe(false);

      // Verificar que hay texto extraído.
      const modalText = await reviewModal.textContent();
      expect(
        modalText,
        `El modal de revisión de ${fixture} no muestra contenido extraído`,
      ).toMatch(/DOCUMENTO SINTÉTICO|DATOS FICTICIOS|fullName|nombre|Ingeniera|Universidad|i+/i);

      // 6. Aplicar la importación (botón "Aplicar" del modal).
      const applyButton = page.getByRole('button', {
        name: /aplicar|apply/i,
      });
      await expect(applyButton).toBeVisible();
      await expect(applyButton).toBeEnabled();
      await applyButton.click();

      // El modal debe cerrarse y volver al editor.
      await expect(reviewModal).toBeHidden({ timeout: 15_000 });

      // 7. Guardar el CV (botón "Guardar" del editor).
      const saveButton = page.getByRole('button', {
        name: /guardar|save/i,
      });
      await expect(saveButton).toBeVisible();
      await saveButton.click();

      // 8. Verificar respuesta de guardado.
      await page.waitForTimeout(2_000);

      // 9. Recargar la página para verificar persistencia.
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      // Tras recargar, el editor debe seguir mostrando contenido importado.
      const editorContent = page.locator(
        'input, textarea, [contenteditable="true"]',
      ).first();
      await expect(editorContent).toBeVisible({ timeout: 15_000 });

      // 10. Evaluar 401 capturados: solo los del flujo principal fallan.
      const critical401s = http401s.filter((r) => !isOptionalResource(r.url));
      expect(
        critical401s,
        `Respuestas HTTP 401 críticas en el flujo principal de ${fixture}: ${JSON.stringify(
          critical401s.map((r) => ({ method: r.method, url: r.url, bodyPreview: r.bodyPreview })),
          null,
          2,
        )}`,
      ).toEqual([]);
    });
  }

  // -------- Calidad: respuestas HTTP y errores de consola -------------------
  test('no falla la autenticación ni hay errores de consola críticos', async ({
    page,
  }) => {
    const http401s: Http401Record[] = [];
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on('response', async (response) => {
      if (response.status() === 401) {
        let bodyPreview: string | null = null;
        try {
          bodyPreview = (await response.text()).slice(0, 500);
        } catch {
          bodyPreview = null;
        }
        http401s.push({
          timestamp: new Date().toISOString(),
          method: response.request().method(),
          url: response.url(),
          pathname: new URL(response.url()).pathname,
          status: 401,
          bodyPreview,
        });
        console.log(
          `[DIAGNOSTICO 401] ${response.request().method()} ${response.url()} | body: ${bodyPreview}`,
        );
      }
      if (response.status() >= 500) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await authenticateSSO(page);
    await page.goto(`${BASE_URL}/editor`);
    await expect(page).toHaveURL(/\/editor(\/|$)/);

    const critical401s = http401s.filter((r) => !isOptionalResource(r.url));
    const criticalConsoleErrors = consoleErrors.filter(
      (msg) =>
        !msg.includes('favicon') &&
        !msg.includes('chrome-extension') &&
        !msg.includes('devtools'),
    );

    console.log(
      `[DIAGNOSTICO 401 RESUMEN] Total 401: ${http401s.length}, críticos: ${critical401s.length}`,
    );
    critical401s.forEach((r) =>
      console.log(`[401] ${r.method} ${r.url} | ${r.bodyPreview}`),
    );

    expect(
      critical401s,
      'Respuestas HTTP 401 críticas en el flujo principal',
    ).toEqual([]);
    expect(
      criticalConsoleErrors,
      'Errores de consola críticos inesperados',
    ).toEqual([]);
    expect(failedRequests, 'Respuestas HTTP 500 inesperadas').toEqual([]);
  });
});
