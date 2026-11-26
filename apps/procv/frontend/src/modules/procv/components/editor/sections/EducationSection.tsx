import React, { useEffect, useState } from 'react';
import { tx } from '../../../uiText';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { EducationItem, ValidationErrors } from "../../../../../shared/types";
import {
  FormSection,
  FormField,
  InputField,
  TextareaField,
  DateField
} from "../FormSection";
import { getPrefixMatches } from "../utils/suggestions";

interface EducationSectionProps {
  data: EducationItem[];
  onChange: (data: EducationItem[]) => void;
  errors?: ValidationErrors;
  isLoading?: boolean;
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const EXPANDED_STORAGE_KEY = 'editor.expanded.education';

const toCheckedBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  if (typeof value === 'number') return value === 1;
  return false;
};

const FIELD_OF_STUDY_SUGGESTIONS = {
  es: [
    'Ingeniería de Sistemas',
    'Ingeniería Industrial',
    'Administración de Empresas',
    'Contaduría Pública',
    'Derecho',
    'Medicina',
    'Psicología',
    'Arquitectura',
    'Diseño Gráfico',
    'Marketing',
    'Economía',
    'Ciencias de la Computación',
    'Matemáticas',
    'Física',
    'Química',
    'Biología',
    'Educación',
    'Comunicación Social',
    'Periodismo',
    'Ingeniería Civil',
    'Ingeniería Mecánica',
    'Ingeniería Eléctrica',
    'Enfermería',
    'Nutrición',
    'Veterinaria',
  ],
  en: [
    'Computer Engineering',
    'Industrial Engineering',
    'Business Administration',
    'Accounting',
    'Law',
    'Medicine',
    'Psychology',
    'Architecture',
    'Graphic Design',
    'Marketing',
    'Economics',
    'Computer Science',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Education',
    'Communication',
    'Journalism',
    'Civil Engineering',
    'Mechanical Engineering',
    'Electrical Engineering',
    'Nursing',
    'Nutrition',
    'Veterinary Medicine',
  ],
};

const INSTITUTION_SUGGESTIONS = {
  es: [
    'Universidad Nacional de Colombia',
    'Universidad de los Andes',
    'Pontificia Universidad Javeriana',
    'Universidad Externado de Colombia',
    'Universidad del Rosario',
    'Universidad de Antioquia',
    'Universidad Industrial de Santander',
    'Universidad del Valle',
    'Escuela Colombiana de Ingeniería',
    'Politécnico Grancolombiano',
    'Corporación Universitaria Minuto de Dios',
    'Fundación Universitaria Konrad Lorenz',
    'Universidad EAFIT',
    'Universidad ICESI',
  ],
  en: [
    'National University of Colombia',
    'University of the Andes',
    'Pontifical Xavierian University',
    'Externado University of Colombia',
    'Rosario University',
    'University of Antioquia',
    'Industrial University of Santander',
    'University of Valle',
    'Colombian School of Engineering',
    'Grancolombiano Polytechnic',
    'Minuto de Dios University Corporation',
    'Konrad Lorenz University Foundation',
    'EAFIT University',
    'ICESI University',
  ],
};

