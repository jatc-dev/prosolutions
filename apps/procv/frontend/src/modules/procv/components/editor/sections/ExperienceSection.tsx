import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExperienceItem, EmploymentType, ValidationErrors } from "../../../../../shared/types";
import {
  FormSection,
  FormField,
  InputField,
  TextareaField,
  DateField,
  SelectField
} from "../FormSection";
import { getPrefixMatches } from "../utils/suggestions";

interface ExperienceSectionProps {
  data: ExperienceItem[];
  onChange: (data: ExperienceItem[]) => void;
  errors?: ValidationErrors;
  isLoading?: boolean;
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const EXPANDED_STORAGE_KEY = 'editor.expanded.experience';

const toCheckedBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  if (typeof value === 'number') return value === 1;
  return false;
};

const JOB_SUGGESTIONS = {
  es: [
    'Asesor Comercial',
    'Auxiliar Administrativo',
    'Auxiliar Contable',
    'Analista Financiero',
    'Coordinador de Logística',
    'Ejecutivo de Ventas',
    'Agente de Servicio al Cliente',
    'Auxiliar de Enfermería',
    'Docente',
    'Gerente de Proyecto',
    'Jefe de Recursos Humanos',
    'Supervisor de Producción',
  ],
  en: [
    'Sales Associate',
    'Administrative Assistant',
    'Accounting Assistant',
    'Financial Analyst',
    'Logistics Coordinator',
    'Account Executive',
    'Customer Service Agent',
    'Nursing Assistant',
    'Teacher',
    'Project Manager',
    'Human Resources Manager',
    'Production Supervisor',
  ],
};

const COMPANY_SUGGESTIONS = {
  es: [
    'Distribuidora del Norte S.A.',
    'Grupo Comercial Andino',
    'Clínica San Rafael',
    'Comercializadora Global Ltda.',
    'Servicios Integrales S.A.S.',
    'Constructora Horizonte',
    'Enterprise Solutions',
  ],
  en: [
    'Northern Distributors Inc.',
    'Andean Retail Group',
    'Saint Raphael Clinic',
    'Global Trading Ltd.',
    'Integrated Services LLC',
    'Horizon Builders',
    'Enterprise Solutions',
  ],
};

const TECHNOLOGY_SUGGESTIONS = {
  es: [
    'Microsoft Excel', 'Microsoft Word', 'PowerPoint', 'Google Workspace', 'Power BI', 'SAP',
    'Salesforce', 'HubSpot', 'Siigo', 'QuickBooks', 'Canva', 'Adobe Photoshop', 'Trello',
    'Atención al cliente', 'Ventas', 'Negociación', 'Gestión de inventarios', 'Facturación',
    'Contabilidad', 'Nómina', 'Gestión de proyectos', 'Liderazgo de equipos', 'Manejo de caja',
    'Logística', 'Redes sociales', 'Primeros auxilios', 'Seguridad y salud en el trabajo', 'Inglés',
  ],
  en: [
    'Microsoft Excel', 'Microsoft Word', 'PowerPoint', 'Google Workspace', 'Power BI', 'SAP',
    'Salesforce', 'HubSpot', 'QuickBooks', 'Canva', 'Adobe Photoshop', 'Trello',
    'Customer service', 'Sales', 'Negotiation', 'Inventory management', 'Invoicing',
    'Accounting', 'Payroll', 'Project management', 'Team leadership', 'Cash handling',
    'Logistics', 'Social media', 'First aid', 'Occupational health and safety', 'Spanish',
  ],
};

