import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, ProHeader } from "@prosolutions/ui";
import { useCoreLocale } from "../i18n";
import { identityAuthApiUrl } from "../identityApi";

const IDENTITY_API_URL = identityAuthApiUrl();

export function EmailVerificationPage() {
  const { locale, setLocale } = useCoreLocale();
  const language = locale === "es" ? "es" : "en";
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"checking" | "verified" | "error">(
    token ? "checking" : "error",
  );
  const [message, setMessage] = useState(
    token
      ? "Verificando tu correo..."
      : "El enlace de verificación no es válido o ha expirado.",
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    fetch(`${IDENTITY_API_URL}/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setStatus("error");
          setMessage(data.message || "No se pudo verificar el correo.");
          return;
        }
        if (data.accessToken) {
          try {
            sessionStorage.setItem("pro_identity_token", data.accessToken);
            window.location.assign("/dashboard");
            return;
          } catch {
            // Fall back to the sign-in page if browser storage is unavailable.
          }
        }
        setStatus("verified");
        setMessage("Correo verificado. Ya puedes iniciar sesión.");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          setMessage("No se pudo verificar el correo.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <ProHeader
        activeApp="core"
        locale={language}
        onLocaleChange={() => setLocale(locale === "es" ? "en" : "es")}
      />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Verificación de correo
          </h1>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{message}</p>
          {status !== "checking" && (
            <Button
              type="button"
              className="mt-6"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              Ir al inicio de sesión
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
