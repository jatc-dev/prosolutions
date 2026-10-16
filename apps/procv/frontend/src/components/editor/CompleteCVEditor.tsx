import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { toast, Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@prosolutions/ui';
import { LanguageSelector } from '../../components/ui/LanguageSelector';
import { useCVEditorStore } from '../../stores/cvEditorStore';
import { useAuthStore } from '../../stores/authStore';
import { CVData, SectionType, SkillItem } from '../../types';
import { EditorTabs } from './EditorTabs';
import { TemplateRenderer, CVData as RendererCVData } from '../TemplateRenderer';
import { WithCustomStyles } from '../withCustomStyles';
import { CURATED_CV_TEMPLATES } from '../../utils/templateCatalog';
import { importCvFromFile, ParsedCvDraft } from '../../services/cvImport';
import { api } from '../../services/api';
import {
  ATSOptimizationPanel,
  ATSAnalysisResult,
  ATSHistoryComparison,
  ATSHistoryItem,
  ATSTailoringResult,
} from './ATSOptimizationPanel';
import { TemplateColorCustomizer } from './TemplateColorCustomizer';
import { TemplateSelector } from './components/TemplateSelector';
import { UpgradeTemplateModal } from './components/UpgradeTemplateModal';
import { BlockPalette, createEmptyItem } from './components/DraggableBlock';
import { AIPanel } from './components/AIPanel';
import { CustomizerPanel } from './components/CustomizerPanel';

// Import all section components
import { PersonalSection } from './sections/PersonalSection';
import { ExperienceSection } from './sections/ExperienceSection';
import { EducationSection } from './sections/EducationSection';
import { SkillsSection } from './sections/SkillsSection';
import { LanguagesSection } from './sections/LanguagesSection';
import { CertificatesSection } from './sections/CertificatesSection';
import { LinksSection } from './sections/LinksSection';

// Templates and Suggestions Components
import { TemplateSuggestions, AutoSaveIndicator, ValidationSummary, ImportReviewModal } from './components';

// Import custom styles
import '../../styles/cv-editor.css';

interface CompleteCVEditorProps {
  cvId?: string;
  className?: string;
}

const makeId = () => Math.random().toString(36).slice(2, 11);

function mergeUniqueBy<T>(current: T[], incoming: T[], keySelector: (item: T) => string): T[] {
  const seen = new Set(current.map((item) => keySelector(item).toLowerCase()));
  const additions = incoming.filter((item) => {
    const key = keySelector(item).toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  return [...current, ...additions];
}

function mergeCvDataWithParsed(current: CVData, parsed: ParsedCvDraft): Partial<CVData> {
  const safePersonal = parsed.personal ?? {};

  const incomingEmails = (safePersonal.emails || [])
    .filter((email) => email.value)
    .map((email, index) => ({
      id: `import-email-${makeId()}`,
      type: (email.type === 'work' ? 'work' : 'personal') as 'personal' | 'work',
      label: email.label || (index === 0 ? 'Email Personal' : 'Email Alterno'),
      value: email.value,
      isPrimary: index === 0,
    }));

  const incomingPhones = (safePersonal.phones || [])
    .filter((phone) => phone.number)
    .map((phone, index) => ({
      id: `import-phone-${makeId()}`,
      type: (phone.type === 'office' ? 'office' : phone.type === 'whatsapp' ? 'whatsapp' : 'personal') as 'personal' | 'office' | 'whatsapp',
      number: phone.number,
      label: phone.label || (index === 0 ? 'Telefono Personal' : 'Telefono Alterno'),
      isPrimary: index === 0,
    }));

  const mergedPersonal = {
    ...current.personal,
    fullName: current.personal.fullName || safePersonal.fullName || '',
    professionalTitle: current.personal.professionalTitle || safePersonal.professionalTitle || '',
    valueProposition: current.personal.valueProposition || safePersonal.valueProposition || '',
    showValuePropositionTitle: current.personal.showValuePropositionTitle ?? safePersonal.showValuePropositionTitle ?? true,
    summary: current.personal.summary || safePersonal.summary || '',
    address: current.personal.address || safePersonal.address || '',
    website: current.personal.website || safePersonal.website || '',
    linkedin: current.personal.linkedin || safePersonal.linkedin || '',
    github: current.personal.github || safePersonal.github || '',
    emails: mergeUniqueBy(current.personal.emails, incomingEmails, (item) => item.value),
    phones: mergeUniqueBy(current.personal.phones, incomingPhones, (item) => item.number),
  };

  const incomingExperience = (parsed.experience || []).map((item, index) => ({
    id: `import-exp-${makeId()}`,
    position: String(item.position || ''),
    company: String(item.company || ''),
    location: String(item.location || ''),
    employmentType: 'full-time' as const,
    startDate: String(item.startDate || ''),
    endDate: String(item.endDate || ''),
    isCurrentPosition: Boolean(item.isCurrentPosition),
    description: String(item.description || ''),
    achievements: Array.isArray(item.achievements) ? item.achievements.map((value) => String(value)) : [],
    technologies: Array.isArray(item.technologies) ? item.technologies.map((value) => String(value)) : [],
    order: current.experience.length + index,
  })).filter((item) => item.position && item.company);

  const incomingEducation = (parsed.education || []).map((item, index) => ({
    id: `import-edu-${makeId()}`,
    degree: String(item.degree || ''),
    institution: String(item.institution || ''),
    location: String(item.location || ''),
    fieldOfStudy: String(item.fieldOfStudy || ''),
    startDate: String(item.startDate || ''),
    endDate: String(item.endDate || ''),
    isCurrentlyStudying: Boolean(item.isCurrentlyStudying),
    gpa: '',
    activities: Array.isArray(item.activities) ? item.activities.map((value) => String(value)) : [],
    achievements: Array.isArray(item.achievements) ? item.achievements.map((value) => String(value)) : [],
    order: current.education.length + index,
  })).filter((item) => item.degree && item.institution);

  const incomingSkills = (parsed.skills || []).map((item, index) => ({
    id: `import-skill-${makeId()}`,
    name: String(item.name || ''),
    category: (String(item.category || '').toLowerCase() === 'soft' ? 'soft' : 'technical') as 'soft' | 'technical',
    level: 'intermediate' as const,
    yearsOfExperience: undefined,
    isCertified: Boolean(item.isCertified),
    order: current.skills.length + index,
  })).filter((item) => item.name && String((item as any).category || '').toLowerCase() !== 'certification');

  const incomingLanguages = (parsed.languages || []).map((item, index) => ({
    id: `import-lang-${makeId()}`,
    language: String(item.language || ''),
    listeningLevel: 'B1' as const,
    readingLevel: 'B1' as const,
    speakingLevel: 'B1' as const,
    writingLevel: 'B1' as const,
    certification: '',
    yearsOfStudy: undefined,
    order: current.languages.length + index,
  })).filter((item) => item.language);

  const incomingCertificates = (parsed.certificates || []).map((item, index) => ({
    id: `import-cert-${makeId()}`,
    title: String(item.title || ''),
    issuingOrganization: String(item.issuingOrganization || ''),
    issueDate: String(item.issueDate || ''),
    expiryDate: '',
    credentialId: '',
    verificationUrl: '',
    description: '',
    fileUrl: '',
    order: current.certificates.length + index,
  })).filter((item) => item.title);

  const incomingCertificatesFromSkills = (parsed.skills || [])
    .filter((item) => String((item as any).category || '').toLowerCase() === 'certification')
    .map((item, index) => ({
      id: `import-cert-skill-${makeId()}`,
      title: String(item.name || ''),
      issuingOrganization: '',
      issueDate: '',
      expiryDate: '',
      credentialId: '',
      verificationUrl: '',
      description: '',
      fileUrl: '',
      order: current.certificates.length + incomingCertificates.length + index,
    }))
    .filter((item) => item.title);

  const incomingLinks = (parsed.links || []).map((item, index) => ({
    id: `import-link-${makeId()}`,
    label: String(item.label || 'Link'),
    url: String(item.url || ''),
    type: 'other' as const,
    isVisible: true,
    order: current.links.length + index,
  })).filter((item) => item.url);

  return {
    personal: mergedPersonal,
    experience: mergeUniqueBy(current.experience, incomingExperience, (item) => `${item.position}-${item.company}`),
    education: mergeUniqueBy(current.education, incomingEducation, (item) => `${item.degree}-${item.institution}`),
    skills: mergeUniqueBy(current.skills, incomingSkills, (item) => item.name),
    languages: mergeUniqueBy(current.languages, incomingLanguages, (item) => item.language),
    certificates: mergeUniqueBy(current.certificates, [...incomingCertificates, ...incomingCertificatesFromSkills], (item) => item.title),
    links: mergeUniqueBy(current.links, incomingLinks, (item) => item.url),
  };
}

// Transform CV data to match TemplateRenderer format
  const transformCVDataForRenderer = (cvData: any): RendererCVData => {
    return {
      settings: {
        sidebarBg: cvData.settings?.sidebarBg,
        developerBg: cvData.settings?.developerBg,
        creativeGradient: cvData.settings?.creativeGradient,
        creativeIntensity: cvData.settings?.creativeIntensity,
        executiveTop: cvData.settings?.executiveTop,
        executiveAccent: cvData.settings?.executiveAccent,
        extensaTop: cvData.settings?.extensaTop,
        extensaAccent: cvData.settings?.extensaAccent,
        extensaDensity: cvData.settings?.extensaDensity,
        // Nuevos campos de personalización
        fontBody: cvData.settings?.fontBody,
        fontHeading: cvData.settings?.fontHeading,
        density: cvData.settings?.density,
        sectionSpacing: cvData.settings?.sectionSpacing,
        showSectionIcons: cvData.settings?.showSectionIcons,
        accentColor: cvData.settings?.accentColor,
        headingColor: cvData.settings?.headingColor,
        textColor: cvData.settings?.textColor,
        mutedTextColor: cvData.settings?.mutedTextColor,
        linkColor: cvData.settings?.linkColor,
        sidebarTextColor: cvData.settings?.sidebarTextColor,
        sidebarSectionTitleColor: cvData.settings?.sidebarSectionTitleColor,
      },
    personal: {
      name: cvData.personal?.fullName || '',
      role: cvData.personal?.professionalTitle || '',
      email: cvData.personal?.emails?.find((e: any) => e.isPrimary)?.value || '',
      phone: cvData.personal?.phones?.find((p: any) => p.isPrimary)?.number || '',
      emails: cvData.personal?.emails?.map((e: any) => ({
        value: e.value,
        type: e.type === 'personal' ? 'Personal' : 'Trabajo'
      })) || [],
      phones: cvData.personal?.phones?.map((p: any) => ({
        value: p.number,
        type: p.type === 'personal' ? 'Personal' : 'Trabajo'
      })) || [],
      address: cvData.personal?.address || '',
      city: cvData.personal?.city || '',
      country: cvData.personal?.country || '',
      valueProposition: cvData.personal?.valueProposition,
      showValuePropositionTitle: cvData.personal?.showValuePropositionTitle !== false,
      summary: cvData.personal?.summary || '',
      profileImage: cvData.personal?.profileImage || '',
      profileImageStyle: cvData.personal?.profileImageStyle || 'round',
      showAddress: cvData.personal?.showAddress !== false,
      showCity: cvData.personal?.showCity !== false,
      showCountry: cvData.personal?.showCountry !== false,
    },
    experience: cvData.experience?.map((exp: any) => ({
      id: exp.id,
      company: exp.company,
      role: exp.position,
      from: exp.startDate,
      to: exp.isCurrentPosition ? undefined : exp.endDate,
      description: exp.description,
      city: exp.location?.split(',')[0]?.trim() || '',
      country: exp.location?.split(',')[1]?.trim() || '',
    })) || [],
    education: cvData.education?.map((edu: any) => ({
      id: edu.id,
      institution: edu.institution,
      degree: edu.degree,
      from: edu.startDate,
      to: edu.isCurrentlyStudying ? undefined : edu.endDate,
      city: edu.location?.split(',')[0]?.trim() || '',
      country: edu.location?.split(',')[1]?.trim() || '',
    })) || [],
    skills: cvData.skills?.map((skill: any) => ({
      id: skill.id,
      name: skill.name,
      level: skill.level === 'beginner' ? 1 :
             skill.level === 'intermediate' ? 2 :
             skill.level === 'advanced' ? 3 :
             skill.level === 'expert' ? 4 : 0,
    })) || [],
    languages: cvData.languages?.map((lang: any) => ({
      id: lang.id,
      name: lang.language,
      level: lang.listeningLevel || 'B1',
      certificateUrl: lang.certification || '',
    })) || [],
    certificates: cvData.certificates?.map((cert: any) => ({
      id: cert.id,
      title: cert.title,
      url: cert.verificationUrl || '',
    })) || [],
    links: cvData.links?.reduce((acc: any, link: any) => {
      if (link.isVisible) {
        acc[link.label.toLowerCase().replace(/\s+/g, '_')] = link.url;
      }
      return acc;
    }, {}) || {},
  };
};

export const CompleteCVEditor: React.FC<CompleteCVEditorProps> = ({
  cvId,
  className = '',
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { toggle } = useTheme();
  const { user, isAuthenticated } = useAuthStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
  }));
  const {
    // State
    cvData,
    activeSection,
    isLoading,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    validationErrors,
    isGuest,

    // Actions
    setActiveSection,
    updatePersonal,
    updateExperience,
    updateEducation,
    updateSkills,
    updateLanguages,
    updateCertificates,
    updateLinks,
    updateCvData,
    saveCV,
    loadCV,
    resetCV,
    validateSection,
    getSectionCompletion,
    loadTemplates,
    setTemplate,
    setIsGuest,
  } = useCVEditorStore();

  const [showPreview, setShowPreview] = useState(true);
  const [panelSizes, setPanelSizes] = useState({ editor: 50, preview: 50 });
  const [isImporting, setIsImporting] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsResult, setAtsResult] = useState<ATSAnalysisResult | null>(null);
  const [atsHistory, setAtsHistory] = useState<ATSHistoryItem[]>([]);
  const [atsComparison, setAtsComparison] = useState<ATSHistoryComparison | null>(null);
  const [tailoringResult, setTailoringResult] = useState<ATSTailoringResult | null>(null);
  const [tailoringLoading, setTailoringLoading] = useState(false);
  const [importReviewOpen, setImportReviewOpen] = useState(false);
  const [pendingImportFileName, setPendingImportFileName] = useState('');
  const [pendingImportData, setPendingImportData] = useState<ParsedCvDraft | null>(null);
  const [pendingMergedData, setPendingMergedData] = useState<Partial<CVData> | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showBlockPalette, setShowBlockPalette] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load CV data on mount
  useEffect(() => {
    // Activate guest mode when there is no authenticated session and no cvId
    if (!isAuthenticated && !cvId) {
      setIsGuest(true);
    } else if (isAuthenticated && isGuest) {
      setIsGuest(false);
    }

    if (cvId) {
      loadCV(cvId);
    }
    loadTemplates();
  }, [cvId, loadCV, loadTemplates, isAuthenticated, isGuest, setIsGuest]);

  // Auto-save functionality
  useEffect(() => {
    if (!hasUnsavedChanges || isSaving) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        await saveCV();
      } catch {
        toast.error(t('cv.errorSave'));
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [hasUnsavedChanges, isSaving, saveCV]);

  // Handle section change with validation
  const handleSectionChange = useCallback((section: SectionType) => {
    // Validate current section before switching
    const isCurrentValid = validateSection(activeSection);

    if (!isCurrentValid) {
      toast.error(t('editor.validationBeforeChange', { section: activeSection }));
      return;
    }

    setActiveSection(section);
  }, [activeSection, validateSection, setActiveSection, t]);

  // Handle manual save
  const handleSave = useCallback(async () => {
    try {
      await saveCV();
      toast.success(t('cv.saveSuccess'));
    } catch (error) {
      toast.error(t('cv.errorSave'));
    }
  }, [saveCV, t]);

  // Handle reset
  const handleReset = useCallback(() => {
    if (window.confirm(t('editor.confirmReset'))) {
      resetCV();
      toast.success(t('editor.resetSuccess'));
    }
  }, [resetCV, t]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAnalyzeATS = useCallback(async () => {
    try {
      setAtsLoading(true);
      const endpoint = cvId ? `/cvs/${cvId}/analyze` : '/cvs/analyze-draft';
      const response = await api.post(endpoint, {
        jobDescription,
        data: cvData,
      });
      setAtsResult(response.data.analysis || null);
      if (response.data?.history) {
        setAtsHistory(response.data.history.history || []);
        setAtsComparison(response.data.history.comparison || null);
      }
      toast.success(t("workspace.toast.atsAnalysisCompleted"));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("workspace.toast.atsAnalysisError"));
    } finally {
      setAtsLoading(false);
    }
  }, [cvData, jobDescription, cvId]);

  const handleTailorATS = useCallback(async () => {
    try {
      setTailoringLoading(true);
      const endpoint = cvId ? `/cvs/${cvId}/tailor` : '/cvs/tailor-draft';
      const response = await api.post(endpoint, {
        jobDescription,
        data: cvData,
      });
      setTailoringResult(response.data.tailoring || null);
      toast.success(t("workspace.toast.tailoringCompleted"));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("workspace.toast.tailoringError"));
    } finally {
      setTailoringLoading(false);
    }
  }, [cvData, jobDescription, cvId]);

  const handleApplyTailoring = useCallback(() => {
    if (!tailoringResult) {
      return;
    }

    updatePersonal({
      ...cvData.personal,
      summary: tailoringResult.summary || cvData.personal.summary,
    });

    if (tailoringResult.experience.length > 0) {
      const byId = new Map(tailoringResult.experience.map((item) => [item.id, item]));
      const updatedExperience = cvData.experience.map((item, index) => {
        const matchById = item.id ? byId.get(item.id) : undefined;
        const matchByIndex = tailoringResult.experience.find((row) => row.index === index);
        const next = matchById || matchByIndex;
        if (!next) {
          return item;
        }
        return {
          ...item,
          description: next.tailored,
        };
      });
      updateExperience(updatedExperience);
    }

    setActiveSection('experience');
    toast.success(t("workspace.toast.tailoringApplied"));
  }, [tailoringResult, cvData.personal, cvData.experience, updatePersonal, updateExperience, setActiveSection]);

  useEffect(() => {
    if (!cvId) {
      setAtsHistory([]);
      setAtsComparison(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await api.get(`/cvs/${cvId}/ats-history`);
        if (cancelled) {
          return;
        }
        setAtsHistory(response.data.history || []);
        setAtsComparison(response.data.comparison || null);
      } catch {
        if (!cancelled) {
          setAtsHistory([]);
          setAtsComparison(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cvId]);

  const handleApplyMissingKeywords = useCallback(() => {
    if (!atsResult || atsResult.missingKeywords.length === 0) {
      return;
    }

    const existing = new Set(cvData.skills.map((item) => item.name.trim().toLowerCase()));
    const additions: SkillItem[] = atsResult.missingKeywords
      .slice(0, 10)
      .filter((keyword) => !existing.has(keyword.toLowerCase()))
      .map((keyword, index) => ({
        id: `ats-skill-${Date.now()}-${index}`,
        name: keyword,
        category: 'technical',
        level: 'intermediate',
        yearsOfExperience: undefined,
        isCertified: false,
        certificationName: '',
        order: cvData.skills.length + index,
      }));

    if (additions.length === 0) {
      toast('No hay nuevas keywords para agregar');
      return;
    }

    updateSkills([...cvData.skills, ...additions]);
    setActiveSection('skills');
    toast.success(t("workspace.toast.keywordsAdded", "{{count}} keywords agregadas a skills", { count: additions.length }));
  }, [atsResult, cvData.skills, setActiveSection, updateSkills]);

  const handleFileImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsImporting(true);
      const { parsedData } = await importCvFromFile(file);
      const merged = mergeCvDataWithParsed(cvData, parsedData);
      setPendingImportFileName(file.name);
      setPendingImportData(parsedData);
      setPendingMergedData(merged);
      setImportReviewOpen(true);
    } catch (error) {
      toast.error(t('editor.importer.error'));
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  }, [cvData, t, updateCvData]);

  const handleCancelImportReview = useCallback(() => {
    setImportReviewOpen(false);
    setPendingImportData(null);
    setPendingMergedData(null);
    setPendingImportFileName('');
  }, []);

  const handleApplyImportReview = useCallback(() => {
    if (!pendingMergedData) {
      return;
    }

    updateCvData(pendingMergedData);
    toast.success(t('editor.importer.success'));
    handleCancelImportReview();
  }, [handleCancelImportReview, pendingMergedData, t, updateCvData]);

  // Export PDF using html2pdf.js - works with local guest state (no cvId required)
  const handleExportPdf = useCallback(async () => {
    try {
      setIsExportingPdf(true);
      toast.loading(t("workspace.export.generatingPdf"), { id: "pdf-export" });

      const element = previewRef.current;
      if (!element) {
        toast.error(t("workspace.errors.exportContentNotFound"), { id: "pdf-export" });
        setIsExportingPdf(false);
        return;
      }

      const options = {
        margin: 0.5,
        filename: `${(cvData.title || 'cv').replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" as const },
      };

      const html2pdf = (await import("html2pdf.js")).default;

      html2pdf()
        .set(options)
        .from(element)
        .save()
        .then(() => {
          toast.success(t("workspace.export.pdfSuccess"), { id: "pdf-export" });
        })
        .catch((error: any) => {
          console.error("PDF export error:", error);
          toast.error(t("workspace.errors.exportPdf"), { id: "pdf-export" });
        })
        .finally(() => {
          setIsExportingPdf(false);
        });
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(t("workspace.errors.exportPdf"), { id: "pdf-export" });
      setIsExportingPdf(false);
    }
  }, [cvData.title, t]);

  // Get completion status for all sections
  const completionStatus = {
    personal: getSectionCompletion('personal'),
    experience: getSectionCompletion('experience'),
    education: getSectionCompletion('education'),
    skills: getSectionCompletion('skills'),
    languages: getSectionCompletion('languages'),
    certificates: getSectionCompletion('certificates'),
    links: getSectionCompletion('links'),
  };

  // Handle adding a new block item from the palette
  const handleAddBlock = (type: "experience" | "education" | "skills" | "languages" | "certificates" | "links") => {
    const newItem = createEmptyItem(type);
    if (!newItem) return;

    switch (type) {
      case "experience":
        updateExperience([...cvData.experience, newItem]);
        break;
      case "education":
        updateEducation([...cvData.education, newItem]);
        break;
      case "skills":
        updateSkills([...cvData.skills, newItem]);
        break;
      case "languages":
        updateLanguages([...cvData.languages, newItem]);
        break;
      case "certificates":
        updateCertificates([...cvData.certificates, newItem]);
        break;
      case "links":
        updateLinks([...cvData.links, newItem]);
        break;
      default:
        break;
    }

    // Switch to the section where the block was added
    setActiveSection(type);
    toast.success(t('editor.block.added', 'Bloque agregado'));
  };

  // Render active section
  const renderActiveSection = () => {
    const commonProps = {
      errors: validationErrors,
      isLoading,
    };

      switch (activeSection) {
        case 'personal':
          return (
            <PersonalSection
              data={cvData.personal}
              onChange={updatePersonal}
              {...commonProps}
            />
          );
      case 'experience':
        return (
          <ExperienceSection
            data={cvData.experience}
            onChange={updateExperience}
            {...commonProps}
          />
        );
      case 'education':
        return (
          <EducationSection
            data={cvData.education}
            onChange={updateEducation}
            {...commonProps}
          />
        );
      case 'skills':
        return (
          <SkillsSection
            data={cvData.skills}
            onChange={updateSkills}
            {...commonProps}
          />
        );
      case 'languages':
        return (
          <LanguagesSection
            data={cvData.languages}
            onChange={updateLanguages}
            {...commonProps}
          />
        );
      case 'certificates':
        return (
          <CertificatesSection
            data={cvData.certificates}
            onChange={updateCertificates}
            {...commonProps}
          />
        );
      case 'links':
        return (
          <LinksSection
            data={cvData.links}
            onChange={updateLinks}
            {...commonProps}
          />
        );
      default:
        return null;
    }
  };

  // Handle panel resize
  const handleResize = (e: MouseEvent) => {
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const percentage = ((e.clientX - rect.left) / rect.width) * 100;

    setPanelSizes({
      editor: Math.max(30, Math.min(70, percentage)),
      preview: Math.max(30, Math.min(70, 100 - percentage)),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-600">{t('editor.loadingEditor')}</span>
        </div>
      </div>
    );
  }

  // Guest banner component - only rendered when isGuest === true
  const GuestBanner = () => (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 dark:bg-amber-950/30 dark:border-amber-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
          <span className="text-sm text-amber-800 dark:text-amber-200">
            Estás en Modo Invitado. Tus cambios se guardan automáticamente en tu navegador.
          </span>
        </div>
        <a
          href="/register"
          className="inline-flex items-center px-3 py-1 text-xs font-medium text-amber-900 bg-amber-100 rounded-md hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900/70 transition-colors"
        >
          Guardar en la nube (Gratis)
          <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      </div>
    </div>
  );

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
      >
        <div className={`cv-editor min-h-screen bg-gradient-to-br from-brand-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 ${className}`}>
          <ImportReviewModal
            isOpen={importReviewOpen}
            fileName={pendingImportFileName}
            parsedData={pendingImportData}
            onCancel={handleCancelImportReview}
            onApply={handleApplyImportReview}
          />

          {isGuest && <GuestBanner />}

          {/* Header */}
          <div className="border-b border-brand-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                    <span className="text-brand-600">Pro</span>
                    <span className="text-brand-700">CV</span>
                    <span className="ml-2 font-normal text-gray-600 dark:text-slate-300">- {cvData.title}</span>
                  </h1>
                </div>
              </div>
              <AutoSaveIndicator
                isSaving={isSaving}
                lastSaved={lastSaved}
                hasUnsavedChanges={hasUnsavedChanges}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="hidden"
                onChange={handleFileImport}
              />

              <button
                onClick={() => setShowPreview(!showPreview)}
                className="inline-flex items-center rounded-md border border-brand-300 bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:border-brand-700 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/40"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {showPreview ? t('editor.actions.hide') : t('editor.actions.show')} {t('editor.actions.preview')}
              </button>

              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="inline-flex items-center rounded-md border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-700 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/40"
              >
                {isImporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-brand-700" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    {t('editor.importer.loading')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    {t('editor.importer.button')}
                  </>
                )}
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('dashboard.saving')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('editor.actions.save')}
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                className="inline-flex items-center rounded-md border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:border-brand-700 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/40"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('editor.actions.reset')}
              </button>

              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="inline-flex items-center rounded-md border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
              >
                {isExportingPdf ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    {t('dashboard.saving')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                      PDF
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggle}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
                  aria-label={theme === "dark" ? t("theme.light", "Light") : t("theme.dark", "Dark")}
                  title={theme === "dark" ? t("theme.light", "Light") : t("theme.dark", "Dark")}
                >
                  {theme === "dark" ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  <span className="hidden text-sm font-medium sm:inline">
                    {theme === "dark" ? t("theme.light", "Light") : t("theme.dark", "Dark")}
                  </span>
                </button>
                <LanguageSelector />
              </div>
            </div>
        </div>

        {/* Navigation Tabs */}
        <EditorTabs
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          completionStatus={completionStatus}
        />

        {/* Main Content */}
        <div className="flex" style={{ height: 'calc(100vh - 140px)' }}>
          {/* Editor Panel */}
          <div
            className="overflow-y-auto border-r border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900"
            style={{ width: showPreview ? `${panelSizes.editor}%` : '100%' }}
          >
            <div className="p-6">
              <ATSOptimizationPanel
                jobDescription={jobDescription}
                onJobDescriptionChange={setJobDescription}
                onAnalyze={handleAnalyzeATS}
                onTailor={handleTailorATS}
                onApplyMissingKeywords={handleApplyMissingKeywords}
                onApplyTailoring={handleApplyTailoring}
                loading={atsLoading}
                tailoringLoading={tailoringLoading}
                result={atsResult}
                tailoringResult={tailoringResult}
                history={atsHistory}
                comparison={atsComparison}
              />
              <div className="mt-4">
                <CustomizerPanel
                  settings={cvData.settings || {}}
                  onSettingsChange={(nextSettings) => updateCvData({ settings: nextSettings })}
                />
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                  className="inline-flex items-center rounded-md border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:border-brand-700 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/40"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  {t('editor.templateSelector.title', 'Selector de plantilla')}
                </button>
              </div>

              {showTemplateSelector && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t('editor.templateSelector.title', 'Selector de plantilla')}
                  </h4>
                  <TemplateSelector
                    templates={CURATED_CV_TEMPLATES}
                    currentTemplate={cvData.template}
                    isGuest={isGuest}
                    onTemplateSelect={setTemplate}
                    onLockedClick={() => setShowUpgradeModal(true)}
                  />
                </div>
              )}

              {/* Block Palette - Drag & Drop style block addition */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowBlockPalette(!showBlockPalette)}
                  className="inline-flex items-center rounded-md border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('editor.block.paletteToggle', '+Añadir bloque')}
                </button>
              </div>

              {showBlockPalette && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
                  <BlockPalette onAdd={handleAddBlock} />
                </div>
              )}

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowAIPanel(!showAIPanel)}
                  className="inline-flex items-center rounded-md border border-purple-300 bg-white px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:border-purple-700 dark:bg-slate-900 dark:text-purple-300 dark:hover:bg-purple-950/40"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 6.364m-.707 7.507a4 4 0 11-5.656-5.656 4 4 0 015.656 5.656m-5.656-5.656a4 4 0 10-5.656 5.656 4 4 0 005.656-5.656" />
                  </svg>
                  {showAIPanel ? t('editor.ai.hide', 'Ocultar IA') : t('editor.ai.show', 'Asistente IA')}
                </button>
              </div>

              {showAIPanel && (
                <div className="mt-4">
                  <AIPanel
                    cvData={cvData}
                    onApply={(section, content) => {
                      if (section === 'summary') {
                        updatePersonal({ ...cvData.personal, summary: content });
                      } else if (section === 'skills') {
                        const newSkills = content.split(',').map((name, index) => ({
                          id: `ai-skill-${Date.now()}-${index}`,
                          name: name.trim(),
                          category: 'technical' as const,
                          level: 'intermediate' as const,
                          yearsOfExperience: undefined,
                          isCertified: false,
                          certificationName: '',
                          order: cvData.skills.length + index,
                        }));
                        updateSkills([...cvData.skills, ...newSkills]);
                      }
                      toast.success(t('editor.ai.applied', 'Contenido de IA aplicado'));
                    }}
                  />
                </div>
              )}

              {/* Template Suggestions */}
              <TemplateSuggestions section={activeSection} />

              {/* Validation Summary */}
              <ValidationSummary errors={validationErrors} section={activeSection} />

              {/* Active Section Content */}
              <div className="mt-6">
                {renderActiveSection()}
              </div>
            </div>
          </div>

          {/* Resize Handle */}
          {showPreview && (
            <div
              className="w-1 cursor-col-resize bg-gray-300 transition-colors hover:bg-gray-400 dark:bg-slate-700 dark:hover:bg-slate-600"
              onMouseDown={(e) => {
                e.preventDefault();
                document.addEventListener('mousemove', handleResize);
                document.addEventListener('mouseup', () => {
                  document.removeEventListener('mousemove', handleResize);
                });
              }}
            />
          )}

          {/* Preview Panel */}
          {showPreview && (
            <div
              className="overflow-y-auto bg-gray-50 dark:bg-slate-950"
              style={{ width: `${panelSizes.preview}%` }}
            >
              <div className="p-6">
                <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-900">
                  <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-slate-100">
                    {t('editor.cvPreview')}
                  </h3>

                  <div className="transform scale-75 origin-top" ref={previewRef}>
                    <WithCustomStyles
                      template={cvData.template}
                      data={transformCVDataForRenderer(cvData)}
                    />
                  </div>

                  {/* Guest ad slot - flexible container for affiliate banners or display ads */}
          {isGuest && (
            <div id="guest-ad-slot" className="mt-4 border-t border-gray-200 dark:border-slate-700 pt-4">
              <div className="h-24 bg-gray-100 dark:bg-slate-800 rounded-md flex items-center justify-center text-xs text-gray-400 dark:text-slate-500">
                {t('editor.guest.adSlot', 'Espacio de anuncios (Afiliados / Display)')}
              </div>
            </div>
          )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Toast Notifications */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <UpgradeTemplateModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      </div>
    </DndContext>
  </>
  );
};
