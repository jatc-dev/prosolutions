import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

type SuggestionLanguage = 'es' | 'en';
type JobCategory = 'management' | 'technical' | 'sales' | 'marketing' | 'finance' | 'creative' | 'general';
type SeniorityLevel = 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
type IndustryFocus = 'general' | 'technology' | 'finance' | 'healthcare' | 'education' | 'retail';

const POWER_VERBS_BY_LANG: Record<SuggestionLanguage, Record<JobCategory, string[]>> = {
  es: {
    management: [
      'Dirigi', 'Lidere', 'Coordine', 'Supervise', 'Implemente', 'Estableci', 'Forme', 'Mentoree'
    ],
    technical: [
      'Desarrolle', 'Disene', 'Implemente', 'Optimice', 'Automatice', 'Integre', 'Depure', 'Desplegue'
    ],
    sales: [
      'Impulse', 'Incremente', 'Genere', 'Negocie', 'Cerre', 'Expandi', 'Consolide', 'Potencie'
    ],
    marketing: [
      'Lance', 'Posicione', 'Ejecute', 'Analice', 'Optimice', 'Converti', 'Segmente', 'Fortaleci'
    ],
    finance: [
      'Analice', 'Presupueste', 'Reduje', 'Optimice', 'Controle', 'Monitoree', 'Concilie', 'Audite'
    ],
    creative: [
      'Concebi', 'Disene', 'Produje', 'Transforme', 'Innove', 'Visualice', 'Construi', 'Refine'
    ],
    general: [
      'Mejore', 'Fortaleci', 'Agilice', 'Estandarice', 'Modernice', 'Escale', 'Consolide', 'Eleve'
    ],
  },
  en: {
    management: [
      'Led', 'Directed', 'Coordinated', 'Supervised', 'Implemented', 'Established', 'Mentored', 'Managed'
    ],
    technical: [
      'Developed', 'Designed', 'Implemented', 'Optimized', 'Automated', 'Integrated', 'Debugged', 'Deployed'
    ],
    sales: [
      'Drove', 'Increased', 'Generated', 'Negotiated', 'Closed', 'Expanded', 'Strengthened', 'Scaled'
    ],
    marketing: [
      'Launched', 'Positioned', 'Executed', 'Analyzed', 'Optimized', 'Converted', 'Segmented', 'Elevated'
    ],
    finance: [
      'Analyzed', 'Budgeted', 'Reduced', 'Optimized', 'Controlled', 'Monitored', 'Reconciled', 'Audited'
    ],
    creative: [
      'Conceptualized', 'Designed', 'Produced', 'Transformed', 'Innovated', 'Visualized', 'Crafted', 'Refined'
    ],
    general: [
      'Improved', 'Enhanced', 'Streamlined', 'Standardized', 'Modernized', 'Scaled', 'Consolidated', 'Elevated'
    ],
  },
};

const ACHIEVEMENT_PHRASES_BY_LANG: Record<SuggestionLanguage, { quantitative: string[]; qualitative: string[]; technical: string[] }> = {
  es: {
    quantitative: [
      'Aumente ingresos en {percentage}%',
      'Reduje costos operativos en {percentage}%',
      'Mejore la productividad del equipo en {percentage}%',
      'Impulse el crecimiento de usuarios en {number}%',
      'Genere {currency}{amount} en nuevas oportunidades'
    ],
    qualitative: [
      'Lidere iniciativas cross-funcionales con impacto regional',
      'Estandarice procesos clave para mejorar calidad y tiempos',
      'Mentoree talento junior y acelere su curva de aprendizaje',
      'Fortaleci la colaboracion con stakeholders estrategicos'
    ],
    technical: [
      'Disene e implemente soluciones escalables para alto trafico',
      'Optimice el rendimiento de sistemas criticos en {percentage}%',
      'Implemente automatizacion de pruebas para reducir defectos',
      'Integre servicios externos asegurando estabilidad y seguridad'
    ],
  },
  en: {
    quantitative: [
      'Increased revenue by {percentage}%',
      'Reduced operating costs by {percentage}%',
      'Improved team productivity by {percentage}%',
      'Grew user base by {number}%',
      'Generated {currency}{amount} in new pipeline'
    ],
    qualitative: [
      'Led cross-functional initiatives with regional impact',
      'Standardized key processes to improve quality and delivery speed',
      'Mentored junior talent and accelerated onboarding outcomes',
      'Strengthened collaboration with strategic stakeholders'
    ],
    technical: [
      'Designed and implemented scalable solutions for high traffic',
      'Optimized critical system performance by {percentage}%',
      'Implemented test automation to reduce defects',
      'Integrated third-party services with reliability and security'
    ],
  },
};

