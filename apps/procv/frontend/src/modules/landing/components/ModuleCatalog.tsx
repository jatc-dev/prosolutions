import React from "react";
import { ModuleCard } from "../../../shared/components/ui/ModuleCard";
import { MODULES } from "../../../shared/config/platform";

export interface ModuleCatalogProps {
  /** Whether to highlight the first module as primary */
  highlightFirst?: boolean;
}

/**
 * Renders a responsive grid of module cards based on the platform module registry.
 * Reads from shared/config/platform.ts (MODULES constant).
 */
export function ModuleCatalog({ highlightFirst = true }: ModuleCatalogProps) {
  return (
    <section className="py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {MODULES.map((module) => (
            <ModuleCard
              key={module.id}
              id={module.id}
              name={module.name}
              tagline={module.tagline}
              description={module.description}
              path={module.path}
              status={module.status}
              primary={highlightFirst && module.id === MODULES[0].id}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
