import React from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "../../../components/BrandLogo";

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 p-8">
      <BrandLogo variant="platform" size="large" hideSubtitle className="mb-6" />
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
        ProSolutions
      </h1>
      <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
        Tu plataforma profesional para crear CVs y encontrar empleos tech.
      </p>
      <div className="flex gap-4">
        <Link
          to="/procv"
          className="inline-flex items-center px-6 py-3 bg-procv-600 text-white font-medium rounded-md hover:bg-procv-700 dark:bg-procv-500 dark:hover:bg-procv-800"
        >
          Explorar ProCV
        </Link>
        <Link
          to="/projobs"
          className="inline-flex items-center px-6 py-3 bg-projobs-600 text-white font-medium rounded-md hover:bg-projobs-700 dark:bg-projobs-500 dark:hover:bg-projobs-800"
        >
          Ver empleos tech
        </Link>
      </div>
    </div>
  );
}
