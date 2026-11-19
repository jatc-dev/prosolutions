import React, { useState } from "react";
import { CURATED_CV_TEMPLATES } from "../../../utils/templateCatalog";
import { TemplateCard } from "../components/TemplateCard";

/**
 * Template gallery page with quick category filters.
 * Renders all curated CV templates as filterable cards.
 */
export function TemplatesGallery() {
  const categories = [
    { id: "all", label: "Todos" },
    ...Array.from(new Set(CURATED_CV_TEMPLATES.map((t) => t.category))).map((cat) => ({
      id: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
    })),
  ];

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const filteredTemplates = CURATED_CV_TEMPLATES.filter(
    (t) => selectedCategory === "all" || t.category === selectedCategory
  );

  return (
    <section className="py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-10 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Plantillas de CV
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Elige una plantilla profesional y comienza a crear tu currículum.
            </p>
          </div>

          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-brand-800 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.key}
              template={template}
              selected={selectedTemplate === template.key}
              onSelect={() => setSelectedTemplate(template.key)}
            />
          ))}
        </div>

        {/* Empty state */}
        {filteredTemplates.length === 0 && (
          <div className="mt-12 flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No se encontraron plantillas para esta categoría.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
