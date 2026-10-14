import React from "react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white/80 py-6 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="ui-container">
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-300">
          <span>Engineering by</span>
          <a
            className="font-medium text-brand-500 transition-colors hover:text-brand-600 hover:underline dark:text-brand-300 dark:hover:text-brand-200"
            href="https://jatc.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            jatc.dev
          </a>
        </div>
      </div>
    </footer>
  );
}
