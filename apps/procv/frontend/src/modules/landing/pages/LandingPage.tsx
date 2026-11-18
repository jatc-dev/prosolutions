import React from "react";
import { BrandLogo } from "../../../components/BrandLogo";
import { ModuleCatalog } from "../../../modules/landing/components/ModuleCatalog";
import { ModuleNavigation } from "../../../shared/components/ui/ModuleNavigation";

/**
 * ProCV landing page with modular catalog of platform services.
 * Displays the brand, a module catalog (ProCV, ProJobs), and calls to action.
 */
export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 p-8">
      <BrandLogo variant="platform" size="large" hideSubtitle className="mb-8" />
      <ModuleNavigation />
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
        ProSolutions
      </h1>
      <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
        Tu plataforma profesional para crear CVs y encontrar empleo.
      </p>

      {/* Module catalog */}
      <ModuleCatalog />

      {/* Quick access links */}
      <div className="mt-12 flex flex-col sm:flex-row gap-4">
        <a
          href="https://procv.prosolutions.page/login" target="_blank" rel="noreferrer"
          className="inline-flex items-center px-6 py-3 bg-procv-600 text-white font-medium rounded-md hover:bg-procv-700 dark:bg-procv-500 dark:hover:bg-procv-800"
        >
          Crear CV gratis
        </a>
        <a
          href="https://projobs.prosolutions.page" target="_blank" rel="noreferrer"
          className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-800"
        >
          Ver empleos
        </a>
      </div>
    </div>
  );
}
