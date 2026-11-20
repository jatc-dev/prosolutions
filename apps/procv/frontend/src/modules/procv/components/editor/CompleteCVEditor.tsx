import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { toast, Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useCVEditorStore } from "../../../../shared/stores/cvEditorStore";
import { useAuthStore } from "../../../../shared/stores/authStore";
import { CVData, SectionType, SkillItem } from "../../../../shared/types";
import { EditorTabs } from "./EditorTabs";
import { changeEditorSection } from "./navigationValidation";
import { TemplateRenderer, CVData as RendererCVData } from "../TemplateRenderer";
import { WithCustomStyles } from "../withCustomStyles";
import { CoverLetterPreview } from "../CoverLetterPreview";
import { CoverLetterSection } from "./sections/CoverLetterSection";
import { placeholdersIn } from "../../coverLetter";
import { CURATED_CV_TEMPLATES } from "../../../../shared/utils/templateCatalog";
import { importCvFromFile, ParsedCvDraft } from "../../../../shared/services/cvImport";
import { api } from "../../../../shared/services/api";
import {
  ATSOptimizationPanel,
  ATSAnalysisResult,
  ATSHistoryComparison,
  ATSHistoryItem,
  ATSTailoringResult,
} from "./ATSOptimizationPanel";
import { TemplateColorCustomizer } from "./TemplateColorCustomizer";
import { TemplateSelector } from "./components/TemplateSelector";
import { BlockPalette, createEmptyItem } from "./components/DraggableBlock";
import { CustomizerPanel } from "./components/CustomizerPanel";
import { EditorDisclosure } from "./components/EditorDisclosure";
import { AIPanel } from "./components/AIPanel";
import { useAuthenticatedCVLoader } from "./useAuthenticatedCVLoader";

// Import all section components
import { PersonalSection } from "./sections/PersonalSection";
import { ExperienceSection } from "./sections/ExperienceSection";
import { EducationSection } from "./sections/EducationSection";
import { SkillsSection } from "./sections/SkillsSection";
import { LanguagesSection } from "./sections/LanguagesSection";
import { CertificatesSection } from "./sections/CertificatesSection";
import { LinksSection } from "./sections/LinksSection";
import { Format1003Fields } from "./sections/EmploymentApplicationSection";

// Templates and Suggestions Components
import { AutoSaveIndicator, ValidationSummary, ImportReviewModal } from "./components";

// Import custom styles
import "../../styles/cv-editor.css";

interface CompleteCVEditorProps {
  cvId?: string;
  className?: string;
}

