import React from 'react';
import { Eye, EyeOff, Plus } from 'lucide-react';
import { tx } from '../../uiText';
import { useTranslation } from 'react-i18next';
import { SectionType } from "../../../../shared/types";

export interface SectionStatus {
  /** Items in the section (0 = empty). */
  count: number;
  /** Section hidden from the CV (its data is kept). */
  hidden: boolean;
}

interface EditorTabsProps {
  activeSection: SectionType;
  onSectionChange: (section: SectionType) => void;
  completionStatus: Record<SectionType, boolean>;
  /** Enables the +/− control under each optional section. */
  sectionStatus?: Partial<Record<SectionType, SectionStatus>>;
  onSectionToggle?: (section: SectionType) => void;
  /** Validation errors per section, shown on its tab and under the progress bar. */
  errorCounts?: Partial<Record<SectionType, number>>;
}

const sections: { id: SectionType; label: string; icon: string; description: string }[] = [
  {
    id: 'personal',
    label: 'Personal',
    icon: 'user',
    description: 'Información básica y contacto'
  },
  {
    id: 'experience',
    label: 'Experiencia',
    icon: 'briefcase',
    description: 'Historial laboral'
  },
  {
    id: 'education',
    label: 'Educación',
    icon: 'graduation-cap',
    description: 'Formación académica'
  },
  {
    id: 'skills',
    label: 'Habilidades',
    icon: 'wrench',
    description: 'Competencias técnicas y blandas'
  },
  {
    id: 'languages',
    label: 'Idiomas',
    icon: 'globe',
    description: 'Dominio de idiomas'
  },
  {
    id: 'certificates',
    label: 'Certificados',
    icon: 'award',
    description: 'Certificaciones y reconocimientos'
  },
  {
    id: 'links',
    label: 'Enlaces',
    icon: 'external-link',
    description: 'Portafolio y redes sociales'
  },
  {
    id: 'references',
    label: 'Referencias',
    icon: 'users',
    description: 'Referencias laborales, personales y familiares'
  },
];

const getIconPath = (iconName: string) => {
  const icons: Record<string, string> = {
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    briefcase: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0V8a2 2 0 01-2 2H8a2 2 0 01-2-2V6m8 0H8',
    'graduation-cap': 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
    wrench: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    globe: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    award: 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z',
    'external-link': 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
    users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
  };

  return icons[iconName] || icons.user;
};

/**
 * "+ Agregar" (empty section), "− Ocultar" (section with data) or "+ Mostrar"
 * (hidden section). Hiding never deletes data. Personal info is always shown.
 */
