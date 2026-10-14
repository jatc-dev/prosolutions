import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { SkillItem, SkillLevel, SkillCategory, ValidationErrors } from "../../../../../shared/types";
import {
  FormSection,
  FormField,
  FormActions,
  InputField
} from "../FormSection";
import { getPrefixMatches } from "../utils/suggestions";

type SkillsSectionCategory = 'technical' | 'soft';

interface SkillsSectionProps {
  data: SkillItem[];
  onChange: (data: SkillItem[]) => void;
  errors?: ValidationErrors;
  isLoading?: boolean;
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const EXPANDED_STORAGE_KEY = 'editor.expanded.skills';

const SKILL_SUGGESTIONS = {
  es: {
    technical: [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'PHP', 'Ruby', 'Go', 'Rust',
      'React', 'Angular', 'Vue.js', 'Node.js', 'Express', 'Django', 'Spring', 'Laravel',
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS',
      'Git', 'Jenkins', 'Linux', 'Windows Server', 'HTML', 'CSS', 'SASS', 'Tailwind CSS',
      'Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'Premiere Pro', 'After Effects',
      'Excel', 'Power BI', 'Tableau', 'Google Analytics', 'SEO', 'SEM', 'Social Media',
    ],
    soft: [
      'Liderazgo', 'Trabajo en Equipo', 'Comunicación', 'Resolución de Problemas',
      'Pensamiento Crítico', 'Adaptabilidad', 'Gestión del Tiempo', 'Creatividad',
      'Empatía', 'Inteligencia Emocional', 'Negociación', 'Toma de Decisiones',
      'Orientación a Resultados', 'Aprendizaje Continuo', 'Mentoría', 'Coaching',
      'Presentaciones Públicas', 'Escucha Activa', 'Resiliencia', 'Gestión del Estrés',
    ],
  },
  en: {
    technical: [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'PHP', 'Ruby', 'Go', 'Rust',
      'React', 'Angular', 'Vue.js', 'Node.js', 'Express', 'Django', 'Spring', 'Laravel',
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS',
      'Git', 'Jenkins', 'Linux', 'Windows Server', 'HTML', 'CSS', 'SASS', 'Tailwind CSS',
      'Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'Premiere Pro', 'After Effects',
      'Excel', 'Power BI', 'Tableau', 'Google Analytics', 'SEO', 'SEM', 'Social Media',
    ],
    soft: [
      'Leadership', 'Teamwork', 'Communication', 'Problem Solving',
      'Critical Thinking', 'Adaptability', 'Time Management', 'Creativity',
      'Empathy', 'Emotional Intelligence', 'Negotiation', 'Decision Making',
      'Results Orientation', 'Continuous Learning', 'Mentoring', 'Coaching',
      'Public Speaking', 'Active Listening', 'Resilience', 'Stress Management',
    ],
  },
};

export const SkillsSection: React.FC<SkillsSectionProps> = ({
  data,
  onChange,
  errors = {},
  isLoading = false,
}) => {
  const { t, i18n } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<SkillsSectionCategory>('technical');
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
  const [draggedSkillId, setDraggedSkillId] = useState<string | null>(null);
  const locale = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
  const skillSuggestions = SKILL_SUGGESTIONS[locale];
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
    const skillCategories: { value: SkillsSectionCategory; label: string; color: string }[] = [
      { value: 'technical', label: t('editor.skills.categories.technical'), color: 'bg-blue-100 text-blue-800' },
      { value: 'soft', label: t('editor.skills.categories.soft'), color: 'bg-green-100 text-green-800' },
    ];

    const skillLevels: { value: SkillLevel; label: string; description: string; color: string }[] = [
      { value: 'beginner', label: t('editor.skills.levels.beginner'), description: t('editor.skills.levelDescriptions.beginner'), color: 'bg-red-100 text-red-800' },
      { value: 'intermediate', label: t('editor.skills.levels.intermediate'), description: t('editor.skills.levelDescriptions.intermediate'), color: 'bg-yellow-100 text-yellow-800' },
      { value: 'advanced', label: t('editor.skills.levels.advanced'), description: t('editor.skills.levelDescriptions.advanced'), color: 'bg-blue-100 text-blue-800' },
      { value: 'expert', label: t('editor.skills.levels.expert'), description: t('editor.skills.levelDescriptions.expert'), color: 'bg-green-100 text-green-800' },
    ];

  const [newSkillName, setNewSkillName] = useState('');

  const addSkill = (name: string, category: SkillsSectionCategory = selectedCategory) => {
    if (!name.trim()) return;

    // Check if skill already exists
    if (data.some(skill => skill.name.toLowerCase() === name.toLowerCase())) {
      toast.error(t('editor.skills.alerts.duplicate'));
      return;
    }

    const newSkill: SkillItem = {
      id: generateId(),
      name: name.trim(),
      category,
      level: 'intermediate',
      yearsOfExperience: undefined,
      isCertified: false,
      order: data.length,
    };

    onChange([...data, newSkill]);
    setExpandedItems((prev) => (prev.includes(newSkill.id) ? prev : [...prev, newSkill.id]));
    setNewSkillName('');
  };

  const reorderSkills = (sourceId: string, targetId: string) => {
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

  const handleDragStart = (skillId: string, event: React.DragEvent<HTMLButtonElement>) => {
    setDraggedSkillId(skillId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', skillId);
  };

  const handleDrop = (targetSkillId: string, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceId = draggedSkillId || event.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetSkillId) {
      setDraggedSkillId(null);
      return;
    }

    reorderSkills(sourceId, targetSkillId);
    setDraggedSkillId(null);
  };

  const updateSkill = (id: string, updates: Partial<SkillItem>) => {
    const updatedData = data.map(skill =>
      skill.id === id ? { ...skill, ...updates } : skill
    );
    onChange(updatedData);
  };

  const removeSkill = (id: string) => {
    const filteredData = data.filter(skill => skill.id !== id);
    setExpandedItems((prev) => prev.filter((itemId) => itemId !== id));
    // Reorder remaining items
    const reorderedData = filteredData.map((skill, index) => ({
      ...skill,
      order: index,
    }));
    onChange(reorderedData);
  };

  const moveSkill = (id: string, direction: 'up' | 'down') => {
    const currentIndex = data.findIndex(skill => skill.id === id);
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
    const reorderedData = newData.map((skill, index) => ({
      ...skill,
      order: index,
    }));

    onChange(reorderedData);
  };

  const sortedData = [...data].sort((a, b) => a.order - b.order);
  const expandAllItems = () => setExpandedItems(sortedData.map((skill) => skill.id));
  const collapseAllItems = () => setExpandedItems([]);
  const allExpanded = sortedData.length > 0 && sortedData.every((skill) => expandedItems.includes(skill.id));
  const allCollapsed = expandedItems.length === 0;
  const skillsByCategory = sortedData.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<SkillCategory, SkillItem[]>);

  const getSkillLevelBar = (level: SkillLevel) => {
    const levelIndex = skillLevels.findIndex(l => l.value === level);
    const percentage = ((levelIndex + 1) / skillLevels.length) * 100;

    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    );
  };