/** Compact document glyph used by the editor header. */
function EditorBrandGlyph() {
  return (
    <svg className="w-5 h-5 text-brand-800 dark:text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
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

export function mergeCvDataWithParsed(current: CVData, parsed: ParsedCvDraft): Partial<CVData> {
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
  })).filter((item) =>
    item.position &&
    item.company &&
    item.startDate &&
    item.description.trim().length >= 10,
  );

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
  })).filter((item) => item.degree && item.institution && item.startDate);

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
  })).filter((item) => item.title && item.issuingOrganization.trim().length >= 2);

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
      .filter((item) => item.title && item.issuingOrganization.trim().length >= 2);

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
      name: cvData.personal?.showFullName === false ? '' : (cvData.personal?.fullName || ''),
      role: cvData.personal?.showProfessionalTitle === false ? '' : (cvData.personal?.professionalTitle || ''),
      email: cvData.personal?.emails?.find((e: any) => e.isPrimary && e.isVisible !== false)?.value || '',
      phone: cvData.personal?.phones?.find((p: any) => p.isPrimary && p.isVisible !== false)?.number || '',
      emails: cvData.personal?.emails?.filter((e: any) => e.isVisible !== false).map((e: any) => ({
        value: e.value,
        type: e.type === 'personal' ? 'Personal' : 'Trabajo'
      })) || [],
      phones: cvData.personal?.phones?.filter((p: any) => p.isVisible !== false).map((p: any) => ({
        value: p.number,
        type: p.type === 'personal' ? 'Personal' : 'Trabajo'
      })) || [],
      address: cvData.personal?.address || '',
      city: cvData.personal?.city || '',
      country: cvData.personal?.country || '',
      nationality: cvData.personal?.showNationality === false ? '' : (cvData.personal?.nationality || ''),
      documentType: cvData.personal?.showDocumentType === false ? '' : (cvData.personal?.documentType || ''),
      documentNumber: cvData.personal?.showDocumentNumber === false ? '' : (cvData.personal?.documentNumber || ''),
      showDocumentIdentity: Boolean(cvData.personal?.showDocumentIdentity),
      sidebarIntroMode: cvData.personal?.sidebarIntroMode || 'valueProposition',
      references: cvData.personal?.references?.filter((item: any) => item.isVisible !== false) || [],
      showReferences: cvData.personal?.showReferences !== false,
      referencesAvailableOnRequest: Boolean(cvData.personal?.referencesAvailableOnRequest),
      valueProposition: cvData.personal?.valueProposition,
      showValuePropositionTitle: cvData.personal?.showValuePropositionTitle !== false,
      showValuePropositionContent: cvData.personal?.showValuePropositionContent !== false,
      summary: cvData.personal?.summary || '',
      showSummaryTitle: cvData.personal?.showSummaryTitle !== false,
      showSummaryContent: cvData.personal?.showSummaryContent !== false,
      profileImage: cvData.personal?.profileImage || '',
      profileImageStyle: cvData.personal?.profileImageStyle || 'round',
      profileImageSize: cvData.personal?.profileImageSize || 'md',
      showProfileImage: cvData.personal?.showProfileImage !== false,
      birthDate: cvData.personal?.birthDate || '',
      showBirthDate: Boolean(cvData.personal?.showBirthDate),
      showAge: Boolean(cvData.personal?.showAge),
      showAddress: cvData.personal?.showAddress !== false,
      showCity: cvData.personal?.showCity !== false,
      showCountry: cvData.personal?.showCountry !== false,
    },
    experience: cvData.experience?.filter((exp: any) => exp.isVisible !== false).map((exp: any) => ({
      id: exp.id,
      company: exp.company,
      role: exp.position,
      from: exp.startDate,
      to: exp.isCurrentPosition ? undefined : exp.endDate,
      // Achievements ("Logros destacados") are printed as bullets under the description.
      description: [
        String(exp.description || '').trim(),
        ...(Array.isArray(exp.achievements) ? exp.achievements : [])
          .map((item: unknown) => String(item || '').trim())
          .filter(Boolean)
          .map((item: string) => `• ${item}`),
      ].filter(Boolean).join('\n'),
      city: exp.location?.split(',')[0]?.trim() || '',
      country: exp.location?.split(',')[1]?.trim() || '',
    })) || [],
    education: cvData.education?.filter((edu: any) => edu.isVisible !== false).map((edu: any) => ({
      id: edu.id,
      institution: edu.institution,
      degree: edu.degree,
      from: edu.startDate,
      to: edu.isCurrentlyStudying ? undefined : edu.endDate,
      city: edu.location?.split(',')[0]?.trim() || '',
      country: edu.location?.split(',')[1]?.trim() || '',
    })) || [],
    skills: cvData.skills?.filter((skill: any) => skill.isVisible !== false).map((skill: any) => ({
      id: skill.id,
      name: skill.name,
      level: skill.level === 'beginner' ? 1 :
             skill.level === 'intermediate' ? 2 :
             skill.level === 'advanced' ? 3 :
             skill.level === 'expert' ? 4 : 0,
    })) || [],
    languages: cvData.languages?.filter((lang: any) => lang.isVisible !== false).map((lang: any) => ({
      id: lang.id,
      name: lang.language,
      level: lang.listeningLevel || 'B1',
      certificateUrl: lang.certification || '',
    })) || [],
    certificates: cvData.certificates?.filter((cert: any) => cert.isVisible !== false).map((cert: any) => ({
      id: cert.id,
      title: cert.title,
      url: cert.verificationUrl || '',
    })) || [],
    application: cvData.application || {},
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
  const { user, isAuthenticated, authLoading } = useAuthStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    authLoading: state.loading,
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
    validateField,
    validateSection,
    getSectionCompletion,
    setTemplate,
    setIsGuest,
  } = useCVEditorStore();

  // Which document is being edited: the CV or its cover letter (remembered per browser).
  const [docMode, setDocMode] = useState<'cv' | 'letter'>(() => {
    try {
      return localStorage.getItem('procv.editor.mode') === 'letter' ? 'letter' : 'cv';
    } catch {
      return 'cv';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('procv.editor.mode', docMode);
    } catch {
      // Storage may be blocked; the mode simply resets on reload.
    }
  }, [docMode]);

  const [showPreview, setShowPreview] = useState(() =>
    typeof window === "undefined" || !window.matchMedia
      ? true
      : window.matchMedia("(min-width: 769px)").matches,
  );
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
  const showAIPanel = false;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Activate guest mode when there is no authenticated session and no cvId.
  useEffect(() => {
    if (!isAuthenticated && !cvId) {
      setIsGuest(true);
    } else if (isAuthenticated && isGuest) {
      setIsGuest(false);
    }
  }, [cvId, isAuthenticated, isGuest, setIsGuest]);

  useAuthenticatedCVLoader({
    cvId,
    authLoading,
    isAuthenticated,
    loadCV,
  });

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

  // The 1003 data used to have its own tab; it now lives inside "personal".
  useEffect(() => {
    if (activeSection === 'application') setActiveSection('personal');
  }, [activeSection, setActiveSection]);

  // Handle section change with validation
  const handleSectionChange = useCallback((section: SectionType) => {
    const changed = changeEditorSection(activeSection, section, validateSection, setActiveSection);
    if (!changed) {
      toast.error(t('editor.validationBeforeChange', { section: activeSection }));
    }
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

  const handleApplyImportReview = useCallback((reviewedData: ParsedCvDraft) => {
    if (!pendingMergedData) {
      return;
    }

    updateCvData(mergeCvDataWithParsed(cvData, reviewedData));
    toast.success(t('editor.importer.success'));
    handleCancelImportReview();
  }, [cvData, handleCancelImportReview, pendingMergedData, t, updateCvData]);

  // Export PDF using html2pdf.js - works with local guest state (no cvId required)
  const handleExportPdf = useCallback(async () => {
    try {
      setIsExportingPdf(true);
      toast.loading(t("workspace.export.generatingPdf"), { id: "pdf-export" });

      if (docMode === 'letter' && placeholdersIn(cvData.coverLetter?.body).length > 0
        && !window.confirm('Tu carta todavía tiene textos entre corchetes por completar. ¿Descargarla de todos modos?')) {
        toast.dismiss("pdf-export");
        setIsExportingPdf(false);
        return;
      }
      const element = previewRef.current;
      if (!element) {
        toast.error(t("workspace.errors.exportContentNotFound"), { id: "pdf-export" });
        setIsExportingPdf(false);
        return;
      }

      const options = {
        margin: 0.12, // ~3 mm on each side
        filename: `${docMode === 'letter' ? 'carta_' : ''}${(cvData.title || 'cv').replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`,
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
  }, [cvData.title, cvData.coverLetter?.body, docMode, t]);

  // Get completion status for all sections
  const completionStatus = {
    personal: getSectionCompletion('personal'),
    experience: getSectionCompletion('experience'),
    education: getSectionCompletion('education'),
    skills: getSectionCompletion('skills'),
    languages: getSectionCompletion('languages'),
    certificates: getSectionCompletion('certificates'),
    links: getSectionCompletion('links'),
    application: Boolean(cvData.application && Object.values(cvData.application).some((value) => String(value || '').trim())),
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
            <>
              <PersonalSection
                data={cvData.personal}
                onChange={updatePersonal}
                onValidateField={validateField}
                {...commonProps}
              />
              {cvData.template === 'employment' ? (
                <Format1003Fields data={cvData.application || {}} onChange={(application) => updateCvData({ application })} isLoading={commonProps.isLoading} />
              ) : null}
            </>
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-700"></div>
          <span className="text-lg text-slate-600">{t('editor.loadingEditor')}</span>
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
          href="/auth"
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
        <div className={`cv-editor ui-page flex min-h-full flex-1 flex-col bg-ui-bg ${showPreview ? "cv-editor-preview-open" : ""} ${className}`}>
          <ImportReviewModal
            isOpen={importReviewOpen}
            fileName={pendingImportFileName}
            parsedData={pendingImportData}
            onCancel={handleCancelImportReview}
            onApply={handleApplyImportReview}
          />

          {isGuest && <GuestBanner />}

          {/* Header */}
          <div className="cv-editor-header-bar border-b border-brand-200 bg-white px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:px-4">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
            <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-950">
                  <EditorBrandGlyph />
                </div>
                <h1 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                  <span className="text-brand-800 dark:text-brand-300">{t("procv.name", "ProCV")}</span>
                  <span className="ml-2 font-normal text-slate-600 dark:text-slate-300">- {cvData.title}</span>
                </h1>
              </div>

              <AutoSaveIndicator
                isSaving={isSaving}
                lastSaved={lastSaved}
                hasUnsavedChanges={hasUnsavedChanges}
              />

            </div>

            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="hidden"
                onChange={handleFileImport}
              />

              <button
                onClick={() => setShowPreview(!showPreview)}
                aria-label={`${showPreview ? t('editor.actions.hide') : t('editor.actions.show')} ${t('editor.actions.preview')}`}
                title={`${showPreview ? t('editor.actions.hide') : t('editor.actions.show')} ${t('editor.actions.preview')}`}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-brand-300 bg-white px-2 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700 dark:border-brand-900 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/40 sm:px-3"
              >
                <svg className="h-4 w-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="hidden sm:inline">{showPreview ? t('editor.actions.hide') : t('editor.actions.show')} {t('editor.actions.preview')}</span>
              </button>

              <button
                onClick={handleImportClick}
                disabled={isImporting}
                aria-label={t('editor.importer.button')}
                title={t('editor.importer.button')}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-brand-300 bg-white px-2 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-900 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/40 sm:px-4"
              >
                {isImporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-brand-900" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    {t('editor.importer.loading')}
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <span className="hidden sm:inline">{t('editor.importer.button')}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                aria-label={t('editor.actions.save')}
                title={t('editor.actions.save')}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-transparent bg-brand-800 px-2 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
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
                    <svg className="h-4 w-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="hidden sm:inline">{t('editor.actions.save')}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                aria-label={t('editor.actions.reset')}
                title={t('editor.actions.reset')}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-brand-300 bg-white px-2 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700 dark:border-brand-900 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/40 sm:px-4"
              >
                <svg className="h-4 w-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">{t('editor.actions.reset')}</span>
              </button>

              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                aria-label={`${t('editor.actions.export', 'Export')} PDF`}
                title={`${t('editor.actions.export', 'Export')} PDF`}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-transparent bg-brand-600 px-2 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
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
                    <svg className="h-4 w-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="hidden sm:inline">PDF</span>
                    </>
                  )}
                </button>

              </div>
            </div>
        </div>

        {/* Document switch: CV or cover letter */}
        <div className="flex justify-center border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
          <div role="tablist" aria-label="Documento" className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {([['cv', 'Hoja de vida'], ['letter', 'Carta de presentación']] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={docMode === mode}
                onClick={() => setDocMode(mode)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${docMode === mode ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        {docMode === 'cv' ? (
        <div className="cv-editor-tabs">
          <EditorTabs
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            completionStatus={completionStatus}
          />
        </div>
        ) : null}

        {/* Main Content */}
        <div className="cv-editor-workspace flex" style={{ height: 'calc(100vh - 140px)' }}>
          {/* Editor Panel */}
          <div
            className="cv-editor-panel min-w-0 overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
            style={{ width: showPreview ? `${panelSizes.editor}%` : '100%' }}
          >
            <div className="p-4 sm:p-6">
              <EditorDisclosure
                storageKey="procv.editor.template-selector"
                title={t("editor.templateSelector.title", "Selector de plantilla")}
                description={t("editor.templateSelector.hint", "Selecciona el diseño de tu hoja de vida")}
              >
                <TemplateSelector
                  templates={CURATED_CV_TEMPLATES}
                  currentTemplate={cvData.template}
                  onTemplateSelect={setTemplate}
                />
              </EditorDisclosure>
              <div className="h-4" />
              {docMode === 'cv' ? (
              <EditorDisclosure storageKey="procv.editor.ats" title={t("editor.ats.title", "ATS Optimizer")} description={t("editor.ats.analyzeAgainstVacancy", "Analiza el ajuste contra una vacante")}>
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
              </EditorDisclosure>
              ) : null}
              <EditorDisclosure storageKey="procv.editor.customizer" title={t("customizer.title", "Personalizar plantilla")} description={t("editor.customizer.hint", "Ajusta tipografía, color y distribución")}>
                <CustomizerPanel
                  settings={cvData.settings || {}}
                  onSettingsChange={(nextSettings) => updateCvData({ settings: nextSettings })}
                />
              </EditorDisclosure>



              {docMode === 'cv' ? (
              <EditorDisclosure
                storageKey="procv.editor.blocks"
                title={t('editor.block.paletteToggle', 'Añadir bloque')}
                description={t('editor.block.paletteDescription', 'Agrega una sección sin perder tu progreso')}
              >
                <BlockPalette onAdd={handleAddBlock} />
              </EditorDisclosure>
              ) : null}

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => undefined}
                  className="hidden"
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
                      } else if (section === 'experience' && cvData.experience.length > 0) {
                        const [latest, ...rest] = cvData.experience;
                        updateExperience([{ ...latest, description: content }, ...rest]);
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

              {docMode === 'letter' ? (
                <div className="mt-4 rounded-lg border border-slate-200 p-4 sm:p-6 dark:border-slate-700">
                  <CoverLetterSection cv={cvData} onChange={(coverLetter) => updateCvData({ coverLetter })} />
                </div>
              ) : (
              <EditorDisclosure
                storageKey="procv.editor.form"
                title={t("editor.form.title", "Contenido del currículum")}
                description={t("editor.form.description", "Completa cada sección; los cambios se reflejan inmediatamente en la vista previa")}
                defaultOpen
              >
              {/* Validation Summary */}
              <ValidationSummary errors={validationErrors} section={activeSection} />

              {/* Active Section Content */}
              <div className="mt-6">
                {renderActiveSection()}
              </div>
              </EditorDisclosure>
              )}
            </div>
          </div>

          {/* Resize Handle */}
          {showPreview && (
            <div
              className="cv-editor-resize-handle w-1 cursor-col-resize bg-slate-300 transition-colors hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600"
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
              className="cv-editor-preview min-w-0 overflow-y-auto bg-slate-50 dark:bg-slate-950"
              style={{ width: `${panelSizes.preview}%` }}
            >
              <div className="p-4 sm:p-6">
                <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-900">
                  <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                    {docMode === 'letter' ? 'Vista previa de la carta' : t('editor.cvPreview')}
                  </h3>

                  <div className="origin-top" ref={previewRef}>
                    {docMode === 'letter' ? (
                      <CoverLetterPreview cv={cvData} />
                    ) : (
                      <WithCustomStyles
                        template={cvData.template}
                        data={transformCVDataForRenderer(cvData)}
                      />
                    )}
                  </div>
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
      </div>
    </DndContext>
  </>
  );
};
