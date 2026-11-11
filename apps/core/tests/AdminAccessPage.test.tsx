import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import {
  AdminAccessDeniedView,
  AdminAccessErrorView,
  AdminAccessModuleControl,
} from "../src/pages/adminAccessViews";

function render(element: React.ReactNode): string {
  return renderToStaticMarkup(<StaticRouter location="/admin/access">{element}</StaticRouter>);
}

test("denied access view is exclusive and contains no administrative shell or user data", () => {
  const html = render(<AdminAccessDeniedView />);
  assert.match(html, /Acceso denegado/);
  assert.match(html, /\/dashboard/);
  assert.doesNotMatch(html, /Panel de administración|Usuarios y accesos|Configuración|Cuentas de Identity|<nav|checkbox/);
});

test("error view preserves network and server errors as errors, not access denied", () => {
  const html = render(<AdminAccessErrorView message="Error de red. Comprueba tu conexión." onRetry={() => undefined} />);
  assert.match(html, /No se pudo cargar la consola/);
  assert.match(html, /Error de red/);
  assert.doesNotMatch(html, /Acceso denegado/);
});

test("authorized read-only user sees module state without an enabled mutation control", () => {
  const html = render(
    <AdminAccessModuleControl
      label="ProCV"
      description="CV y análisis ATS"
      checked
      isActive
      canManage={false}
      busy={false}
      onChange={() => undefined}
    />,
  );
  assert.match(html, /ProCV/);
  assert.match(html, /Solo lectura/);
  assert.match(html, /checked=""/);
  assert.match(html, /disabled=""/);
});

test("authorized manager sees a checked module control enabled for mutation", () => {
  const html = render(
    <AdminAccessModuleControl
      label="ProCV"
      description="CV y análisis ATS"
      checked
      isActive
      canManage
      busy={false}
      onChange={() => undefined}
    />,
  );
  assert.match(html, /checked=""/);
  assert.doesNotMatch(html, /disabled=""|Solo lectura/);
});