  return (
    <FormSection
      title={t('editor.skills.title')}
      description={t('editor.skills.description')}
      errors={errors}
      isLoading={isLoading}
    >
      {/* Add new skill */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <h4 className="text-sm font-medium text-gray-900">{t('editor.skills.addNew')}</h4>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label={t('editor.skills.fields.category')}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as SkillsSectionCategory)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              {skillCategories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </FormField>

          <div className="sm:col-span-2 relative">
            <FormField label={t('editor.skills.fields.name')}>
              <div className="relative">
                <InputField
                  value={newSkillName}
                  onChange={setNewSkillName}
                  placeholder={`${t('editor.skills.placeholderPrefix')} ${skillSuggestions[selectedCategory][0]}`}
                  list={`skill-name-suggestions-${selectedCategory}`}
                />
                <datalist id={`skill-name-suggestions-${selectedCategory}`}>
                  {getPrefixMatches(skillSuggestions[selectedCategory], newSkillName)
                    .filter(
                      (skill) => !data.some((existing) => existing.name.toLowerCase() === skill.toLowerCase())
                    )
                    .map((skill) => (
                      <option key={skill} value={skill} />
                    ))}
                </datalist>
              </div>
            </FormField>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => addSkill(newSkillName)}
            disabled={!newSkillName.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('editor.skills.addSkill')}
          </button>
        </div>
      </div>

      {sortedData.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={expandAllItems}
            disabled={allExpanded}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('editor.common.expandAll', { defaultValue: 'Expandir todo' })}
          </button>
          <button
            type="button"
            onClick={collapseAllItems}
            disabled={allCollapsed}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('editor.common.collapseAll', { defaultValue: 'Colapsar todo' })}
          </button>
        </div>
      )}

      {/* Skills by category */}
      {skillCategories.map(category => {
        const categorySkills = skillsByCategory[category.value] || [];
        const categoryInfo = skillCategories.find(c => c.value === category.value)!;

        return (
          <div key={category.value} className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900 flex items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryInfo.color} mr-3`}>
                  {categoryInfo.label}
                </span>
                {t('editor.skills.count', { count: categorySkills.length })}
              </h4>
            </div>

            {categorySkills.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">
                  {t('editor.skills.emptyByCategory')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categorySkills.map((skill, index) => (
                  <div
                    key={skill.id}
                    className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${draggedSkillId === skill.id ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(skill.id, event)}
                  >
                    <div
                      className="flex items-start justify-between mb-3 cursor-pointer"
                      onClick={() => toggleExpandedItem(skill.id)}
                    >
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900">{skill.name}</h5>
                        <div className="flex items-center mt-1 space-x-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            skillLevels.find(l => l.value === skill.level)?.color
                          }`}>
                            {skillLevels.find(l => l.value === skill.level)?.label}
                          </span>
                          {skill.isCertified && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              {t('editor.skills.certified')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          type="button"
                          draggable
                          onClick={(event) => event.stopPropagation()}
                          onDragStart={(event) => handleDragStart(skill.id, event)}
                          onDragEnd={() => setDraggedSkillId(null)}
                          className="text-gray-400 hover:text-gray-600 p-0.5"
                          title={t('editor.skills.reorderHint', { defaultValue: 'Arrastra para reordenar' })}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </button>

                        {/* Move up/down */}
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              moveSkill(skill.id, 'up');
                            }}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 p-0.5"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              moveSkill(skill.id, 'down');
                            }}
                            disabled={index === categorySkills.length - 1}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 p-0.5"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleExpandedItem(skill.id);
                          }}
                          className="text-gray-400 hover:text-gray-600 p-0.5"
                        >
                          <svg
                            className={`w-4 h-4 transition-transform ${expandedItems.includes(skill.id) ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeSkill(skill.id);
                          }}
                          className="text-red-400 hover:text-red-600 p-0.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {expandedItems.includes(skill.id) && (
                    <>
                    {/* Skill level bar */}
                    <div className="mb-3">
                      {getSkillLevelBar(skill.level)}
                    </div>

                    {/* Skill details */}
                    <div className="space-y-2">
                      {/* Level selector */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{t('editor.skills.fields.level')}:</span>
                        <select
                          value={skill.level}
                          onChange={(e) => updateSkill(skill.id, { level: e.target.value as SkillLevel })}
                          className="text-xs border-0 p-0 text-gray-900 bg-transparent focus:ring-0"
                        >
                          {skillLevels.map(level => (
                            <option key={level.value} value={level.value}>
                              {level.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Years of experience */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{t('editor.skills.fields.yearsOfExperience')}:</span>
                        <select
                          value={skill.yearsOfExperience || ''}
                          onChange={(e) => updateSkill(skill.id, {
                            yearsOfExperience: e.target.value ? parseInt(e.target.value) : undefined
                          })}
                          className="text-xs border-0 p-0 text-gray-900 bg-transparent focus:ring-0"
                        >
                          <option value="">{t('editor.skills.years.unspecified')}</option>
                          <option value="1">{t('editor.skills.years.1')}</option>
                          <option value="2">{t('editor.skills.years.2')}</option>
                          <option value="3">{t('editor.skills.years.3')}</option>
                          <option value="4">{t('editor.skills.years.4')}</option>
                          <option value="5">{t('editor.skills.years.5')}</option>
                          <option value="6">{t('editor.skills.years.6')}</option>
                          <option value="9">{t('editor.skills.years.9')}</option>
                        </select>
                      </div>

                      {/* Certification */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{t('editor.skills.fields.certified')}:</span>
                        <input
                          type="checkbox"
                          checked={skill.isCertified}
                          onChange={(e) => updateSkill(skill.id, { isCertified: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 scale-75"
                        />
                      </div>
                    </div>
                    </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <FormActions />
    </FormSection>
  );
};