const JOB_KEYWORDS: Record<SuggestionLanguage, Record<JobCategory, string[]>> = {
  es: {
    management: ['gerente', 'director', 'lider', 'jefe', 'coordinador', 'supervisor'],
    technical: ['desarrollador', 'ingeniero', 'programador', 'analista', 'devops', 'arquitecto', 'qa'],
    sales: ['ventas', 'comercial', 'cuentas', 'account', 'negocios', 'business development'],
    marketing: ['marketing', 'marca', 'contenido', 'social media', 'growth', 'seo'],
    finance: ['finanzas', 'financiero', 'contador', 'tesoreria', 'auditoria', 'controller'],
    creative: ['disenador', 'creativo', 'ux', 'ui', 'ilustrador', 'multimedia'],
    general: [],
  },
  en: {
    management: ['manager', 'director', 'lead', 'head', 'coordinator', 'supervisor'],
    technical: ['developer', 'engineer', 'programmer', 'analyst', 'devops', 'architect', 'qa'],
    sales: ['sales', 'account', 'business development', 'commercial'],
    marketing: ['marketing', 'brand', 'content', 'social media', 'growth', 'seo'],
    finance: ['finance', 'financial', 'accountant', 'treasury', 'audit', 'controller'],
    creative: ['designer', 'creative', 'ux', 'ui', 'illustrator', 'multimedia'],
    general: [],
  },
};

const SENIORITY_VERB_BOOST: Record<SuggestionLanguage, Record<SeniorityLevel, string[]>> = {
  es: {
    junior: ['Apoye', 'Colabore', 'Contribui'],
    mid: ['Implemente', 'Optimice', 'Ejecute'],
    senior: ['Lidere', 'Transforme', 'Escale'],
    lead: ['Defini', 'Alinee', 'Impulse'],
    executive: ['Orqueste', 'Dirigi', 'Consolide'],
  },
  en: {
    junior: ['Supported', 'Collaborated', 'Contributed'],
    mid: ['Implemented', 'Optimized', 'Executed'],
    senior: ['Led', 'Transformed', 'Scaled'],
    lead: ['Defined', 'Aligned', 'Drove'],
    executive: ['Orchestrated', 'Directed', 'Consolidated'],
  },
};

