import React from 'react';
import { Lightbulb } from 'lucide-react';
import { SectionType } from "../../../../../shared/types";
import { useCVEditorStore } from "../../../../../shared/stores/cvEditorStore";

interface TemplateSuggestionsProps {
  section: SectionType;
}

export const TemplateSuggestions: React.FC<TemplateSuggestionsProps> = ({ section }) => {
  const { templates, applyTemplate } = useCVEditorStore();

  const sectionTemplates = templates[section];

  if (!sectionTemplates || Object.keys(sectionTemplates).length === 0) {
    return null;
  }

  const getSectionTitle = (section: SectionType) => {
    const titles = {
      personal: 'Información Personal',
      experience: 'Experiencia Laboral',
      education: 'Educación',
      skills: 'Habilidades',
      languages: 'Idiomas',
      certificates: 'Certificaciones',
      links: 'Enlaces',
    };
    return titles[section] || section;
  };

  return (
    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
      <div className="flex items-center justify-between mb-3">
        <h4 className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-200">
          <Lightbulb className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          Plantillas para {getSectionTitle(section)}
        </h4>
        <span className="text-xs text-blue-600 dark:text-blue-300">
          {Object.keys(sectionTemplates).length} plantillas disponibles
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(sectionTemplates).map(([templateId, template]) => (
          <button
            key={templateId}
            onClick={() => applyTemplate(templateId, section)}
            className="group rounded-md border border-blue-200 bg-white p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize text-gray-900 dark:text-slate-100">
                  {templateId.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-slate-300">
                  {(template as any).description || 'Plantilla predefinida con contenido de ejemplo'}
                </p>
              </div>

              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};