function SectionToggle({ section, status, onToggle }: { section: { id: SectionType; label: string }; status?: SectionStatus; onToggle?: (section: SectionType) => void }) {
  const { t } = useTranslation();
  if (!onToggle || !status || section.id === 'personal') return null;
  const name = tx(`editor.tabs.${section.id}`, section.label).toLowerCase();
  const mode = status.hidden ? 'show' : status.count === 0 ? 'add' : 'hide';
  const label = mode === 'hide' ? t('editor.sectionToggle.hide', 'Ocultar') : mode === 'show' ? t('editor.sectionToggle.show', 'Mostrar') : t('editor.sectionToggle.add', 'Agregar');
  const aria = mode === 'hide'
    ? t('editor.sectionToggle.hideAria', { section: name, defaultValue: `Ocultar ${name} del CV (los datos se conservan)` })
    : mode === 'show'
      ? t('editor.sectionToggle.showAria', { section: name, defaultValue: `Volver a mostrar ${name} en el CV` })
      : t('editor.sectionToggle.addAria', { section: name, defaultValue: `Agregar ${name} al CV` });
  const Icon = mode === 'hide' ? EyeOff : mode === 'show' ? Eye : Plus;
  // Part of the tab pill (to its right), so it reads as the same element.
  return (
    <button
      type="button"
      onClick={() => onToggle(section.id)}
      aria-label={aria}
      title={aria}
      data-label={label}
      className={`mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${
        mode === 'hide'
          ? 'text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200'
          : 'text-brand-700 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-950/60'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export const EditorTabs: React.FC<EditorTabsProps> = ({
  activeSection,
  onSectionChange,
  completionStatus,
  sectionStatus,
  onSectionToggle,
  errorCounts,
}) => {
  const { t } = useTranslation();
  const withErrors = sections.filter((section) => (errorCounts?.[section.id] ?? 0) > 0);
  // Hidden sections leave the CV, so they do not count towards its progress.
  const counted = sections.filter((section) => !sectionStatus?.[section.id]?.hidden);
  const completed = counted.filter((section) => completionStatus[section.id]).length;
  return (
    <div className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-2 overflow-x-auto sm:gap-4" aria-label="Tabs">
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            const isCompleted = completionStatus[section.id];
            const isHidden = Boolean(sectionStatus?.[section.id]?.hidden);
            const errorCount = errorCounts?.[section.id] ?? 0;

            return (
              <div
                key={section.id}
                className={`my-2 inline-flex shrink-0 items-center rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-brand-50 ring-1 ring-inset ring-brand-200 dark:bg-brand-950/50 dark:ring-brand-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
              {/* One pill per section: the tab and, on its right, the hide /
                  show / add toggle (it used to sit below and look separate). */}
              <button
                onClick={() => onSectionChange(section.id)}
                aria-current={isActive ? 'step' : undefined}
                aria-describedby={errorCount ? `tab-errors-${section.id}` : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2 font-medium text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${isHidden ? 'opacity-60 ' : ''}${errorCount ? 'text-red-700 dark:text-red-400 ' : ''}${
                  isActive
                    ? 'text-brand-800 dark:text-brand-300'
                    : 'text-slate-500 hover:text-brand-800 dark:text-slate-400 dark:hover:text-brand-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {/* Icon with completion indicator */}
                  <div className="relative">
                    <svg
                      className={`w-5 h-5 ${
                        isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={getIconPath(section.icon)}
                      />
                    </svg>

                    {/* Completion checkmark */}
                    {isCompleted && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-2 h-2 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Section label */}
                  <span className={isHidden ? 'line-through' : undefined}>{tx(`editor.tabs.${section.id}`, section.label)}</span>
                  {errorCount ? (
                    <span id={`tab-errors-${section.id}`} title={t('editor.tabs.errorsTitle', { count: errorCount, defaultValue: `${errorCount} campo(s) por corregir` })} className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold leading-none text-white">
                      {errorCount}
                      <span className="sr-only"> {t('editor.tabs.errorsSr', 'campos por corregir')}</span>
                    </span>
                  ) : null}
                  {isHidden ? <span className="rounded bg-slate-100 px-1 text-[10px] font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">{t('editor.sectionToggle.hidden', 'Oculta')}</span> : null}

                  {/* Progress indicator for mobile */}
                  <div className="md:hidden">
                    {isCompleted ? (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    ) : (
                      <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                    )}
                  </div>
                </div>

                {/* Description tooltip on hover */}
                <div className="hidden group-hover:block absolute z-10 bg-slate-900 text-white text-xs rounded py-1 px-2 mt-1 whitespace-nowrap">
                  {tx(`editor.tabs.${section.id}Desc`, section.description)}
                </div>
              </button>
              <SectionToggle section={section} status={sectionStatus?.[section.id]} onToggle={onSectionToggle} />
              </div>
            );
          })}
        </nav>

        {/* Progress bar */}
        <div className="mt-2 mb-4">
          <div className="bg-brand-200 rounded-full h-2">
            <div
              className="bg-brand-800 h-2 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${counted.length ? (completed / counted.length) * 100 : 0}%`,
              }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>{tx('editor.tabs.progress', 'Progreso del CV')}</span>
            <span>
              {tx('editor.tabs.completed', '{{done}} de {{total}} secciones completadas', { done: completed, total: counted.length })}
            </span>
          </div>
          {withErrors.length ? (
            <p role="status" className="mt-2 text-xs font-medium text-red-700 dark:text-red-400">
              {t('editor.tabs.reviewPrefix', 'Revisa:')}{' '}
              {withErrors.map((section, index) => (
                <React.Fragment key={section.id}>
                  {index ? ', ' : ''}
                  <button type="button" onClick={() => onSectionChange(section.id)} className="underline underline-offset-2 hover:no-underline">
                    {tx(`editor.tabs.${section.id}`, section.label)} ({errorCounts?.[section.id]})
                  </button>
                </React.Fragment>
              ))}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// Mobile-optimized vertical tabs for smaller screens
const EditorTabsMobile: React.FC<EditorTabsProps> = ({
  activeSection,
  onSectionChange,
  completionStatus,
}) => {
  return (
    <div className="md:hidden bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-700">
      <div className="px-4 py-3">
        <div className="flex space-x-2 overflow-x-auto">
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            const isCompleted = completionStatus[section.id];

            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={`flex-shrink-0 flex flex-col items-center p-2 rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <div className="relative mb-1">
                  <svg
                    className={`w-6 h-6 ${
                      isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={getIconPath(section.icon)}
                    />
                  </svg>

                  {isCompleted && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-2 h-2 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                <span className="text-xs font-medium">{section.label}</span>
              </button>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-brand-700 h-1.5 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${(Object.values(completionStatus).filter(Boolean).length / sections.length) * 100}%`,
              }}
            ></div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
            {Object.values(completionStatus).filter(Boolean).length} de {sections.length} completadas
          </div>
        </div>
      </div>
    </div>
  );
};