export const EducationSection: React.FC<EducationSectionProps> = ({
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
  const [gpaDrafts, setGpaDrafts] = useState<Record<string, string>>({});
  const locale = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
  const fieldOfStudySuggestions = FIELD_OF_STUDY_SUGGESTIONS[locale];
  const institutionSuggestions = INSTITUTION_SUGGESTIONS[locale];

  useEffect(() => {
    setGpaDrafts((prev) => {
      const next: Record<string, string> = {};
      data.forEach((item) => {
        const key = String(item.id ?? '');
        if (Object.prototype.hasOwnProperty.call(prev, key)) {
          next[key] = prev[key];
        } else {
          next[key] = typeof item.gpa === 'string' ? item.gpa : String(item.gpa ?? '');
        }
      });
      return next;
    });
  }, [data]);

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

  const degreeTypes = [
    { value: 'high-school', label: t('editor.education.degreeTypes.highSchool') },
    { value: 'associate', label: t('editor.education.degreeTypes.associate') },
    { value: 'bachelor', label: t('editor.education.degreeTypes.bachelor') },
    { value: 'master', label: t('editor.education.degreeTypes.master') },
    { value: 'doctorate', label: t('editor.education.degreeTypes.doctorate') },
    { value: 'post-doctorate', label: t('editor.education.degreeTypes.postDoctorate') },
    { value: 'certificate', label: t('editor.education.degreeTypes.certificate') },
    { value: 'diploma', label: t('editor.education.degreeTypes.diploma') },
    { value: 'other', label: t('editor.education.degreeTypes.other') },
  ];

  const getDegreeLabel = (degreeValue?: string) => {
    const value = String(degreeValue || '');
    if (!value) return '';
    const found = degreeTypes.find((degreeType) => degreeType.value === value);
    return found?.label || value;
  };

  const addEducation = () => {
    const newEducation: EducationItem = {
      id: generateId(),
      degree: '',
      institution: '',
      location: '',
      fieldOfStudy: '',
      startDate: '',
      endDate: '',
      isCurrentlyStudying: false,
      gpa: '',
      activities: [],
      achievements: [],
      order: data.length,
    };
    onChange([...data, newEducation]);
    setExpandedItems((prev) => (prev.includes(newEducation.id) ? prev : [...prev, newEducation.id]));
  };

  const updateEducation = (id: string, updates: Partial<EducationItem>) => {
    const targetId = String(id ?? '');
    const updatedData = data.map(edu =>
      String((edu as EducationItem).id ?? '') === targetId ? { ...edu, ...updates } : edu
    );
    onChange(updatedData);
  };

  const removeEducation = (id: string) => {
    const filteredData = data.filter(edu => edu.id !== id);
    // Reorder remaining items
    const reorderedData = filteredData.map((edu, index) => ({
      ...edu,
      order: index,
    }));
    onChange(reorderedData);
  };

  const moveEducation = (id: string, direction: 'up' | 'down') => {
    const currentIndex = data.findIndex(edu => edu.id === id);
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
    const reorderedData = newData.map((edu, index) => ({
      ...edu,
      order: index,
    }));

    onChange(reorderedData);
  };

  const addActivity = (educationId: string) => {
    const education = data.find(edu => edu.id === educationId);
    if (education) {
      updateEducation(educationId, {
        activities: [...education.activities, ''],
      });
    }
  };

  const updateActivity = (educationId: string, activityIndex: number, value: string) => {
    const education = data.find(edu => edu.id === educationId);
    if (education) {
      const updatedActivities = [...education.activities];
      updatedActivities[activityIndex] = value;
      updateEducation(educationId, { activities: updatedActivities });
    }
  };

  const removeActivity = (educationId: string, activityIndex: number) => {
    const education = data.find(edu => edu.id === educationId);
    if (education) {
      const updatedActivities = education.activities.filter((_, index) => index !== activityIndex);
      updateEducation(educationId, { activities: updatedActivities });
    }
  };

  const addAchievement = (educationId: string) => {
    const education = data.find(edu => edu.id === educationId);
    if (education) {
      updateEducation(educationId, {
        achievements: [...education.achievements, ''],
      });
    }
  };

  const updateAchievement = (educationId: string, achievementIndex: number, value: string) => {
    const education = data.find(edu => edu.id === educationId);
    if (education) {
      const updatedAchievements = [...education.achievements];
      updatedAchievements[achievementIndex] = value;
      updateEducation(educationId, { achievements: updatedAchievements });
    }
  };

  const removeAchievement = (educationId: string, achievementIndex: number) => {
    const education = data.find(edu => edu.id === educationId);
    if (education) {
      const updatedAchievements = education.achievements.filter((_, index) => index !== achievementIndex);
      updateEducation(educationId, { achievements: updatedAchievements });
    }
  };

  const sortedData = [...data].sort((a, b) => a.order - b.order);
  const expandAllItems = () => setExpandedItems(sortedData.map((education) => education.id));
  const collapseAllItems = () => setExpandedItems([]);
  const allExpanded = sortedData.length > 0 && sortedData.every((education) => expandedItems.includes(education.id));
  const allCollapsed = expandedItems.length === 0;

  return (
    <FormSection
      title={t('editor.education.title')}
      description={t('editor.education.description')}
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-900">{t('editor.education.emptyTitle')}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {t('editor.education.emptyDescription')}
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={addEducation}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-700 hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-600"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('editor.education.addEducation')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedData.map((education, index) => (
            <div
              key={education.id}
              className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden"
            >
              {/* Header */}
              <div
                className="px-6 py-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => toggleExpandedItem(education.id)}
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
                      <span className="text-sm font-medium text-slate-500">#{education.order + 1}</span>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-slate-900">
                        {getDegreeLabel(education.degree) || t('editor.education.noDegree')}
                      </h4>
                      <p className="text-sm text-slate-600">
                        {education.institution || t('editor.education.noInstitution')}
                        {education.fieldOfStudy && ` • ${education.fieldOfStudy}`}
                      </p>
                    </div>

                    {education.isCurrentlyStudying && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {t('editor.education.inProgress')}
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
                          moveEducation(education.id, 'up');
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
                          moveEducation(education.id, 'down');
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
                        className={`w-5 h-5 transition-transform ${expandedItems.includes(education.id) ? 'rotate-180' : ''}`}
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
                        if (window.confirm(t('editor.education.confirmDelete'))) {
                          removeEducation(education.id);
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
              {expandedItems.includes(education.id) && (
                <div className="editor-item-scroll px-6 py-6 space-y-6">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={education.isVisible !== false} onChange={(event) => updateEducation(education.id, { isVisible: event.target.checked })} />{tx('editor.ui.showEducation', 'Mostrar esta formación en el CV')}</label>
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      label={t('editor.education.fields.degree')}
                      required
                      error={errors[`education.${education.id}.degree`]?.[0]}
                      help={t('editor.education.help.degree')}
                    >
                      <select
                        value={education.degree}
                        onChange={(e) => updateEducation(education.id, { degree: e.target.value })}
                        required
                        className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-600 focus:border-brand-600 sm:text-sm"
                      >
                        <option value="">{t('editor.education.selectDegreeType')}</option>
                        {degreeTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField
                      label={t('editor.education.fields.fieldOfStudy')}
                      error={errors[`education.${education.id}.fieldOfStudy`]?.[0]}
                      help={t('editor.education.help.fieldOfStudy')}
                    >
                      <>
                        <InputField
                          value={education.fieldOfStudy}
                          onChange={(value) => updateEducation(education.id, { fieldOfStudy: value })}
                          placeholder={t('editor.education.placeholders.fieldOfStudy')}
                          list={`education-field-${education.id}`}
                        />
                        <datalist id={`education-field-${education.id}`}>
                          {getPrefixMatches(fieldOfStudySuggestions, education.fieldOfStudy).map((suggestion) => (
                            <option key={suggestion} value={suggestion} />
                          ))}
                        </datalist>
                      </>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      label={t('editor.education.fields.institution')}
                      required
                      error={errors[`education.${education.id}.institution`]?.[0]}
                    >
                      <>
                        <InputField
                          value={education.institution}
                          onChange={(value) => updateEducation(education.id, { institution: value })}
                          placeholder={t('editor.education.placeholders.institution')}
                          list={`education-institution-${education.id}`}
                          required
                        />
                        <datalist id={`education-institution-${education.id}`}>
                          {getPrefixMatches(institutionSuggestions, education.institution, 8).map((suggestion) => (
                            <option key={suggestion} value={suggestion} />
                          ))}
                        </datalist>
                      </>
                    </FormField>

                    <FormField
                      label={t('editor.education.fields.location')}
                      error={errors[`education.${education.id}.location`]?.[0]}
                      help={t('editor.education.help.location')}
                    >
                      <InputField
                        value={education.location || ''}
                        onChange={(value) => updateEducation(education.id, { location: value })}
                        placeholder={t('editor.education.placeholders.location')}
                      />
                    </FormField>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    {/* Optional: for studies the end (graduation) date is what matters. */}
                    <FormField
                      label={t('editor.education.fields.startDate')}
                      help={t('editor.education.help.startDateOptional', 'Opcional')}
                      error={errors[`education.${education.id}.startDate`]?.[0]}
                    >
                      <DateField
                        value={education.startDate}
                        onChange={(value) => updateEducation(education.id, { startDate: value })}
                       allowPartial/>
                    </FormField>

                    <FormField
                      label={t('editor.education.fields.endDate')}
                      error={errors[`education.${education.id}.endDate`]?.[0]}
                    >
                      <DateField
                        value={education.endDate || ''}
                        onChange={(value) => updateEducation(education.id, { endDate: value })}
                        disabled={toCheckedBoolean(education.isCurrentlyStudying as unknown)}
                       allowPartial/>
                      {toCheckedBoolean(education.isCurrentlyStudying as unknown) && (
                        <p className="text-xs text-slate-500 mt-1">{t('editor.education.untilCurrentDate')}</p>
                      )}
                    </FormField>

                    <FormField label={t('editor.education.fields.currentlyStudying')}>
                      <div className="flex items-center mt-6">
                        <input
                          type="checkbox"
                          checked={toCheckedBoolean(education.isCurrentlyStudying as unknown)}
                          onChange={(e) => updateEducation(education.id, {
                            isCurrentlyStudying: e.target.checked,
                            endDate: e.target.checked ? '' : education.endDate
                          })}
                          className="rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                        />
                        <span className="ml-2 text-sm text-slate-700">{t('editor.education.currentlyStudyingCheckbox')}</span>
                      </div>
                    </FormField>
                  </div>

                  {/* GPA */}
                  <FormField
                    label={t('editor.education.fields.gpa')}
                    error={errors[`education.${education.id}.gpa`]?.[0]}
                    help={t('editor.education.help.gpa')}
                  >
                    <InputField
                      value={gpaDrafts[String(education.id ?? '')] ?? (typeof education.gpa === 'string' ? education.gpa : String(education.gpa ?? ''))}
                      onChange={(value) => {
                        const key = String(education.id ?? '');
                        setGpaDrafts((prev) => ({ ...prev, [key]: value }));
                        updateEducation(education.id, { gpa: value });
                      }}
                      onBlur={() => {
                        const key = String(education.id ?? '');
                        updateEducation(education.id, { gpa: gpaDrafts[key] ?? '' });
                        toast.success(
                          locale === 'es'
                            ? 'Promedio academico actualizado. Se guardara automaticamente.'
                            : 'Academic average updated. It will be auto-saved.'
                        );
                      }}
                      placeholder={t('editor.education.placeholders.gpa')}
                    />
                  </FormField>

                  {/* Extracurricular Activities */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium text-slate-700">{t('editor.education.activitiesTitle')}</h5>
                      <button
                        type="button"
                        onClick={() => addActivity(education.id)}
                        className="inline-flex items-center px-2 py-1 border border-slate-300 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {t('editor.education.addActivity')}
                      </button>
                    </div>

                    {education.activities.map((activity, activityIndex) => (
                      <div key={activityIndex} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center mt-1">
                          <span className="text-xs font-medium text-brand-700">{activityIndex + 1}</span>
                        </div>
                        <div className="flex-1">
                          <TextareaField
                            value={activity}
                            onChange={(value) => updateActivity(education.id, activityIndex, value)}
                            placeholder={t('editor.education.placeholders.activity')}
                            rows={2}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeActivity(education.id, activityIndex)}
                          className="text-red-400 hover:text-red-600 p-1 mt-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}

                    {education.activities.length === 0 && (
                      <p className="text-sm text-slate-500 italic">
                        {t('editor.education.emptyActivities')}
                      </p>
                    )}
                  </div>

                  {/* Academic Achievements */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium text-slate-700">{t('editor.education.achievementsTitle')}</h5>
                      <button
                        type="button"
                        onClick={() => addAchievement(education.id)}
                        className="inline-flex items-center px-2 py-1 border border-slate-300 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {t('editor.education.addAchievement')}
                      </button>
                    </div>

                    {education.achievements.map((achievement, achievementIndex) => (
                      <div key={achievementIndex} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mt-1">
                          <span className="text-xs font-medium text-yellow-600">🏆</span>
                        </div>
                        <div className="flex-1">
                          <TextareaField
                            value={achievement}
                            onChange={(value) => updateAchievement(education.id, achievementIndex, value)}
                            placeholder={t('editor.education.placeholders.achievement')}
                            rows={2}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAchievement(education.id, achievementIndex)}
                          className="text-red-400 hover:text-red-600 p-1 mt-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}

                    {education.achievements.length === 0 && (
                      <p className="text-sm text-slate-500 italic">
                        {t('editor.education.emptyAchievements')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add new education button */}
          <div className="flex justify-center pt-6">
            <button
              type="button"
              onClick={addEducation}
              className="inline-flex items-center px-6 py-3 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-600"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('editor.education.addAnotherEducation')}
            </button>
          </div>
        </div>
      )}

    </FormSection>
  );
};