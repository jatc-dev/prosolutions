import { useCallback, useEffect, useState } from "react";
import qrcode from "qrcode-generator";
import { identityRequest } from "../preferencesApi";

type Status = { enabled: boolean; enabledAt: string | null; recoveryCodesLeft: number; available: boolean };
type Stage = { kind: "idle" } | { kind: "setup"; secret: string; otpauthUrl: string } | { kind: "codes"; codes: string[] } | { kind: "confirm"; action: "disable" | "regenerate" };

/** Groups a base32 secret in blocks of four so it can be typed by hand. */
export function formatSecret(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

/** Dark modules of a QR code (error correction M), as SVG path data. */
export function qrPath(text: string): { size: number; d: string } {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  let d = "";
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
  }
  return { size, d };
}

/** Always dark on white with a quiet zone, so phones can scan it in dark mode too. */
export function QrCode({ text, label }: { text: string; label: string }) {
  const { size, d } = qrPath(text);
  const quiet = 4;
  return (
    <svg role="img" aria-label={label} viewBox={`${-quiet} ${-quiet} ${size + quiet * 2} ${size + quiet * 2}`} className="h-48 w-48 rounded-lg" shapeRendering="crispEdges">
      <rect x={-quiet} y={-quiet} width={size + quiet * 2} height={size + quiet * 2} fill="#ffffff" />
      <path d={d} fill="#000000" />
    </svg>
  );
}

/**
 * Optional two-step verification for the signed-in account: set up with an
 * authenticator app, show recovery codes once, regenerate or turn it off.
 */