const INDUSTRY_ACHIEVEMENTS: Record<SuggestionLanguage, Record<IndustryFocus, string[]>> = {
  es: {
    general: ['Mejore indicadores clave de desempeno (KPIs) con enfoque en impacto medible'],
    technology: [
      'Disminui tiempos de despliegue en {percentage}% mediante automatizacion CI/CD',
      'Reduje incidencias de produccion en {percentage}% al fortalecer observabilidad y alertas'
    ],
    finance: [
      'Eleve la precision de reportes financieros en {percentage}% con controles de calidad de datos',
      'Optimice el flujo de caja reduciendo tiempos de conciliacion en {percentage}%'
    ],
    healthcare: [
      'Mejore la adherencia a protocolos clinicos en {percentage}% con estandarizacion operativa',
      'Reduje tiempos de atencion en {percentage}% sin comprometer la calidad asistencial'
    ],
    education: [
      'Incremente la retencion de estudiantes en {percentage}% mediante estrategias de seguimiento',
      'Mejore resultados academicos en {percentage}% a traves de planes de mejora continua'
    ],
    retail: [
      'Aumente la conversion en punto de venta en {percentage}% mediante optimizacion comercial',
      'Reduje quiebres de stock en {percentage}% con mejor planificacion de inventario'
    ],
  },
  en: {
    general: ['Improved core KPIs through measurable, outcome-driven execution'],
    technology: [
      'Reduced deployment time by {percentage}% through CI/CD automation',
      'Lowered production incidents by {percentage}% by strengthening observability and alerting'
    ],
    finance: [
      'Increased financial reporting accuracy by {percentage}% through stronger data controls',
      'Optimized cash flow by reducing reconciliation cycle time by {percentage}%'
    ],
    healthcare: [
      'Improved protocol adherence by {percentage}% through operational standardization',
      'Reduced care delivery cycle time by {percentage}% while maintaining quality outcomes'
    ],
    education: [
      'Increased student retention by {percentage}% through proactive support strategies',
      'Improved learning outcomes by {percentage}% via continuous improvement initiatives'
    ],
    retail: [
      'Increased in-store conversion by {percentage}% through commercial optimization',
      'Reduced stockout rate by {percentage}% with improved inventory planning'
    ],
  },
};

