import { Button } from "@prosolutions/ui";
import { Building2, LogIn, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useSession } from "../lib/session";
import { EmptyState, Spinner } from "./primitives";

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">{children}</div>;
}

/** Renders children only for signed-in users with the given ProIdentity capability. */
export function RequireCapability({ capability, children }: { capability: "user" | "candidate" | "recruiter"; children: ReactNode }) {
  const { status, session, signIn } = useSession();

  if (status === "loading") {
    return (
      <Shell>
        <Spinner label="Verificando tu sesión" />
      </Shell>
    );
  }
  if (status === "anonymous" || !session) {
    return (
      <Shell>
        <EmptyState
          icon={<LogIn className="h-10 w-10" />}
          title="Inicia sesión para continuar"
          action={<Button onClick={signIn}>Iniciar sesión con ProSolutions</Button>}
        >
          Usa tu cuenta única de ProSolutions: la misma de ProCV.
        </EmptyState>
      </Shell>
    );
  }
  if (capability === "recruiter" && !session.isRecruiter) {
    return (
      <Shell>
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="Primero registra tu empresa"
          action={<a href="/empresa" className="font-semibold text-brand-800 underline dark:text-brand-300">Registrar mi empresa</a>}
        >
          Crea el perfil de tu empresa para publicar vacantes y gestionar candidatos. Es gratis y toma un minuto.
        </EmptyState>
      </Shell>
    );
  }
  if (capability === "candidate" && !session.isCandidate) {
    return (
      <Shell>
        <EmptyState icon={<ShieldAlert className="h-10 w-10" />} title="Tu cuenta no tiene acceso a ProJobs">
          Contacta a soporte de ProSolutions para habilitar el módulo ProJobs.
        </EmptyState>
      </Shell>
    );
  }
  return <>{children}</>;
}
