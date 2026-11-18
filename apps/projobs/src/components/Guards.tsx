import { Button } from "@prosolutions/ui";
import { Building2, LogIn, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useSession } from "../lib/session";
import { EmptyState, Spinner } from "./primitives";

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">{children}</div>;
}

/** Renders children only for signed-in users with the given ProIdentity capability. */
export function RequireCapability({ capability, children }: { capability: "candidate" | "recruiter"; children: ReactNode }) {
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
        <EmptyState icon={<Building2 className="h-10 w-10" />} title="Panel exclusivo para empresas">
          Tu cuenta aún no tiene acceso de reclutador. Solicítalo a un administrador de ProSolutions: se habilita con el módulo
          <strong> PRORECRUIT</strong> en tu cuenta.
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