export function MfaSettings({ english }: { english: boolean }) {
  const t = (es: string, en: string) => (english ? en : es);
  const [status, setStatus] = useState<Status | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (path: string, body?: unknown) => {
    const response = await identityRequest(`/api/auth/mfa${path}`, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Error ${response.status}`);
    return data;
  }, []);

  const load = useCallback(async () => {
    try { setStatus(await call("")); } catch { setStatus(null); }
  }, [call]);
  useEffect(() => { void load(); }, [load]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); setCode(""); }
  };

  const startSetup = () => run(async () => {
    const data = await call("/setup", {});
    setStage({ kind: "setup", secret: data.secret, otpauthUrl: data.otpauthUrl });
  });
  const confirmSetup = () => run(async () => {
    const data = await call("/enable", { code });
    setStage({ kind: "codes", codes: data.recoveryCodes });
    await load();
  });
  const confirmAction = (action: "disable" | "regenerate") => run(async () => {
    if (action === "disable") {
      await call("/disable", { code });
      setStage({ kind: "idle" });
    } else {
      const data = await call("/recovery-codes", { code });
      setStage({ kind: "codes", codes: data.recoveryCodes });
    }
    await load();
  });

  if (!status) return null;
  const box = "mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900";
  const primary = "rounded-xl bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-50";
  const secondary = "rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800";
  const codeInput = (
    <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456"
      aria-label={t("Código de 6 dígitos", "6-digit code")} className="w-36 rounded-lg border border-slate-300 bg-white px-3 py-2 text-center font-mono tracking-widest dark:border-slate-600 dark:bg-slate-950" />
  );

  return (
    <section aria-labelledby="mfa-title" className={box}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="mfa-title" className="text-lg font-semibold">{t("Verificación en dos pasos", "Two-step verification")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{t("Además de tu contraseña (o Google), pediremos un código de una app de autenticación como Google Authenticator, Microsoft Authenticator o 1Password.", "Besides your password (or Google), we will ask for a code from an authenticator app such as Google Authenticator, Microsoft Authenticator or 1Password.")}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.enabled ? "bg-brand-100 text-brand-900 dark:bg-brand-950/50 dark:text-brand-200" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
          {status.enabled ? t("Activada", "On") : t("Desactivada", "Off")}
        </span>
      </div>
      {error ? <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p> : null}

      {stage.kind === "codes" ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="font-semibold text-amber-900 dark:text-amber-100">{t("Guarda estos códigos de respaldo ahora. No los volveremos a mostrar.", "Save these recovery codes now. We will not show them again.")}</p>
          <p className="mt-1 text-amber-900 dark:text-amber-100">{t("Cada uno sirve una vez si pierdes el teléfono.", "Each one works once if you lose your phone.")}</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 font-mono sm:grid-cols-5">{stage.codes.map((value) => <li key={value} className="rounded bg-white px-2 py-1 text-center dark:bg-slate-900">{value}</li>)}</ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={secondary} onClick={() => void navigator.clipboard?.writeText(stage.codes.join("\n"))}>{t("Copiar", "Copy")}</button>
            <button type="button" className={secondary} onClick={() => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([`ProSolutions — ${t("códigos de respaldo", "recovery codes")}\n\n${stage.codes.join("\n")}\n`], { type: "text/plain" })); link.download = "prosolutions-codigos-respaldo.txt"; link.click(); URL.revokeObjectURL(link.href); }}>{t("Descargar .txt", "Download .txt")}</button>
            <button type="button" className={primary} onClick={() => setStage({ kind: "idle" })}>{t("Ya los guardé", "I saved them")}</button>
          </div>
        </div>
      ) : stage.kind === "setup" ? (
        <ol className="mt-5 list-decimal space-y-4 pl-5 text-sm">
          <li>
            {t("Escanea este código con tu app de autenticación:", "Scan this code with your authenticator app:")}
            <div className="mt-2"><QrCode text={stage.otpauthUrl} label={t("Código QR para la app de autenticación", "QR code for the authenticator app")} /></div>
            <p className="mt-3">{t("¿No puedes escanearlo? Añade la cuenta con esta clave:", "Can't scan it? Add the account with this key:")}</p>
            <code className="mt-2 block w-fit rounded-lg bg-slate-100 px-3 py-2 font-mono text-base tracking-wider dark:bg-slate-800">{formatSecret(stage.secret)}</code>
            <a href={stage.otpauthUrl} className="mt-2 inline-block text-brand-800 underline dark:text-brand-300">{t("¿Estás en el teléfono? Abrir en la app", "On your phone? Open in the app")}</a>
          </li>
          <li>
            {t("Escribe el código de 6 dígitos que muestra la app:", "Enter the 6-digit code the app shows:")}
            <div className="mt-2 flex flex-wrap gap-2">{codeInput}
              <button type="button" disabled={busy || code.length !== 6} onClick={() => void confirmSetup()} className={primary}>{t("Activar", "Turn on")}</button>
              <button type="button" disabled={busy} onClick={() => setStage({ kind: "idle" })} className={secondary}>{t("Cancelar", "Cancel")}</button>
            </div>
          </li>
        </ol>
      ) : stage.kind === "confirm" ? (
        <div className="mt-5 text-sm">
          <p>{stage.action === "disable"
            ? t("Para desactivarla, escribe un código de tu app (o un código de respaldo).", "To turn it off, enter a code from your app (or a recovery code).")
            : t("Para generar códigos nuevos, escribe un código de tu app. Los anteriores dejarán de servir.", "To generate new codes, enter a code from your app. The old ones will stop working.")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {stage.action === "disable"
              ? <input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" aria-label={t("Código", "Code")} placeholder="123456 / XXXXX-XXXXX" className="w-52 rounded-lg border border-slate-300 bg-white px-3 py-2 text-center font-mono dark:border-slate-600 dark:bg-slate-950" />
              : codeInput}
            <button type="button" disabled={busy || !code} onClick={() => void confirmAction(stage.action)} className={stage.action === "disable" ? "rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300" : primary}>
              {stage.action === "disable" ? t("Desactivar", "Turn off") : t("Generar códigos", "Generate codes")}
            </button>
            <button type="button" disabled={busy} onClick={() => setStage({ kind: "idle" })} className={secondary}>{t("Cancelar", "Cancel")}</button>
          </div>
        </div>
      ) : status.enabled ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-slate-600 dark:text-slate-300">{t(`Quedan ${status.recoveryCodesLeft} códigos de respaldo.`, `${status.recoveryCodesLeft} recovery codes left.`)}</span>
          <button type="button" onClick={() => setStage({ kind: "confirm", action: "regenerate" })} className={secondary}>{t("Nuevos códigos de respaldo", "New recovery codes")}</button>
          <button type="button" onClick={() => setStage({ kind: "confirm", action: "disable" })} className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300">{t("Desactivar", "Turn off")}</button>
        </div>
      ) : status.available ? (
        <button type="button" disabled={busy} onClick={() => void startSetup()} className={`mt-5 ${primary}`}>{t("Activar verificación en dos pasos", "Turn on two-step verification")}</button>
      ) : (
        <p className="mt-5 text-sm text-slate-500">{t("No disponible por ahora.", "Not available right now.")}</p>
      )}
    </section>
  );
}
