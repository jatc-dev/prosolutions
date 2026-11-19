import React from "react";
import { Link } from "react-router-dom";

export function AdminAccessDeniedView() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section role="alert" className="max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm dark:border-rose-900 dark:bg-slate-900">
        <h1 className="text-2xl font-bold">Acceso denegado</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">Tu cuenta no tiene permiso para consultar el directorio de usuarios.</p>
        <Link to="/dashboard" className="mt-6 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Volver al portal</Link>
      </section>
    </main>
  );
}

export function AdminAccessErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section role="alert" className="max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm dark:border-amber-900 dark:bg-slate-900">
        <h1 className="text-2xl font-bold">No se pudo cargar la consola</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">{message}</p>
        <button type="button" onClick={onRetry} className="mt-6 rounded-xl bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900">Reintentar</button>
      </section>
    </main>
  );
}

export function AdminAccessLoadingView() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <p role="status" className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Verificando permisos de usuario…</p>
    </main>
  );
}

export function AdminAccessHeader() {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.15em] text-brand-800 dark:text-brand-300">ProIdentity · Administración</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Cuentas y permisos de módulos</h1>
      <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">Gestiona el acceso central de ProCV, ProJobs y los módulos futuros. Los permisos se guardan en ProIdentity; cada API los vuelve a validar.</p>
    </div>
  );
}

export function AdminAccessModuleControl({
  label,
  description,
  checked,
  isActive,
  canManage,
  busy,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  isActive: boolean;
  canManage: boolean;
  busy: boolean;
  onChange: (_enabled: boolean) => void;
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${checked ? "border-brand-300 bg-brand-50 dark:border-brand-950 dark:bg-brand-950/30" : "border-slate-200 dark:border-slate-800"} ${busy ? "opacity-60" : ""}`}>
      <input type="checkbox" checked={checked} disabled={busy || !isActive || !canManage} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 accent-brand-800" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{description}</span>
        <span className="mt-1 block text-xs font-medium">{checked ? "Acceso habilitado" : "Sin acceso"}{!canManage ? " · Solo lectura" : ""}</span>
      </span>
    </label>
  );
}
