import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageItem, LanguageLevel, ValidationErrors } from "../../../../../shared/types";
import {
  FormSection,
  FormField,
  InputField
} from "../FormSection";
import { getPrefixMatches } from "../utils/suggestions";

interface LanguagesSectionProps {
  data: LanguageItem[];
  onChange: (data: LanguageItem[]) => void;
  errors?: ValidationErrors;
  isLoading?: boolean;
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const EXPANDED_STORAGE_KEY = 'editor.expanded.languages';

const LANGUAGE_OPTIONS = {
  es: [
    'Inglés', 'Español', 'Francés', 'Alemán', 'Italiano', 'Portugués',
    'Chino Mandarín', 'Japonés', 'Coreano', 'Árabe', 'Ruso', 'Hindi',
    'Bengalí', 'Turco', 'Vietnamita', 'Holandés', 'Sueco', 'Noruego',
    'Danés', 'Finés', 'Polaco', 'Checo', 'Húngaro', 'Griego', 'Hebreo',
  ],
  en: [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
    'Mandarin Chinese', 'Japanese', 'Korean', 'Arabic', 'Russian', 'Hindi',
    'Bengali', 'Turkish', 'Vietnamese', 'Dutch', 'Swedish', 'Norwegian',
    'Danish', 'Finnish', 'Polish', 'Czech', 'Hungarian', 'Greek', 'Hebrew',
  ],
};

export const LanguagesSection: React.FC<LanguagesSectionProps> = ({
  data,
  onChange,
  errors = {},
  isLoading = false,
}) => {
  const { t, i18n } = useTranslation();
  const [newLanguage, setNewLanguage] = useState('');
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
  const [draggedLanguageId, setDraggedLanguageId] = useState<string | null>(null);
  const locale = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
  const languageOptions = LANGUAGE_OPTIONS[locale];

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

  const languageLevels: { value: LanguageLevel; label: string; description: string; color: string }[] = [
    { value: 'A1', label: 'A1', description: t('editor.languages.levels.a1'), color: 'bg-red-100 text-red-800' },
    { value: 'A2', label: 'A2', description: t('editor.languages.levels.a2'), color: 'bg-red-200 text-red-900' },
    { value: 'B1', label: 'B1', description: t('editor.languages.levels.b1'), color: 'bg-yellow-100 text-yellow-800' },
    { value: 'B2', label: 'B2', description: t('editor.languages.levels.b2'), color: 'bg-yellow-200 text-yellow-900' },
    { value: 'C1', label: 'C1', description: t('editor.languages.levels.c1'), color: 'bg-brand-100 text-brand-900' },
    { value: 'C2', label: 'C2', description: t('editor.languages.levels.c2'), color: 'bg-green-100 text-green-800' },
  ];

  const skillTypes = [
    { key: 'listeningLevel', label: t('editor.languages.skills.listening'), icon: '🎧' },
    { key: 'readingLevel', label: t('editor.languages.skills.reading'), icon: '📖' },
    { key: 'speakingLevel', label: t('editor.languages.skills.speaking'), icon: '🗣️' },
    { key: 'writingLevel', label: t('editor.languages.skills.writing'), icon: '✍️' },
  ] as const;

  const addLanguage = (languageName: string) => {
    if (!languageName.trim()) return;

    // Check if language already exists
    if (data.some(lang => lang.language.toLowerCase() === languageName.toLowerCase())) {
      alert(t('editor.languages.alerts.duplicate'));
      return;
    }

    const newLanguageItem: LanguageItem = {
      id: generateId(),
      language: languageName.trim(),
      listeningLevel: 'B1',
      readingLevel: 'B1',
      speakingLevel: 'B1',
      writingLevel: 'B1',
      certification: '',
      yearsOfStudy: undefined,
      order: data.length,
    };

    onChange([...data, newLanguageItem]);
    setExpandedItems((prev) => (prev.includes(newLanguageItem.id) ? prev : [...prev, newLanguageItem.id]));
    setNewLanguage('');
  };

  const reorderLanguages = (sourceId: string, targetId: string) => {
    const ordered = [...data].sort((a, b) => a.order - b.order);
    const sourceIndex = ordered.findIndex((item) => item.id === sourceId);
    const targetIndex = ordered.findIndex((item) => item.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      return;
    }

    const reordered = [...ordered];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    onChange(
      reordered.map((item, index) => ({
        ...item,
        order: index,
      }))
    );
  };

  const handleDragStart = (languageId: string, event: React.DragEvent<HTMLButtonElement>) => {
    setDraggedLanguageId(languageId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', languageId);
  };

  const handleDrop = (targetLanguageId: string, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceId = draggedLanguageId || event.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetLanguageId) {
      setDraggedLanguageId(null);
      return;
    }

    reorderLanguages(sourceId, targetLanguageId);
    setDraggedLanguageId(null);
  };

  const updateLanguage = (id: string, updates: Partial<LanguageItem>) => {
    const updatedData = data.map(lang =>
      lang.id === id ? { ...lang, ...updates } : lang
    );
    onChange(updatedData);
  };

  const removeLanguage = (id: string) => {
    const filteredData = data.filter(lang => lang.id !== id);
    setExpandedItems((prev) => prev.filter((itemId) => itemId !== id));
    // Reorder remaining items
    const reorderedData = filteredData.map((lang, index) => ({
      ...lang,
      order: index,
    }));
    onChange(reorderedData);
  };

  const moveLanguage = (id: string, direction: 'up' | 'down') => {
    const currentIndex = data.findIndex(lang => lang.id === id);
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
    const reorderedData = newData.map((lang, index) => ({
      ...lang,
      order: index,
    }));

    onChange(reorderedData);
  };

  const getLevelColor = (level: LanguageLevel) => {
    return languageLevels.find(l => l.value === level)?.color || 'bg-slate-100 text-slate-800';
  };

  const getLevelBar = (level: LanguageLevel) => {
    const levelIndex = languageLevels.findIndex(l => l.value === level);
    const percentage = ((levelIndex + 1) / languageLevels.length) * 100;

    return (
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className="bg-brand-700 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    );
  };

  const sortedData = [...data].sort((a, b) => a.order - b.order);
  const expandAllItems = () => setExpandedItems(sortedData.map((language) => language.id));
  const collapseAllItems = () => setExpandedItems([]);
  const allExpanded = sortedData.length > 0 && sortedData.every((language) => expandedItems.includes(language.id));
  const allCollapsed = expandedItems.length === 0;

  return (
    <FormSection
      title={t('editor.languages.title')}
      description={t('editor.languages.description')}
      errors={errors}
      isLoading={isLoading}
    >
      {/* Add new language */}
      <div className="bg-slate-50 rounded-lg p-6 space-y-4">
        <h4 className="text-sm font-medium text-slate-900">{t('editor.languages.addNew')}</h4>

        <div className="relative">
          <FormField label={t('editor.languages.fields.language')}>
            <InputField
              value={newLanguage}
              onChange={setNewLanguage}
              placeholder={t('editor.languages.placeholders.language')}
              list="language-name-suggestions"
            />
            <datalist id="language-name-suggestions">
              {getPrefixMatches(languageOptions, newLanguage)
                .filter(
                  (lang) => !data.some((existing) => existing.language.toLowerCase() === lang.toLowerCase())
                )
                .map((lang) => (
                  <option key={lang} value={lang} />
                ))}
            </datalist>
          </FormField>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => addLanguage(newLanguage)}
            disabled={!newLanguage.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-700 hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('editor.languages.addLanguage')}
          </button>
        </div>
      </div>

      {/* Languages list */}
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18M9 3v2m6-2v2M7 9h.01M7 12h.01M7 15h.01M10 12h.01M10 15h.01M13 12h.01M13 15h.01M16 12h.01M16 15h.01M19 12h.01M19 15h.01M3 9a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-900">{t('editor.languages.emptyTitle')}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {t('editor.languages.emptyDescription')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedData.map((language, index) => (
            <div
              key={language.id}
              className={`bg-white border rounded-lg shadow-sm overflow-hidden transition-colors ${draggedLanguageId === language.id ? 'border-brand-300 bg-brand-50/30' : 'border-slate-200'}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(language.id, event)}
            >
              {/* Header */}
              <div
                className="px-6 py-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => toggleExpandedItem(language.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      draggable
                      onClick={(event) => event.stopPropagation()}
                      onDragStart={(event) => handleDragStart(language.id, event)}
                      onDragEnd={() => setDraggedLanguageId(null)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                      title={t('editor.languages.reorderHint', { defaultValue: 'Arrastra para reordenar' })}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </button>

                    {/* Language name and flag */}
                    <div>
                      <h4 className="text-lg font-medium text-slate-900">{language.language}</h4><label className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><input type="checkbox" checked={language.isVisible !== false} onChange={(event) => updateLanguage(language.id, { isVisible: event.target.checked })} />Mostrar en el CV</label>
                      <div className="flex items-center space-x-2 mt-1">
                        {language.certification && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            {t('editor.languages.certified')}: {language.certification}
                          </span>
                        )}
                        {language.yearsOfStudy && (
                          <span className="text-sm text-slate-600">
                            {t('editor.languages.yearsOfStudyLabel', { count: language.yearsOfStudy })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Move up/down buttons */}
                    <div className="flex flex-col space-y-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          moveLanguage(language.id, 'up');
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
                        onClick={(event) => {
                          event.stopPropagation();
                          moveLanguage(language.id, 'down');
                        }}
                        disabled={index === sortedData.length - 1}
                        className="text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleExpandedItem(language.id);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <svg
                        className={`w-5 h-5 transition-transform ${expandedItems.includes(language.id) ? 'rotate-180' : ''}`}
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
                      onClick={(event) => {
                        event.stopPropagation();
                        removeLanguage(language.id);
                      }}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Language skills */}
              {expandedItems.includes(language.id) && (
              <div className="editor-item-scroll px-6 py-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {skillTypes.map((skill) => (
                    <div key={skill.key} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{skill.icon}</span>
                        <span className="text-sm font-medium text-slate-700">{skill.label}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(language[skill.key])}`}>
                          {language[skill.key]}
                        </span>
                      </div>
                      {getLevelBar(language[skill.key])}
                      <select
                        value={language[skill.key]}
                        onChange={(e) => updateLanguage(language.id, { [skill.key]: e.target.value as LanguageLevel })}
                        className="block w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-brand-600 focus:border-brand-600"
                      >
                        {languageLevels.map(level => (
                          <option key={level.value} value={level.value}>
                            {level.label} - {level.description}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Additional information */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label={t('editor.languages.fields.certification')}
                      help={t('editor.languages.help.certification')}
                    >
                      <InputField
                        value={language.certification || ''}
                        onChange={(value) => updateLanguage(language.id, { certification: value })}
                        placeholder={t('editor.languages.placeholders.certification')}
                      />
                    </FormField>

                    <FormField
                      label={t('editor.languages.fields.yearsOfStudy')}
                      help={t('editor.languages.help.yearsOfStudy')}
                    >
                      <select
                        value={language.yearsOfStudy || ''}
                        onChange={(e) => updateLanguage(language.id, {
                          yearsOfStudy: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-600 focus:border-brand-600 sm:text-sm"
                      >
                        <option value="">{t('editor.languages.years.unspecified')}</option>
                        <option value="1">{t('editor.languages.years.1')}</option>
                        <option value="2">{t('editor.languages.years.2')}</option>
                        <option value="3">{t('editor.languages.years.3')}</option>
                        <option value="4">{t('editor.languages.years.4')}</option>
                        <option value="5">{t('editor.languages.years.5')}</option>
                        <option value="6">{t('editor.languages.years.6')}</option>
                        <option value="9">{t('editor.languages.years.9')}</option>
                        <option value="11">{t('editor.languages.years.11')}</option>
                      </select>
                    </FormField>
                  </div>
                </div>
              </div>
              )}
            </div>
          ))}

        </div>
      )}
    </FormSection>
  );
};