function resolveSuggestionLanguage(rawLanguage?: string): SuggestionLanguage {
  return rawLanguage?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

function analyzeJobTitle(title: string, language: SuggestionLanguage): JobCategory[] {
  const normalized = title.toLowerCase();
  const categories = Object.entries(JOB_KEYWORDS[language])
    .filter(([category, keywords]) => category !== 'general' && keywords.some((keyword) => normalized.includes(keyword)))
    .map(([category]) => category as JobCategory);

  return categories.length > 0 ? categories : ['general'];
}

function getSuggestedVerbs(
  jobTitle: string,
  language: SuggestionLanguage,
  seniority: SeniorityLevel,
  industry: IndustryFocus
): string[] {
  const categories = analyzeJobTitle(jobTitle, language);
  const verbs: string[] = [];

  categories.forEach((category) => {
    verbs.push(...POWER_VERBS_BY_LANG[language][category].slice(0, 4));
  });

  verbs.push(...SENIORITY_VERB_BOOST[language][seniority]);

  if (industry === 'technology') {
    verbs.push(...(language === 'es' ? ['Automatice', 'Escale'] : ['Automated', 'Scaled']));
  }

  if (industry === 'finance') {
    verbs.push(...(language === 'es' ? ['Audite', 'Concilie'] : ['Audited', 'Reconciled']));
  }

  if (verbs.length < 12) {
    verbs.push(...POWER_VERBS_BY_LANG[language].general.slice(0, 12 - verbs.length));
  }

  return [...new Set(verbs)].slice(0, 12);
}

function getSuggestedAchievements(
  jobTitle: string,
  language: SuggestionLanguage,
  seniority: SeniorityLevel,
  industry: IndustryFocus
): string[] {
  const categories = analyzeJobTitle(jobTitle, language);
  const base = ACHIEVEMENT_PHRASES_BY_LANG[language];
  const suggestions: string[] = [];

  suggestions.push(...base.quantitative.slice(0, 3));
  suggestions.push(...(categories.includes('technical') ? base.technical.slice(0, 2) : base.qualitative.slice(0, 2)));
  suggestions.push(...INDUSTRY_ACHIEVEMENTS[language][industry].slice(0, 2));

  if (seniority === 'lead' || seniority === 'executive') {
    suggestions.push(
      language === 'es'
        ? 'Alinee objetivos de negocio y ejecucion del equipo para acelerar resultados estrategicos'
        : 'Aligned business priorities and team execution to accelerate strategic outcomes'
    );
  }

  return [...new Set(suggestions)].slice(0, 8);
}

interface AISuggestionsPanelProps {
  jobTitle: string;
  onVerbSelect?: (verb: string) => void;
  onAchievementSelect?: (achievement: string) => void;
  className?: string;
}

export function AISuggestionsPanel({
  jobTitle,
  onVerbSelect,
  onAchievementSelect,
  className = ''
}: AISuggestionsPanelProps) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'verbs' | 'achievements'>('verbs');
  const [suggestedVerbs, setSuggestedVerbs] = useState<string[]>([]);
  const [suggestedAchievements, setSuggestedAchievements] = useState<string[]>([]);
  const [seniority, setSeniority] = useState<SeniorityLevel>('mid');
  const [industry, setIndustry] = useState<IndustryFocus>('general');
  const [isMinimized, setIsMinimized] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const language = resolveSuggestionLanguage(i18n.resolvedLanguage || i18n.language);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedState = window.localStorage.getItem('aiSuggestionsPanelMinimized');
    if (savedState === 'true' || savedState === 'false') {
      setIsMinimized(savedState === 'true');
    }

    const savedFiltersState = window.localStorage.getItem('aiSuggestionsPanelShowFilters');
    if (savedFiltersState === 'true' || savedFiltersState === 'false') {
      setShowFilters(savedFiltersState === 'true');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('aiSuggestionsPanelMinimized', String(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('aiSuggestionsPanelShowFilters', String(showFilters));
  }, [showFilters]);

  useEffect(() => {
    if (jobTitle.trim()) {
      setSuggestedVerbs(getSuggestedVerbs(jobTitle, language, seniority, industry));
      setSuggestedAchievements(getSuggestedAchievements(jobTitle, language, seniority, industry));
    } else {
      // Default suggestions when no job title
      setSuggestedVerbs(POWER_VERBS_BY_LANG[language].general.slice(0, 10));
      setSuggestedAchievements([
        ...ACHIEVEMENT_PHRASES_BY_LANG[language].quantitative.slice(0, 4),
        ...INDUSTRY_ACHIEVEMENTS[language][industry].slice(0, 2),
      ]);
    }
  }, [jobTitle, language, seniority, industry]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('ai.copySuccess'));
    } catch (err) {
      toast.error(t('ai.copyError'));
    }
  };

  const handleVerbInsert = (verb: string) => {
    onVerbSelect?.(verb);
  };

  const handleAchievementInsert = (achievement: string) => {
    onAchievementSelect?.(achievement);
  };

  const jobCategories = analyzeJobTitle(jobTitle, language);

  return (
    <div className={`rounded-lg border border-ui-border bg-ui-surface p-3 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{t('ai.suggestions')}</h3>
            <p className="truncate text-sm text-slate-600 dark:text-slate-300">
              {jobTitle ? `${t('ai.optimizedFor')}: ${jobTitle}` : t('ai.generalSuggestions')}
            </p>
          </div>
        </div>
        {jobCategories.length > 0 && (
          <div className="flex flex-wrap gap-1 sm:flex-shrink-0">
            {jobCategories.map(category => (
              <span
                key={category}
                className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium capitalize text-brand-800 dark:bg-brand-900/60 dark:text-brand-100"
              >
                {t(`ai.categories.${category}`)}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsMinimized((prev) => !prev)}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {isMinimized
            ? t('editor.ai.expandPanel', 'Expandir panel')
            : t('editor.ai.minimizePanel', 'Minimizar panel')}
        </button>
      </div>

      {isMinimized ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('verbs');
                setIsMinimized(false);
              }}
              className="rounded border border-brand-200 bg-ui-surface px-3 py-1.5 text-xs text-brand-700 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-200 dark:hover:bg-brand-900/40"
            >
              {t('ai.powerVerbs')} ({suggestedVerbs.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('achievements');
                setIsMinimized(false);
              }}
              className="rounded border border-green-300 bg-white px-3 py-1.5 text-xs text-green-700 hover:bg-green-50 dark:border-green-700 dark:bg-slate-900 dark:text-green-200 dark:hover:bg-green-950/40"
            >
              {t('ai.achievements')} ({suggestedAchievements.length})
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-300">{t('ai.clickToCopy')}</p>
        </div>
      ) : (
      <>
      {/* Tabs */}
      <div className="mb-3 flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('verbs')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex-1 sm:flex-none ${
            activeTab === 'verbs'
              ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/60 dark:text-brand-100'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('ai.powerVerbs')}
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex-1 sm:flex-none ${
            activeTab === 'achievements'
              ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/60 dark:text-brand-100'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('ai.achievements')}
        </button>
        <div className="ml-auto py-1">
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {showFilters
              ? t('editor.ai.hideFilters', 'Ocultar filtros')
              : t('editor.ai.showFilters', 'Mostrar filtros')}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{t('ai.seniorityLabel')}</label>
            <select
              value={seniority}
              onChange={(e) => setSeniority(e.target.value as SeniorityLevel)}
              className="w-full rounded-md border border-ui-border-strong bg-ui-surface px-3 py-2 text-sm text-ui-text focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="junior">{t('ai.seniorityLevels.junior')}</option>
              <option value="mid">{t('ai.seniorityLevels.mid')}</option>
              <option value="senior">{t('ai.seniorityLevels.senior')}</option>
              <option value="lead">{t('ai.seniorityLevels.lead')}</option>
              <option value="executive">{t('ai.seniorityLevels.executive')}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{t('ai.industryLabel')}</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value as IndustryFocus)}
              className="w-full rounded-md border border-ui-border-strong bg-ui-surface px-3 py-2 text-sm text-ui-text focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="general">{t('ai.industries.general')}</option>
              <option value="technology">{t('ai.industries.technology')}</option>
              <option value="finance">{t('ai.industries.finance')}</option>
              <option value="healthcare">{t('ai.industries.healthcare')}</option>
              <option value="education">{t('ai.industries.education')}</option>
              <option value="retail">{t('ai.industries.retail')}</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-3 max-h-[22rem] overflow-y-auto pr-1">
        {activeTab === 'verbs' ? (
          <div>
            <p className="mb-3 text-xs text-slate-600 dark:text-slate-300">
              {t('ai.verbsDescription')}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {suggestedVerbs.map((verb, index) => (
                <div
                  key={index}
                  className="rounded-md border border-ui-border bg-ui-surface px-3 py-2 text-sm transition-colors hover:border-brand-300 hover:bg-brand-50 dark:hover:border-brand-600 dark:hover:bg-brand-900/40"
                >
                  <p className="mb-2 font-medium text-slate-700 dark:text-slate-200">{verb}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(verb)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {t('ai.copyAction')}
                    </button>
                    <button
                      onClick={() => handleVerbInsert(verb)}
                      className="rounded border border-brand-200 px-2 py-1 text-xs text-brand-700 hover:bg-brand-100 dark:border-brand-700 dark:text-brand-200 dark:hover:bg-brand-900/40"
                    >
                      {t('ai.insertAction')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-300">
              {t('ai.clickToCopy')}
            </p>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-xs text-slate-600 dark:text-slate-300">
              {t('ai.achievementsDescription')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {suggestedAchievements.map((achievement, index) => (
                <div
                  key={index}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-green-300 hover:bg-green-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-green-600 dark:hover:bg-green-950/40"
                >
                  <p className="mb-2 text-slate-700 dark:text-slate-200">{achievement}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(achievement)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {t('ai.copyAction')}
                    </button>
                    <button
                      onClick={() => handleAchievementInsert(achievement)}
                      className="rounded border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-200 dark:hover:bg-green-900/40"
                    >
                      {t('ai.insertAction')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 p-2 dark:border-yellow-700 dark:bg-yellow-950/60">
              <p className="text-xs text-yellow-800 dark:text-yellow-100">
                <strong>{t('ai.tipLabel')}</strong> {t('ai.replacePlaceholders')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700">
        <p className="text-center text-xs text-slate-500 dark:text-slate-300">
          {t('ai.basedOn')}
        </p>
      </div>
      </>
      )}
    </div>
  );
}