export const ExperienceSection: React.FC<ExperienceSectionProps> = ({
  data,
  onChange,
  errors = {},
  isLoading = false,
}) => {
  const { t, i18n } = useTranslation();
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = sessionStorage.getItem(EXPANDED_STORAGE_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [stored];
    } catch {
      return [stored];
    }
  });
  const locale = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
  const jobSuggestions = JOB_SUGGESTIONS[locale];
  const companySuggestions = COMPANY_SUGGESTIONS[locale];
  const technologySuggestions = TECHNOLOGY_SUGGESTIONS[locale];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (expandedItems.length > 0) {
      sessionStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(expandedItems));
      return;
    }
    sessionStorage.removeItem(EXPANDED_STORAGE_KEY);
  }, [expandedItems]);

  const toggleExpandedItem = (id: string) => {
    setExpandedItems((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  };

  const employmentTypeOptions: { value: string; label: string }[] = [
    { value: 'full-time', label: t('editor.experience.employmentTypes.fullTime') },
    { value: 'part-time', label: t('editor.experience.employmentTypes.partTime') },
    { value: 'freelance', label: t('editor.experience.employmentTypes.freelance') },
    { value: 'contract', label: t('editor.experience.employmentTypes.contract') },
    { value: 'internship', label: t('editor.experience.employmentTypes.internship') },
  ];

  const addExperience = () => {
    const newExperience: ExperienceItem = {
      id: generateId(),
      position: '',
      company: '',
      location: '',
      employmentType: 'full-time',
      startDate: '',
      endDate: '',
      isCurrentPosition: false,
      description: '',
      achievements: [],
      technologies: [],
      order: data.length,
    };
    onChange([...data, newExperience]);
    setExpandedItems((prev) => (prev.includes(newExperience.id) ? prev : [...prev, newExperience.id]));
  };

  const updateExperience = (id: string, updates: Partial<ExperienceItem>) => {
    const updatedData = data.map(exp =>
      exp.id === id ? { ...exp, ...updates } : exp
    );
    onChange(updatedData);
  };

  const removeExperience = (id: string) => {
    const filteredData = data.filter(exp => exp.id !== id);
    // Reorder remaining items
    const reorderedData = filteredData.map((exp, index) => ({
      ...exp,
      order: index,
    }));
    onChange(reorderedData);
  };

  const moveExperience = (id: string, direction: 'up' | 'down') => {
    const currentIndex = data.findIndex(exp => exp.id === id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === data.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newData = [...data];

    // Swap positions
    [newData[currentIndex], newData[newIndex]] = [newData[newIndex], newData[currentIndex]];

    // Update order values
    const reorderedData = newData.map((exp, index) => ({
      ...exp,
      order: index,
    }));

    onChange(reorderedData);
  };

  const addAchievement = (experienceId: string) => {
    const experience = data.find(exp => exp.id === experienceId);
    if (experience) {
      updateExperience(experienceId, {
        achievements: [...experience.achievements, ''],
      });
    }
  };

  const updateAchievement = (experienceId: string, achievementIndex: number, value: string) => {
    const experience = data.find(exp => exp.id === experienceId);
    if (experience) {
      const updatedAchievements = [...experience.achievements];
      updatedAchievements[achievementIndex] = value;
      updateExperience(experienceId, { achievements: updatedAchievements });
    }
  };

  const removeAchievement = (experienceId: string, achievementIndex: number) => {
    const experience = data.find(exp => exp.id === experienceId);
    if (experience) {
      const updatedAchievements = experience.achievements.filter((_, index) => index !== achievementIndex);
      updateExperience(experienceId, { achievements: updatedAchievements });
    }
  };

  const addTechnology = (experienceId: string, technology: string) => {
    const experience = data.find(exp => exp.id === experienceId);
    if (experience && !experience.technologies.includes(technology)) {
      updateExperience(experienceId, {
        technologies: [...experience.technologies, technology],
      });
    }
  };

  const removeTechnology = (experienceId: string, technology: string) => {
    const experience = data.find(exp => exp.id === experienceId);
    if (experience) {
      updateExperience(experienceId, {
        technologies: experience.technologies.filter(tech => tech !== technology),
      });
    }
  };

  const sortedData = [...data].sort((a, b) => a.order - b.order);
  const expandAllItems = () => setExpandedItems(sortedData.map((experience) => experience.id));
  const collapseAllItems = () => setExpandedItems([]);
  const allExpanded = sortedData.length > 0 && sortedData.every((experience) => expandedItems.includes(experience.id));
  const allCollapsed = expandedItems.length === 0;

  return (
    <FormSection
      title={t('editor.experience.title')}
      description={t('editor.experience.description')}
      errors={errors}
      isLoading={isLoading}
    >
      {sortedData.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={expandAllItems}
            disabled={allExpanded}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('editor.common.expandAll', { defaultValue: 'Expandir todo' })}
          </button>
          <button
            type="button"
            onClick={collapseAllItems}
            disabled={allCollapsed}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('editor.common.collapseAll', { defaultValue: 'Colapsar todo' })}
          </button>
        </div>
      )}

      {sortedData.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0V8a2 2 0 01-2 2H8a2 2 0 01-2-2V6m8 0H8" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-900">{t('editor.experience.emptyTitle')}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {t('editor.experience.emptyDescription')}
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={addExperience}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-700 hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-600"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('editor.experience.addExperience')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedData.map((experience, index) => (
            <div
              key={experience.id}
              className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden"
            >
              {/* Header */}
              <div
                className="px-6 py-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => toggleExpandedItem(experience.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {/* Drag handle */}
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600 p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement drag and drop
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </button>

                      {/* Position indicator */}
                      <span className="text-sm font-medium text-slate-500">#{experience.order + 1}</span>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-slate-900">
                        {experience.position || t('editor.experience.noPosition')}
                      </h4>
                      <p className="text-sm text-slate-600">
                        {experience.company || t('editor.experience.noCompany')}
                        {experience.location && ` • ${experience.location}`}
                      </p>
                    </div>

                    {experience.isCurrentPosition && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {t('editor.experience.current')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Move up/down buttons */}
                    <div className="flex flex-col space-y-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveExperience(experience.id, 'up');
                        }}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveExperience(experience.id, 'down');
                        }}
                        disabled={index === sortedData.length - 1}
                        className="text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Expand/collapse button */}
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <svg
                        className={`w-5 h-5 transition-transform ${expandedItems.includes(experience.id) ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(t('editor.experience.confirmDelete'))) {
                          removeExperience(experience.id);
                        }
                      }}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded content */}
              {expandedItems.includes(experience.id) && (
                <div className="editor-item-scroll px-6 py-6 space-y-6">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={experience.isVisible !== false} onChange={(event) => updateExperience(experience.id, { isVisible: event.target.checked })} />Mostrar esta experiencia en el CV</label>
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      label={t('editor.experience.fields.position')}
                      required
                      error={errors[`experience.${experience.id}.position`]?.[0]}
                    >
                      <>
                        <InputField
                          value={experience.position}
                          onChange={(value) => updateExperience(experience.id, { position: value })}
                          placeholder={t('editor.experience.placeholders.position')}
                          list={`experience-position-${experience.id}`}
                          required
                        />
                        <datalist id={`experience-position-${experience.id}`}>
                          {getPrefixMatches(jobSuggestions, experience.position, 8).map((suggestion) => (
                            <option key={suggestion} value={suggestion} />
                          ))}
                        </datalist>
                      </>
                    </FormField>

                    <FormField
                      label={t('editor.experience.fields.company')}
                      required
                      error={errors[`experience.${experience.id}.company`]?.[0]}
                    >
                      <>
                        <InputField
                          value={experience.company}
                          onChange={(value) => updateExperience(experience.id, { company: value })}
                          placeholder={t('editor.experience.placeholders.company')}
                          list={`experience-company-${experience.id}`}
                          required
                        />
                        <datalist id={`experience-company-${experience.id}`}>
                          {getPrefixMatches(companySuggestions, experience.company, 8).map((suggestion) => (
                            <option key={suggestion} value={suggestion} />
                          ))}
                        </datalist>
                      </>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <FormField
                      label={t('editor.experience.fields.location')}
                      error={errors[`experience.${experience.id}.location`]?.[0]}
                      help={t('editor.experience.help.location')}
                    >
                      <InputField
                        value={experience.location || ''}
                        onChange={(value) => updateExperience(experience.id, { location: value })}
                        placeholder={t('editor.experience.placeholders.location')}
                      />
                    </FormField>

                    <FormField
                      label={t('editor.experience.fields.employmentType')}
                      required
                    >
                      <SelectField
                        value={experience.employmentType}
                        onChange={(value) => updateExperience(experience.id, { employmentType: value as EmploymentType })}
                        options={employmentTypeOptions}
                        required
                      />
                    </FormField>

                    <FormField label={t('editor.experience.fields.currentJob')}>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={toCheckedBoolean(experience.isCurrentPosition as unknown)}
                          onChange={(e) => updateExperience(experience.id, {
                            isCurrentPosition: e.target.checked,
                            endDate: e.target.checked ? '' : experience.endDate
                          })}
                          className="rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                        />
                        <span className="ml-2 text-sm text-slate-700">{t('editor.experience.currentJobCheckbox')}</span>
                      </div>
                    </FormField>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      label={t('editor.experience.fields.startDate')}
                      required
                      error={errors[`experience.${experience.id}.startDate`]?.[0]}
                    >
                      <DateField
                        value={experience.startDate}
                        onChange={(value) => updateExperience(experience.id, { startDate: value })}
                        required
                       allowPartial/>
                    </FormField>

                    <FormField
                      label={t('editor.experience.fields.endDate')}
                      error={errors[`experience.${experience.id}.endDate`]?.[0]}
                    >
                      <DateField
                        value={experience.endDate || ''}
                        onChange={(value) => updateExperience(experience.id, { endDate: value })}
                        disabled={toCheckedBoolean(experience.isCurrentPosition as unknown)}
                       allowPartial/>
                      {toCheckedBoolean(experience.isCurrentPosition as unknown) && (
                        <p className="text-xs text-slate-500 mt-1">{t('editor.experience.untilCurrentDate')}</p>
                      )}
                    </FormField>
                  </div>

                  {/* Description */}
                  <FormField
                    label={t('editor.experience.fields.jobDescription')}
                    error={errors[`experience.${experience.id}.description`]?.[0]}
                    help={t('editor.experience.help.jobDescription')}
                  >
                    <TextareaField
                      value={experience.description}
                      onChange={(value) => updateExperience(experience.id, { description: value })}
                      placeholder={t('editor.experience.placeholders.jobDescription')}
                      rows={4}
                    />
                  </FormField>

                  {/* Achievements */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium text-slate-700">{t('editor.experience.achievementsTitle')}</h5>
                      <button
                        type="button"
                        onClick={() => addAchievement(experience.id)}
                        className="inline-flex items-center px-2 py-1 border border-slate-300 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {t('editor.experience.addAchievement')}
                      </button>
                    </div>

                    {experience.achievements.map((achievement, achievementIndex) => (
                      <div key={achievementIndex} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center mt-1">
                          <span className="text-xs font-medium text-brand-700">{achievementIndex + 1}</span>
                        </div>
                        <div className="flex-1">
                          <TextareaField
                            value={achievement}
                            onChange={(value) => updateAchievement(experience.id, achievementIndex, value)}
                            placeholder={t('editor.experience.placeholders.achievement')}
                            rows={2}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAchievement(experience.id, achievementIndex)}
                          className="text-red-400 hover:text-red-600 p-1 mt-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}

                    {experience.achievements.length === 0 && (
                      <p className="text-sm text-slate-500 italic">
                        {t('editor.experience.emptyAchievements')}
                      </p>
                    )}
                  </div>

                  {/* Technologies */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium text-slate-700">{t('editor.experience.technologiesTitle')}</h5>
                    </div>

                    {/* Current technologies */}
                    <div className="flex flex-wrap gap-2">
                      {experience.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-brand-100 text-brand-900"
                        >
                          {tech}
                          <button
                            type="button"
                            onClick={() => removeTechnology(experience.id, tech)}
                            className="ml-2 text-brand-700 hover:text-brand-900"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Add technology */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t('editor.experience.placeholders.searchTechnology')}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;
                            if (input.value.trim()) {
                              addTechnology(experience.id, input.value.trim());
                              input.value = '';
                            }
                          }
                        }}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-600 focus:border-brand-600 sm:text-sm"
                      />
                      {/* Technology suggestions */}
                      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-300 rounded-md shadow-lg max-h-32 overflow-y-auto">
                        {technologySuggestions
                          .filter(tech => !experience.technologies.includes(tech))
                          .slice(0, 8)
                          .map(tech => (
                            <button
                              key={tech}
                              type="button"
                              onClick={() => addTechnology(experience.id, tech)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm"
                            >
                              {tech}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add new experience button */}
          <div className="flex justify-center pt-6">
            <button
              type="button"
              onClick={addExperience}
              className="inline-flex items-center px-6 py-3 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-600"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('editor.experience.addAnotherExperience')}
            </button>
          </div>
        </div>
      )}

    </FormSection>
  );
};