import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MODULES } from "../../../shared/config/platform";

/**
 * MobileMenu renders a hamburger menu for mobile screens (sm/md).
 * Allows users to switch between platform modules and navigate to the
 * template catalog. Hidden on desktop (md+).
 */
export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  const toggleMenu = () => setIsOpen((prev) => !prev);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={toggleMenu}
        className="md:hidden inline-flex items-center gap-2 p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        aria-label="Abrir menú de navegación"
        aria-expanded={isOpen}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16m-7 6h7"
          />
        </svg>
        <span className="text-xs font-medium">Menú</span>
      </button>

      {/* Mobile menu panel */}
      {isOpen && (
        <div
          className="md:hidden absolute z-50 mt-2 w-full max-w-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-4"
          role="menu"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand-600 text-white">
              <span className="text-sm font-bold">P</span>
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              ProSolutions
            </span>
          </div>

          <nav className="space-y-2" role="menu">
            {/* ProSolutions home */}
            <Link
              to="/"
              className={`block px-3 py-2 rounded-lg text-sm ${
                currentPath === "/"
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              role="menuitem"
            >
              Inicio
            </Link>

            {/* ProCV */}
            <Link
              to="/procv"
              className={`block px-3 py-2 rounded-lg text-sm ${
                currentPath.startsWith("/procv") && !currentPath.startsWith("/projobs")
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              role="menuitem"
            >
              ProCV
            </Link>

            {/* ProJobs */}
            <Link
              to="/projobs"
              className={`block px-3 py-2 rounded-lg text-sm ${
                currentPath.startsWith("/projobs")
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              role="menuitem"
            >
              ProJobs
            </Link>

            {/* Templates */}
            <Link
              to="/templates"
              className={`block px-3 py-2 rounded-lg text-sm ${
                currentPath === "/templates"
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              role="menuitem"
            >
              Catálogo de plantillas
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
