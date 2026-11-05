import React from "react";
import { Link, useLocation } from "react-router-dom";
import { MODULES } from "../../../shared/config/platform";
import { MobileMenu } from "./MobileMenu";

/**
 * ModuleNavigation renders a breadcrumb-style navigation bar showing the
 * available platform modules (ProCV, ProJobs, etc.) and the current location.
 * Helps users understand which module they are in and jump between them.
 */
export function ModuleNavigation() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <>
      <nav
        className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
        aria-label="Breadcrumbs"
      >
        <ol className="flex items-center gap-2" role="list">
          <li>
            <Link
              to="/"
              className={`hover:text-brand-600 dark:hover:text-brand-400 transition-colors ${
                currentPath === "/" ? "font-semibold text-brand-600 dark:text-brand-400" : ""
              }`}
            >
              ProSolutions
            </Link>
          </li>
          {MODULES.map((module) => (
            <li key={module.id} className="flex items-center gap-1">
              <span className="text-slate-300 dark:text-slate-600">&rsaquo;</span>
              <Link
                to={module.path}
                className={`hover:text-${isActive(module.path, currentPath) ? "brand-600" : "emerald-600"} dark:hover:text-${isActive(module.path, currentPath) ? "brand-400" : "emerald-400"} transition-colors ${isActive(module.path, currentPath) ? "font-semibold" : ""}`}
                aria-current={isActive(module.path, currentPath) ? "page" : undefined}
              >
                {module.name}
              </Link>
            </li>
          ))}
          <li>
            <span className="text-slate-500 dark:text-slate-600">
              {currentPath === "/templates" ? "Catálogo de plantillas" : "Catálogo de plantillas"}
            </span>
          </li>
        </ol>
      </nav>
      <MobileMenu />
    </>
  );
}

function isActive(modulePath: string, currentPath: string): boolean {
  return currentPath === modulePath;
}
