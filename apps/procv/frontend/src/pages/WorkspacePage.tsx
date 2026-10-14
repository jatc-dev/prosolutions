import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../stores/authStore";
import { api } from "../services/api";
import { importCvFromFile, type ParsedCvDraft } from "../services/cvImport";
import { AppHeader } from "../components/AppHeader";
import { Footer } from "../components/Footer";
import { Skeleton, SkeletonTable } from "../components/ui/skeleton";
import { Breadcrumb } from "../components/ui/breadcrumb";
import {
  ATSOptimizationPanel,
  ATSAnalysisResult,
  ATSHistoryComparison,
  ATSHistoryItem,
  ATSTailoringResult,
} from "../components/editor/ATSOptimizationPanel";
import { TemplateColorCustomizer } from "../components/editor/TemplateColorCustomizer";
import { TemplateSelector } from "../components/editor/components/TemplateSelector";
import type { CVData, ContactItem, ContactType } from "../components/TemplateRenderer";
import {
  createId,
  emptyData,
  normalizeContactItems,
} from "../utils/cvUtils";
import { CURATED_CV_TEMPLATES } from "../utils/templateCatalog";
import { toEditorPersonalData, toWorkspacePersonalData } from "../utils/personalAdapter";
import { useEditorPanels } from "../hooks/useEditorPanels";
import toast from "react-hot-toast";

// Import types
import type { PersonalData, ExperienceItem, EducationItem, LinkItem } from "../types";

const TemplateRenderer = lazy(() => import("../components/TemplateRenderer").then((m) => ({ default: m.TemplateRenderer })));
const EditorActionsMenu = lazy(() => import("../components/editor/EditorActionsMenu").then((m) => ({ default: m.EditorActionsMenu })));
const VersionsModal = lazy(() => import("../components/editor/VersionsModal").then((m) => ({ default: m.VersionsModal })));
const AISuggestionsPanel = lazy(() => import("../components/editor/AISuggestionsPanel").then((m) => ({ default: m.AISuggestionsPanel })));
const PersonalSection = lazy(() => import("../components/editor/sections/PersonalSection").then((m) => ({ default: m.PersonalSection })));
const ExperienceSection = lazy(() => import("../components/editor/sections/ExperienceSection").then((m) => ({ default: m.ExperienceSection })));
const EducationSection = lazy(() => import("../components/editor/sections/EducationSection").then((m) => ({ default: m.EducationSection })));
const SkillsSection = lazy(() => import("../components/editor/sections/SkillsSection").then((m) => ({ default: m.SkillsSection })));
const LanguagesSection = lazy(() => import("../components/editor/sections/LanguagesSection").then((m) => ({ default: m.LanguagesSection })));
const CertificatesSection = lazy(() =>
  import("../components/editor/sections/CertificatesSection").then((m) => ({ default: m.CertificatesSection }))
);
const LinksSection = lazy(() => import("../components/editor/sections/LinksSection").then((m) => ({ default: m.LinksSection })));

function EditorChunkFallback() {
  const { t } = useTranslation();
  return <div className="text-sm text-slate-500 py-4">{t("workspace.loadingSection")}</div>;
}

interface CVItem {
  id: string;
  title: string;
  template: string;
  updatedAt: string;
}

const templates = CURATED_CV_TEMPLATES;

const EDITOR_PANELS_STORAGE_KEY = "workspace.editorPanels";

const ensureContactIds = (items: any[] = []) =>
  items.map((item) => ({
    ...item,
    id: item.id || createId(),
  }));

const ensureExperienceIds = (items: any[] = []) =>
  items.map((item) => ({
    ...item,
    id: item.id || createId(),
  }));

const ensureEducationIds = (items: any[] = []) =>
  items.map((item) => ({
    ...item,
    id: item.id || createId(),
  }));

const normalizeWorkspaceSkillsData = (items: any[] = []) =>
  items.map((item, index) => ({
    ...item,
    id: item?.id || createId(),
    name: String(item?.name || ''),
    level: typeof item?.level === 'number' ? item.level : 1,
    order: typeof item?.order === 'number' ? item.order : index,
  }));

const normalizeWorkspaceLanguagesData = (items: any[] = []) =>
  items.map((item, index) => ({
    ...item,
    id: item?.id || createId(),
    name: String(item?.name || ''),
    level: String(item?.level || ''),
    certificateUrl: String(item?.certificateUrl || ''),
    order: typeof item?.order === 'number' ? item.order : index,
  }));

const normalizeWorkspaceCertificatesData = (items: any[] = []) =>
  items.map((item, index) => ({
    ...item,
    id: item?.id || createId(),
    title: String(item?.title || ''),
    issuingOrganization: String(item?.issuingOrganization || ''),
    issueDate: String(item?.issueDate || ''),
    expiryDate: String(item?.expiryDate || ''),
    credentialId: String(item?.credentialId || ''),
    verificationUrl: String(item?.verificationUrl || item?.url || ''),
    description: String(item?.description || ''),
    fileUrl: String(item?.fileUrl || ''),
    // Preserve backward compatibility with existing renderers.
    url: String(item?.verificationUrl || item?.url || ''),
    order: typeof item?.order === 'number' ? item.order : index,
  }));

const mergeLegacySocialLinks = (
  links: Record<string, string> | undefined,
  personal: Record<string, any> | undefined
): Record<string, string> => {
  const merged: Record<string, string> = { ...(links || {}) };
  const existingUrls = new Set(
    Object.values(merged)
      .map((url) => String(url || '').trim().toLowerCase())
      .filter((url) => url.length > 0)
  );

  const candidates = [
    { label: 'Sitio web', url: personal?.website },
    { label: 'LinkedIn', url: personal?.linkedin },
    { label: 'GitHub', url: personal?.github },
    { label: 'Twitter', url: personal?.twitter },
  ];

  candidates.forEach(({ label, url }) => {
    const normalized = String(url || '').trim();
    const key = normalized.toLowerCase();
    if (!normalized || existingUrls.has(key)) {
      return;
    }

    if (!merged[label]) {
      merged[label] = normalized;
    }
    existingUrls.add(key);
  });

  return merged;
};

const buildWorkspaceVisibleLinks = (items: LinkItem[] = []): Record<string, string> => {
  const links: Record<string, string> = {};
  items.forEach((item) => {
    const label = String(item.label || '').trim();
    const url = String(item.url || '').trim();
    if (!label || !url || item.isVisible === false) {
      return;
    }
    links[label] = url;
  });
  return links;
};

const normalizeWorkspaceLinkItems = (
  linksInput: unknown,
  personal?: Record<string, any>
): LinkItem[] => {
  if (Array.isArray(linksInput)) {
    return linksInput
      .map((item, index) => {
        const label = String(item?.label || '').trim();
        const url = String(item?.url || '').trim();
        if (!label || !url) {
          return null;
        }
        return {
          id: String(item?.id || createId()),
          label,
          url,
          type: item?.type || 'other',
          isVisible: item?.isVisible !== false,
          order: typeof item?.order === 'number' ? item.order : index,
        } as LinkItem;
      })
      .filter((item): item is LinkItem => Boolean(item));
  }

  const mergedLinks = mergeLegacySocialLinks((linksInput || {}) as Record<string, string>, personal || {});
  return Object.entries(mergedLinks).map(([label, url], index) => ({
    id: createId(),
    label,
    url: String(url || ''),
    type: 'other' as const,
    isVisible: true,
    order: index,
  }));
};

const formatDateTime = (value: string | number | Date) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });

const escapeXml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export function WorkspacePage() {
  const { t } = useTranslation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const smartImportFileInputRef = useRef<HTMLInputElement>(null);

  // Dashboard state
  const [cvs, setCvs] = useState<CVItem[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [deletingCvId, setDeletingCvId] = useState<string | null>(null);

  // Editor state
  const [editingCv, setEditingCv] = useState<CVItem | null>(null);
  const [cvTitle, setCvTitle] = useState(() => t("dashboard.newCV"));
  const [template, setTemplate] = useState("sidebar");
  const [data, setData] = useState<CVData>(emptyData);
  const [editorLoading, setEditorLoading] = useState(false);
  const [smartImporting, setSmartImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linkItems, setLinkItems] = useState<LinkItem[]>([]);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsResult, setAtsResult] = useState<ATSAnalysisResult | null>(null);
  const [atsHistory, setAtsHistory] = useState<ATSHistoryItem[]>([]);
  const [atsComparison, setAtsComparison] = useState<ATSHistoryComparison | null>(null);
  const [tailoringResult, setTailoringResult] = useState<ATSTailoringResult | null>(null);
  const [tailoringLoading, setTailoringLoading] = useState(false);
  const [notification, setNotification] = useState<null | { message: string; type: "success" | "error" }>(null);
  const [activeSection, setActiveSection] = useState<
    | "personal"
    | "experience"
    | "education"
    | "skills"
    | "languages"
    | "certificates"
    | "links"
  >("personal");
  const { editorPanels, setEditorPanels } = useEditorPanels(EDITOR_PANELS_STORAGE_KEY);

  const applySmartImportedDraft = (parsedData: ParsedCvDraft) => {
    const personal = parsedData.personal ?? {};
    const smartLinkItems = normalizeWorkspaceLinkItems(
      (parsedData.links || []).map((item) => ({
        label: String(item?.label || ''),
        url: String(item?.url || ''),
        type: String(item?.type || 'other'),
        isVisible: item?.isVisible !== false,
      })),
      personal as Record<string, any>
    );

    const toWorkspaceEmailType = (type?: string): ContactType =>
      type === 'work' ? 'Laboral' : 'Personal';
    const toWorkspacePhoneType = (type?: string): ContactType => {
      if (type === 'office') return 'Oficina';
      if (type === 'whatsapp') return 'WhatsApp';
      return 'Personal';
    };

    const nextData: CVData = {
      ...emptyData,
      personal: {
        ...emptyData.personal,
        name: personal.fullName || '',
        role: personal.professionalTitle || '',
        summary: personal.summary || '',
        address: personal.address || '',
        emails: ensureContactIds(
          (personal.emails || []).map((item, index) => ({
            id: createId(),
            value: String(item.value || ''),
            type: toWorkspaceEmailType(item.type),
            isPrimary: Boolean(item.isPrimary ?? index === 0),
          }))
        ),
        phones: ensureContactIds(
          (personal.phones || []).map((item, index) => ({
            id: createId(),
            value: String(item.number || ''),
            type: toWorkspacePhoneType(item.type),
            isPrimary: Boolean(item.isPrimary ?? index === 0),
          }))
        ),
      },
      experience: ensureExperienceIds(
        (parsedData.experience || []).map((item) => {
          const locationParts = String(item.location || '').split(',').map((part) => part.trim());
          return {
            id: createId(),
            company: String(item.company || ''),
            role: String(item.position || ''),
            from: String(item.startDate || ''),
            to: item.isCurrentPosition ? '' : String(item.endDate || ''),
            isCurrentPosition: Boolean(item.isCurrentPosition),
            description: String(item.description || ''),
            achievements: Array.isArray(item.achievements) ? item.achievements : [],
            technologies: Array.isArray(item.technologies) ? item.technologies : [],
            city: locationParts[0] || '',
            country: locationParts[1] || '',
          };
        })
      ),
      education: ensureEducationIds(
        (parsedData.education || []).map((item) => {
          const locationParts = String(item.location || '').split(',').map((part) => part.trim());
          return {
            id: createId(),
            institution: String(item.institution || ''),
            degree: String(item.degree || ''),
            fieldOfStudy: String(item.fieldOfStudy || ''),
            from: String(item.startDate || ''),
            to: item.isCurrentlyStudying ? '' : String(item.endDate || ''),
            isCurrentlyStudying: Boolean(item.isCurrentlyStudying),
            activities: Array.isArray(item.activities) ? item.activities : [],
            achievements: Array.isArray(item.achievements) ? item.achievements : [],
            city: locationParts[0] || '',
            country: locationParts[1] || '',
          };
        })
      ),
      skills: normalizeWorkspaceSkillsData(
        (parsedData.skills || []).map((item) => ({ id: createId(), name: String(item.name || ''), level: 1 }))
      ),
      languages: normalizeWorkspaceLanguagesData(
        (parsedData.languages || []).map((item) => ({
          id: createId(),
          name: String(item.language || ''),
          level: 'B1',
          certificateUrl: '',
        }))
      ),
      certificates: normalizeWorkspaceCertificatesData(
        (parsedData.certificates || []).map((item) => ({ id: createId(), title: String(item.title || ''), url: '' }))
      ),
      links: buildWorkspaceVisibleLinks(smartLinkItems),
    };

    setLinkItems(smartLinkItems);
    setData(nextData);
    toast.success(t('editor.importer.success'));
  };

  const handleSmartImportFile = async (file: File) => {
    try {
      setSmartImporting(true);
      const { parsedData } = await importCvFromFile(file);
      applySmartImportedDraft(parsedData);
    } catch {
      toast.error(t('editor.importer.error'));
    } finally {
      setSmartImporting(false);
    }
  };

  const sectionTabs = [
    { key: "personal", labelKey: "editor.tabs.personal" },
    { key: "experience", labelKey: "editor.tabs.experience" },
    { key: "education", labelKey: "editor.tabs.education" },
    { key: "skills", labelKey: "editor.tabs.skills" },
    { key: "languages", labelKey: "editor.tabs.languages" },
    { key: "certificates", labelKey: "editor.tabs.certificates" },
    { key: "links", labelKey: "editor.tabs.links" },
  ] as const;

  useEffect(() => {
    if (!editingCv?.id) {
      setAtsHistory([]);
      setAtsComparison(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await api.get(`/cvs/${editingCv.id}/ats-history`);
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
  }, [editingCv?.id]);

  const getTemplateLabel = (templateKey: string) => {
    return t(`workspace.templates.${templateKey}`, {
      defaultValue: templates.find((tpl) => tpl.key === templateKey)?.label || templateKey,
    });
  };

  // Import functionality
  const handleImportFile = async (file: File) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".xml")) {
      await importXml(file);
      toast.success(t("cv.importSuccess"));
      return;
    }
    if (name.endsWith(".json")) {
      await importJson(file);
      toast.success(t("cv.importSuccess"));
      return;
    }
    toast.error(t("workspace.errors.selectJsonXml"));
  };

  const importXml = async (file: File) => {
    const text = await file.text();
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "application/xml");
      const parserError = doc.getElementsByTagName("parsererror")[0];
      if (parserError) throw new Error(t("workspace.errors.invalidXml"));

      const getText = (tag: string) => doc.getElementsByTagName(tag)[0]?.textContent ?? "";

      const parseItems = (parentTag: string): ContactItem[] => {
        const parent = doc.getElementsByTagName(parentTag)[0];
        if (!parent) return [];
        const items = Array.from(parent.getElementsByTagName("item"));
        return items.map((item) => ({
          type: (item.getAttribute("type") as ContactType) ?? "Personal",
          value: item.textContent ?? "",
        }));
      };

      const parseSkills = () => {
        const parent = doc.getElementsByTagName("skills")[0];
        if (!parent) return [];
        return Array.from(parent.getElementsByTagName("skill")).map((item) => ({
          id: item.getElementsByTagName("id")[0]?.textContent ?? createId(),
          name: item.getElementsByTagName("name")[0]?.textContent ?? "",
          level: Number(item.getElementsByTagName("level")[0]?.textContent ?? "") || undefined,
        }));
      };

      const parseLanguages = () => {
        const parent = doc.getElementsByTagName("languages")[0];
        if (!parent) return [];
        return Array.from(parent.getElementsByTagName("language")).map((item) => ({
          id: item.getElementsByTagName("id")[0]?.textContent ?? createId(),
          name: item.getElementsByTagName("name")[0]?.textContent ?? "",
          level: item.getElementsByTagName("level")[0]?.textContent ?? "",
          certificateUrl: item.getElementsByTagName("certificateUrl")[0]?.textContent ?? "",
        }));
      };

      const importedTitle = getText("title");
      const importedTemplate = getText("template");
      const normalizeProfileImageStyle = (raw: string): 'round' | 'square' | 'portrait' => {
        const normalized = String(raw || '').trim().toLowerCase();
        return normalized === 'square' || normalized === 'portrait' ? normalized : 'round';
      };
      const parseXmlBoolean = (raw: string, defaultValue: boolean) => {
        const normalized = String(raw || '').trim().toLowerCase();
        if (!normalized) return defaultValue;
        return normalized === 'true' || normalized === '1' || normalized === 'yes';
      };
      const importedLinkItems = (Array.from(doc.getElementsByTagName("links")[0]?.getElementsByTagName("link") ?? []) as Element[])
        .map((item, index) => {
          const label = (item.getElementsByTagName("label")[0]?.textContent ?? "").trim();
          const url = (item.getElementsByTagName("url")[0]?.textContent ?? "").trim();
          if (!label || !url) {
            return null;
          }
          const visible = (item.getAttribute("visible") || "true").toLowerCase() !== "false";
          return {
            id: createId(),
            label,
            url,
            type: 'other' as const,
            isVisible: visible,
            order: index,
          } as LinkItem;
        })
        .filter((item): item is LinkItem => Boolean(item));

      const newData: CVData = {
        personal: {
          name: getText("name"),
          role: getText("role"),
          profileImageStyle: normalizeProfileImageStyle(getText("profileImageStyle")),
          address: getText("address"),
          city: getText("city"),
          country: getText("country"),
          showAddress: parseXmlBoolean(getText("showAddress"), true),
          showCity: parseXmlBoolean(getText("showCity"), true),
          showCountry: parseXmlBoolean(getText("showCountry"), true),
          valueProposition: getText("valueProposition"),
          showValuePropositionTitle: parseXmlBoolean(getText("showValuePropositionTitle"), true),
          emails: ensureContactIds(parseItems("emails")),
          phones: ensureContactIds(parseItems("phones")),
          summary: getText("summary"),
        },
        experience: ensureExperienceIds((Array.from(doc.getElementsByTagName("experience")[0]?.getElementsByTagName("item") ?? []) as Element[]).map((item) => ({
          id: item.getElementsByTagName("id")[0]?.textContent ?? createId(),
          company: item.getElementsByTagName("company")[0]?.textContent ?? "",
          city: item.getElementsByTagName("city")[0]?.textContent ?? "",
          country: item.getElementsByTagName("country")[0]?.textContent ?? "",
          role: item.getElementsByTagName("role")[0]?.textContent ?? "",
          from: item.getElementsByTagName("from")[0]?.textContent ?? "",
          to: item.getElementsByTagName("to")[0]?.textContent ?? "",
          description: item.getElementsByTagName("description")[0]?.textContent ?? "",
        }))),

        education: ensureEducationIds((Array.from(doc.getElementsByTagName("education")[0]?.getElementsByTagName("item") ?? []) as Element[]).map((item) => ({
          id: item.getElementsByTagName("id")[0]?.textContent ?? createId(),
          institution: item.getElementsByTagName("institution")[0]?.textContent ?? "",
          city: item.getElementsByTagName("city")[0]?.textContent ?? "",
          country: item.getElementsByTagName("country")[0]?.textContent ?? "",
          degree: item.getElementsByTagName("degree")[0]?.textContent ?? "",
          from: item.getElementsByTagName("from")[0]?.textContent ?? "",
          to: item.getElementsByTagName("to")[0]?.textContent ?? "",
        }))),

        skills: parseSkills(),
        languages: parseLanguages(),
        links: buildWorkspaceVisibleLinks(importedLinkItems),
        certificates: [],
      };

      if (importedTitle) setCvTitle(importedTitle);
      if (importedTemplate) setTemplate(importedTemplate);
      setLinkItems(importedLinkItems);
      setData({ ...emptyData, ...newData });
    } catch (err: any) {
      toast.error(err?.message || t("workspace.errors.importXml"));
    }
  };

  const importJson = async (file: File) => {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as { title?: string; template?: string; data?: any };
      if (!parsed || typeof parsed !== "object") throw new Error(t("workspace.errors.invalidJson"));

      const importedTitle = parsed.title;
      const importedTemplate = parsed.template;
      const importedData = parsed.data ?? {};

      const personal = importedData.personal ?? {};
      const importedLinkItems = normalizeWorkspaceLinkItems(importedData.linkItems ?? importedData.links, personal);

      const newData: CVData = {
        ...emptyData,
        ...importedData,
        personal: {
          ...emptyData.personal,
          ...personal,
          emails: ensureContactIds(normalizeContactItems(personal.emails)),
          phones: ensureContactIds(normalizeContactItems(personal.phones)),
        },
        experience: ensureExperienceIds(importedData.experience || []),
        education: ensureEducationIds(importedData.education || []),
        skills: normalizeWorkspaceSkillsData(importedData.skills || []),
        languages: normalizeWorkspaceLanguagesData(importedData.languages || []),
        certificates: normalizeWorkspaceCertificatesData(importedData.certificates || []),
        links: buildWorkspaceVisibleLinks(importedLinkItems),
      };

      if (importedTitle) setCvTitle(String(importedTitle));
      if (importedTemplate) setTemplate(String(importedTemplate));
      setLinkItems(importedLinkItems);
      setData(newData);
    } catch (err: any) {
      toast.error(err?.message || t("workspace.errors.importJson"));
    }
  };

  // Export functionality
  const exportPdf = async () => {
    try {
      toast.loading(t("workspace.export.generatingPdf"), { id: "pdf-export" });

      // Get the preview element
      const element = document.querySelector('[data-pdf-target="true"]') as HTMLElement;
      if (!element) {
        toast.error(t("workspace.errors.exportContentNotFound"), { id: "pdf-export" });
        return;
      }

      // PDF options
      const options = {
        margin: 0.5,
        filename: `${cvTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "cv"}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" as const },
      };

      const html2pdf = (await import("html2pdf.js")).default;

      // Generate PDF
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
        });
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(t("workspace.errors.exportPdf"), { id: "pdf-export" });
    }
  };

  const exportJson = () => {
    const dataToExport = {
      title: cvTitle,
      template,
      data: {
        ...data,
        linkItems,
      },
    };
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cvTitle || "cv"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("workspace.export.jsonSuccess"));
  };

  const exportXml = () => {
    const xmlString = buildXmlString();
    const blob = new Blob([xmlString], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cvTitle || "cv"}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("workspace.export.xmlSuccess"));
  };

  const buildXmlString = (): string => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<cv>\n';
    xml += `  <title>${escapeXml(cvTitle)}</title>\n`;
    xml += `  <template>${escapeXml(template)}</template>\n`;

    // Personal
    if (data.personal) {
      xml += '  <personal>\n';
      xml += `    <name>${escapeXml(data.personal.name)}</name>\n`;
      xml += `    <role>${escapeXml(data.personal.role)}</role>\n`;
      xml += `    <profileImageStyle>${escapeXml((data.personal as any).profileImageStyle || 'round')}</profileImageStyle>\n`;
      xml += `    <city>${escapeXml(data.personal.city)}</city>\n`;
      xml += `    <country>${escapeXml(data.personal.country)}</country>\n`;
      xml += `    <address>${escapeXml((data.personal as any).address)}</address>\n`;
      xml += `    <showAddress>${(data.personal as any).showAddress !== false}</showAddress>\n`;
      xml += `    <showCity>${(data.personal as any).showCity !== false}</showCity>\n`;
      xml += `    <showCountry>${(data.personal as any).showCountry !== false}</showCountry>\n`;
      xml += `    <valueProposition>${escapeXml((data.personal as any).valueProposition)}</valueProposition>\n`;
      xml += `    <showValuePropositionTitle>${(data.personal as any).showValuePropositionTitle !== false}</showValuePropositionTitle>\n`;
      xml += `    <summary>${escapeXml(data.personal.summary)}</summary>\n`;

      if (data.personal.emails?.length) {
        xml += '    <emails>\n';
        data.personal.emails.forEach(email => {
          xml += `      <item type="${escapeXml(email.type)}">${escapeXml(email.value)}</item>\n`;
        });
        xml += '    </emails>\n';
      }

      if (data.personal.phones?.length) {
        xml += '    <phones>\n';
        data.personal.phones.forEach(phone => {
          xml += `      <item type="${escapeXml(phone.type)}">${escapeXml(phone.value)}</item>\n`;
        });
        xml += '    </phones>\n';
      }

      xml += '  </personal>\n';
    }

    // Experience
    if (data.experience?.length) {
      xml += '  <experience>\n';
      data.experience.forEach(exp => {
        xml += '    <item>\n';
        xml += `      <id>${escapeXml(exp.id)}</id>\n`;
        xml += `      <company>${escapeXml(exp.company)}</company>\n`;
        xml += `      <city>${escapeXml(exp.city)}</city>\n`;
        xml += `      <country>${escapeXml(exp.country)}</country>\n`;
        xml += `      <role>${escapeXml(exp.role)}</role>\n`;
        xml += `      <from>${escapeXml(exp.from)}</from>\n`;
        xml += `      <to>${escapeXml(exp.to)}</to>\n`;
        xml += `      <description>${escapeXml(exp.description)}</description>\n`;
        xml += '    </item>\n';
      });
      xml += '  </experience>\n';
    }

    // Education
    if (data.education?.length) {
      xml += '  <education>\n';
      data.education.forEach(edu => {
        xml += '    <item>\n';
        xml += `      <id>${escapeXml(edu.id)}</id>\n`;
        xml += `      <institution>${escapeXml(edu.institution)}</institution>\n`;
        xml += `      <city>${escapeXml(edu.city)}</city>\n`;
        xml += `      <country>${escapeXml(edu.country)}</country>\n`;
        xml += `      <degree>${escapeXml(edu.degree)}</degree>\n`;
        xml += `      <from>${escapeXml(edu.from)}</from>\n`;
        xml += `      <to>${escapeXml(edu.to)}</to>\n`;
        xml += '    </item>\n';
      });
      xml += '  </education>\n';
    }

    // Skills
    if (data.skills?.length) {
      xml += '  <skills>\n';
      data.skills.forEach(skill => {
        xml += '    <skill>\n';
        xml += `      <id>${escapeXml(skill.id)}</id>\n`;
        xml += `      <name>${escapeXml(skill.name)}</name>\n`;
        xml += `      <level>${escapeXml(skill.level || 1)}</level>\n`;
        xml += '    </skill>\n';
      });
      xml += '  </skills>\n';
    }

    // Languages
    if (data.languages?.length) {
      xml += '  <languages>\n';
      data.languages.forEach(lang => {
        xml += '    <language>\n';
        xml += `      <id>${escapeXml(lang.id)}</id>\n`;
        xml += `      <name>${escapeXml(lang.name)}</name>\n`;
        xml += `      <level>${escapeXml(lang.level)}</level>\n`;
        xml += `      <certificateUrl>${escapeXml(lang.certificateUrl)}</certificateUrl>\n`;
        xml += '    </language>\n';
      });
      xml += '  </languages>\n';
    }

    // Links
    if (linkItems.length > 0) {
      xml += '  <links>\n';
      linkItems.forEach((link) => {
        xml += `    <link visible="${link.isVisible !== false}">\n`;
        xml += `      <label>${escapeXml(link.label)}</label>\n`;
        xml += `      <url>${escapeXml(link.url)}</url>\n`;
        xml += '    </link>\n';
      });
      xml += '  </links>\n';
    }

    xml += '</cv>';
    return xml;
  };
  
  
  // Render active section component
  const renderActiveSection = () => {
    const generateId = () => Math.random().toString(36).substr(2, 9);

    switch (activeSection) {
      case 'personal':
        return (
          <PersonalSection
            data={toEditorPersonalData(data.personal as any, generateId)}
            onChange={(data: PersonalData) => {
              setData(prev => ({
                ...prev,
                personal: toWorkspacePersonalData(data, prev.personal as any) as any
              }));
            }}
            isLoading={editorLoading}
          />
        );
      case 'experience':
        return (
          <ExperienceSection
            data={(data.experience || []).map((exp, index) => ({
              id: exp.id || createId(),
              position: exp.role,
              company: exp.company,
              location: [exp.city, exp.country].filter(Boolean).join(', '),
              employmentType: ((exp as any).employmentType || 'full-time') as ExperienceItem['employmentType'],
              startDate: exp.from,
              endDate: exp.to,
              isCurrentPosition:
                typeof (exp as any).isCurrentPosition === 'boolean'
                  ? (exp as any).isCurrentPosition
                  : !exp.to,
              description: exp.description || '',
              achievements: Array.isArray((exp as any).achievements) ? (exp as any).achievements : [],
              technologies: Array.isArray((exp as any).technologies) ? (exp as any).technologies : [],
              order: index
            }))}
            onChange={(updatedExperience: ExperienceItem[]) => {
              setData(prev => ({
                ...prev,
                experience: updatedExperience.map(exp => {
                  const [city = '', country = ''] = (exp.location || '').split(',').map(part => part.trim());
                  return {
                  id: exp.id,
                  company: exp.company,
                  role: exp.position,
                  from: exp.startDate || '',
                  to: exp.isCurrentPosition ? '' : (exp.endDate || ''),
                  isCurrentPosition: exp.isCurrentPosition,
                  employmentType: exp.employmentType,
                  description: exp.description,
                  achievements: exp.achievements,
                  technologies: exp.technologies,
                  city,
                  country,
                };
                }) as any
              }));
            }}
            isLoading={editorLoading}
          />
        );
      case 'education':
        return (
          <EducationSection
            data={(data.education || []).map((edu, index) => ({
              id: edu.id || createId(),
              degree: edu.degree,
              institution: edu.institution,
              location: [edu.city, edu.country].filter(Boolean).join(', '),
              fieldOfStudy: (edu as any).fieldOfStudy || '',
              startDate: edu.from,
              endDate: edu.to,
              isCurrentlyStudying:
                typeof (edu as any).isCurrentlyStudying === 'boolean'
                  ? (edu as any).isCurrentlyStudying
                  : !edu.to,
              gpa: (edu as any).gpa || '',
              activities: Array.isArray((edu as any).activities) ? (edu as any).activities : [],
              achievements: Array.isArray((edu as any).achievements) ? (edu as any).achievements : [],
              order: index
            }))}
            onChange={(updatedEducation: EducationItem[]) => {
              setData(prev => ({
                ...prev,
                education: updatedEducation.map(edu => {
                  const [city = '', country = ''] = (edu.location || '').split(',').map(part => part.trim());
                  return {
                  id: edu.id,
                  institution: edu.institution,
                  degree: edu.degree,
                  from: edu.startDate || '',
                  to: edu.isCurrentlyStudying ? '' : (edu.endDate || ''),
                  isCurrentlyStudying: edu.isCurrentlyStudying,
                  gpa: edu.gpa || '',
                  fieldOfStudy: edu.fieldOfStudy,
                  activities: edu.activities,
                  achievements: edu.achievements,
                  city,
                  country,
                };
                }) as any
              }));
            }}
            isLoading={editorLoading}
          />
        );
      case 'skills':
        return (
          <SkillsSection
            data={(data.skills || []).map((skill, index) => {
              const rawSkill = skill as any;
              const numericLevel = typeof rawSkill.level === 'number' ? rawSkill.level : 2;
              const mappedEditorLevel =
                rawSkill.editorLevel ||
                (numericLevel <= 1
                  ? 'beginner'
                  : numericLevel <= 3
                    ? 'intermediate'
                    : numericLevel <= 5
                      ? 'advanced'
                      : 'expert');

              return {
                id: skill.id,
                name: skill.name,
                category: (rawSkill.category || 'technical') as any,
                level: mappedEditorLevel as any,
                yearsOfExperience:
                  typeof rawSkill.yearsOfExperience === 'number'
                    ? rawSkill.yearsOfExperience
                    : numericLevel,
                isCertified: Boolean(rawSkill.isCertified),
                certificationName: rawSkill.certificationName || '',
                order: typeof rawSkill.order === 'number' ? rawSkill.order : index,
              };
            })}
            onChange={(data: any) => {
              setData(prev => ({
                ...prev,
                skills: data.map((skill: any) => ({
                  ...(prev.skills || []).find((existing: any) => existing.id === skill.id),
                  id: skill.id,
                  name: skill.name,
                  level: typeof skill.yearsOfExperience === 'number' ? skill.yearsOfExperience : 1,
                  editorLevel: skill.level,
                  category: skill.category,
                  yearsOfExperience: skill.yearsOfExperience,
                  isCertified: Boolean(skill.isCertified),
                  certificationName: skill.certificationName || '',
                  order: typeof skill.order === 'number' ? skill.order : 0,
                })) as any
              }));
            }}
            isLoading={editorLoading}
          />
        );
      case 'languages':
        return (
          <LanguagesSection
            data={(data.languages || []).map((lang, index) => {
              const rawLang = lang as any;
              const fallbackLevel = (rawLang.level || 'B1') as string;

              return {
                id: lang.id,
                language: lang.name,
                listeningLevel: (rawLang.listeningLevel || fallbackLevel) as any,
                readingLevel: (rawLang.readingLevel || fallbackLevel) as any,
                speakingLevel: (rawLang.speakingLevel || fallbackLevel) as any,
                writingLevel: (rawLang.writingLevel || fallbackLevel) as any,
                certification: rawLang.certification || lang.certificateUrl || '',
                yearsOfStudy: rawLang.yearsOfStudy,
                order: typeof rawLang.order === 'number' ? rawLang.order : index,
              };
            })}
            onChange={(data: any) => {
              setData(prev => ({
                ...prev,
                languages: data.map((lang: any) => ({
                  ...(prev.languages || []).find((existing: any) => existing.id === lang.id),
                  id: lang.id,
                  name: lang.language,
                  level: lang.listeningLevel,
                  certificateUrl: lang.certification || '',
                  listeningLevel: lang.listeningLevel,
                  readingLevel: lang.readingLevel,
                  speakingLevel: lang.speakingLevel,
                  writingLevel: lang.writingLevel,
                  certification: lang.certification || '',
                  yearsOfStudy: lang.yearsOfStudy,
                  order: typeof lang.order === 'number' ? lang.order : 0,
                })) as any
              }));
            }}
            isLoading={editorLoading}
          />
        );
      case 'certificates':
        return (
          <CertificatesSection
            data={(data.certificates || []).map(cert => ({
              id: cert.id,
              title: cert.title,
              issuingOrganization: (cert as any).issuingOrganization || '',
              issueDate: (cert as any).issueDate || '',
              expiryDate: (cert as any).expiryDate || '',
              credentialId: (cert as any).credentialId || '',
              verificationUrl: (cert as any).verificationUrl || cert.url || '',
              description: (cert as any).description || '',
              fileUrl: (cert as any).fileUrl || '',
              order: 0
            }))}
            onChange={(data: any) => {
              setData(prev => ({
                ...prev,
                certificates: data.map((cert: any) => ({
                  id: cert.id,
                  title: cert.title,
                  issuingOrganization: cert.issuingOrganization || '',
                  issueDate: cert.issueDate || '',
                  expiryDate: cert.expiryDate || '',
                  credentialId: cert.credentialId || '',
                  verificationUrl: cert.verificationUrl || '',
                  description: cert.description || '',
                  fileUrl: cert.fileUrl || '',
                  // Keep legacy url for renderers expecting it.
                  url: cert.verificationUrl || '',
                })) as any
              }));
            }}
            isLoading={editorLoading}
          />
        );
      case 'links':
        return (
          <LinksSection
            data={linkItems}
            onChange={(nextLinks: LinkItem[]) => {
              setLinkItems(nextLinks);
              setData(prev => ({
                ...prev,
                links: buildWorkspaceVisibleLinks(nextLinks) as any,
                linkItems: nextLinks as any,
              }));
            }}
            isLoading={editorLoading}
          />
        );
      default:
        return <div>{t("workspace.sectionNotFound")}</div>;
    }
  };
  
  // Load CVs when user is authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    setDashboardLoading(true);
    api
      .get("/cvs")
      .then((res) => setCvs(Array.isArray(res?.data?.cvs) ? res.data.cvs : []))
      .catch((err: any) => {
        const message = err?.response?.data?.message || t("dashboard.errorLoadingCVs");
        setDashboardError(message);
        if (err?.response?.status === 401) {
          window.location.href = "/";
        }
      })
      .finally(() => setDashboardLoading(false));
  }, [isAuthenticated, t]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cvTitle, template, data]);

  // Load CV data when editing
  useEffect(() => {
    if (!editingCv) return;

    setEditorLoading(true);
    api
      .get(`/cvs/${editingCv.id}`)
      .then((res) => {
        const cv = res.data.cv;
        setCvTitle(cv.title);
        setTemplate(cv.template);
        const parsedData = typeof cv.data === 'string' ? JSON.parse(cv.data) : cv.data;
        const workspaceLinkItems = normalizeWorkspaceLinkItems(parsedData.linkItems ?? parsedData.links, parsedData.personal || {});
        setLinkItems(workspaceLinkItems);
        setData({
          ...parsedData,
          personal: {
            ...(parsedData.personal || {}),
            emails: ensureContactIds(normalizeContactItems(parsedData.personal?.emails || [])),
            phones: ensureContactIds(normalizeContactItems(parsedData.personal?.phones || [])),
          },
          experience: ensureExperienceIds(parsedData.experience || []),
          education: ensureEducationIds(parsedData.education || []),
          contacts: normalizeContactItems(parsedData.contacts || []),
          skills: normalizeWorkspaceSkillsData(parsedData.skills || []),
          languages: normalizeWorkspaceLanguagesData(parsedData.languages || []),
          certificates: normalizeWorkspaceCertificatesData(parsedData.certificates || []),
          links: buildWorkspaceVisibleLinks(workspaceLinkItems),
          linkItems: workspaceLinkItems,
        } as any);
      })
      .catch((err: any) => {
        toast.error(err?.response?.data?.message || t("workspace.errors.loadCv"));
      })
      .finally(() => setEditorLoading(false));
  }, [editingCv, t]);

  const handleNew = async () => {
    try {
      const res = await api.post("/cvs", { title: t("dashboard.newCV") });
      const newCv = res.data.cv;
      setCvs(prev => [newCv, ...prev]);
      setEditingCv(newCv);
      setCvTitle(t("dashboard.newCV"));
      setTemplate("sidebar");
      setLinkItems([]);
      setData(emptyData);
    } catch (err: any) {
      const message = err?.response?.data?.message || t("dashboard.errorCreatingCV");
      setDashboardError(message);
    }
  };

  const handleEdit = (cv: CVItem) => {
    setEditingCv(cv);
  };

  const handleDeleteFromDashboard = async (cv: CVItem) => {
    if (!confirm(t("workspace.confirm.deleteCvNamed", { title: cv.title }))) {
      return;
    }

    setDeletingCvId(cv.id);
    try {
      await api.delete(`/cvs/${cv.id}`);
      setCvs(prev => prev.filter(c => c.id !== cv.id));
      setNotification({ message: t("workspace.success.cvDeleted"), type: "success" });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      const message = err?.response?.data?.message || t("workspace.errors.deleteCv");
      setDashboardError(message);
      setNotification({ message, type: "error" });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setDeletingCvId(null);
    }
  };

  const handleDuplicateFromDashboard = async (cv: CVItem) => {
    try {
      // Get the original CV data
      const res = await api.get(`/cvs/${cv.id}`);
      const originalCv = res.data.cv;

      // Create duplicate with new title
      const duplicateTitle = `${cv.title} (Copia)`;
      const duplicateRes = await api.post("/cvs", {
        title: duplicateTitle,
        template: cv.template,
        data: originalCv.data
      });

      const newCv = duplicateRes.data.cv;
      setCvs(prev => [newCv, ...prev]);
      setNotification({ message: t("workspace.success.cvDuplicated"), type: "success" });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      const message = err?.response?.data?.message || t("workspace.errors.duplicateCv");
      setDashboardError(message);
      setNotification({ message, type: "error" });
      setTimeout(() => setNotification(null), 3000);
    }
  };

    

  const handleSave = async () => {
    if (!editingCv) return;

    try {
      setSaving(true);
      await api.put(`/cvs/${editingCv.id}`, {
        title: cvTitle,
        template,
        data: {
          ...data,
          linkItems,
          links: buildWorkspaceVisibleLinks(linkItems),
        }
      });

      // Update CV in the list
      setCvs(prev => prev.map(cv =>
        cv.id === editingCv.id
          ? { ...cv, title: cvTitle, template, updatedAt: new Date().toISOString() }
          : cv
      ));

      setNotification({ message: t("cv.saveSuccess"), type: "success" });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification({ message: err?.response?.data?.message || t("cv.errorSave"), type: "error" });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setSaving(false);
    }
  };

    

  const insertSuggestionIntoActiveSection = (suggestion: string, kind: 'verb' | 'achievement') => {
    const normalizedSuggestion = suggestion.trim();
    if (!normalizedSuggestion) {
      return;
    }

    if (activeSection === 'experience') {
      if (!data.experience || data.experience.length === 0) {
        toast.error(t('ai.noExperienceToInsert'));
        return;
      }

      const targetIndex = data.experience.length - 1;
      const currentDescription = data.experience[targetIndex]?.description?.trim() || '';
      const nextDescription =
        kind === 'achievement'
          ? `${currentDescription}${currentDescription ? '\n' : ''}• ${normalizedSuggestion}`
          : `${currentDescription}${currentDescription ? '\n' : ''}${normalizedSuggestion} ...`;

      const updatedExperience = [...data.experience];
      updatedExperience[targetIndex] = {
        ...updatedExperience[targetIndex],
        description: nextDescription,
      };

      setData((prev) => ({
        ...prev,
        experience: updatedExperience,
      }));

      toast.success(t('ai.insertSuccess'));
      return;
    }

    const summary = data.personal?.summary?.trim() || '';
    const nextSummary =
      kind === 'achievement'
        ? `${summary}${summary ? '\n' : ''}• ${normalizedSuggestion}`
        : `${summary}${summary ? ' ' : ''}${normalizedSuggestion} ...`;

    setData((prev) => ({
      ...prev,
      personal: {
        ...prev.personal,
        summary: nextSummary,
      },
    }));

    toast.success(t('ai.insertSuccess'));
  };

  const renderDashboard = () => {
    return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{t("workspace.dashboardTitle")}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">{t("workspace.dashboardSubtitle")}</p>
        </div>
        <button
          onClick={handleNew}
          className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2 font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("dashboard.newCV")}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center">
            <div className="p-3 bg-brand-100 rounded-lg">
              <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m2 0a2 2 0 100-4 2 2 0 000 4zm-6 4a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("workspace.stats.totalCvs")}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{cvs.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("workspace.stats.completed")}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{cvs.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("workspace.stats.lastUpdated")}</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {cvs.length > 0
                  ? formatDateTime(Math.max(...cvs.map(cv => new Date(cv.updatedAt).getTime())))
                  : t("workspace.never")
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {dashboardError && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
          <p className="text-rose-800">{dashboardError}</p>
        </div>
      )}

      {/* Empty state */}
      {!dashboardLoading && cvs.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto h-16 w-16 text-slate-400 mb-4">
            <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m2 0a2 2 0 100-4 2 2 0 000 4zm-6 4a2 2 0 100-4 2 2 0 000 4zm2 4a2 2 0 100-4 2 2 0 000 4zm8-8a2 2 0 100-4 2 2 0 000 4zm0 4a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-100">{t("workspace.empty.title")}</h3>
          <p className="mb-6 max-w-md mx-auto text-slate-600 dark:text-slate-300">
            {t("workspace.empty.description")}
          </p>
          <button
            onClick={handleNew}
            className="px-8 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('dashboard.createFirstCV')}
          </button>
        </div>
      )}

      {/* CVs Grid */}
      {!dashboardLoading && cvs.length > 0 && (
        <div>
          <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-slate-100">{t("workspace.myResumes")}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cvs.map((cv) => (
              <div
                key={cv.id}
                className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-6 transition-all duration-200 hover:border-brand-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500/40"
                onClick={() => handleEdit(cv)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-brand-50 rounded-lg group-hover:bg-brand-100 transition-colors">
                    <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m2 0a2 2 0 100-4 2 2 0 000 4zm-6 4a2 2 0 100-4 2 2 0 000 4zm2 4a2 2 0 100-4 2 2 0 000 4zm8-8a2 2 0 100-4 2 2 0 000 4zm0 4a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    {getTemplateLabel(cv.template)}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{cv.title}</h3>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                  {t("dashboard.lastUpdated")}: {formatDateTime(cv.updatedAt)}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(cv);
                    }}
                    className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
                  >
                    {t("common.edit")}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateFromDashboard(cv);
                    }}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    title={t("dashboard.duplicateCV")}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFromDashboard(cv);
                    }}
                    disabled={deletingCvId === cv.id}
                    className={`px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium ${
                      deletingCvId === cv.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title={t("dashboard.deleteCV")}
                  >
                    {deletingCvId === cv.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    );
  };

  const renderEditor = () => {
    const hasTemplate = Boolean(template);
    const hasJobDescription = jobDescription.trim().length >= 30;
    const hasAts = Boolean(atsResult);
    const doneCount = [hasTemplate, hasJobDescription, hasAts].filter(Boolean).length;
    const onboardingSteps = [
      {
        id: "template",
        done: hasTemplate,
        title: t("workspace.stepTemplateTitle", "1. Choose a template"),
        subtitle: t("workspace.stepTemplateSubtitle", "Select a layout that fits your role and style"),
      },
      {
        id: "job",
        done: hasJobDescription,
        title: t("workspace.stepJobTitle", "2. Paste target job description"),
        subtitle: t("workspace.stepJobSubtitle", "This powers keyword matching and tailored suggestions"),
      },
      {
        id: "ats",
        done: hasAts,
        title: t("workspace.stepAtsTitle", "3. Run ATS and apply improvements"),
        subtitle: t("workspace.stepAtsSubtitle", "Use one-click keyword and tailoring actions to boost your score"),
      },
    ];

    return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: editingCv?.title || cvTitle || t("workspace.editor.title") }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("workspace.editor.title")}</h1>
          <p className="text-slate-600 dark:text-slate-300">{t("workspace.editor.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Preview toggle */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center rounded-md border border-brand-300 bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:border-brand-700 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/40"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {showPreview ? t("editor.actions.hide") : t("editor.actions.show")} {t("editor.actions.preview")}
          </button>
          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                {t("dashboard.saving")}
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t("editor.actions.save")}
              </>
            )}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="rounded-lg bg-slate-100 p-2 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            {showActionsMenu && (
              <Suspense fallback={<EditorChunkFallback />}>
                <EditorActionsMenu
                  isOpen={showActionsMenu}
                  onClose={() => setShowActionsMenu(false)}
                  onSave={handleSave}
                  onExportPdf={exportPdf}
                  onExportXml={exportXml}
                  onExportJson={exportJson}
                  onImport={() => fileInputRef.current?.click()}
                  onSmartImport={() => smartImportFileInputRef.current?.click()}
                  onFileDrop={handleImportFile}
                  onVersions={() => setShowVersionsModal(true)}
                  isLoading={{ smartImport: smartImporting }}
                />
              </Suspense>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                handleImportFile(file);
                e.target.value = "";
              }}
            />
            <input
              ref={smartImportFileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                handleSmartImportFile(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </div>

      {/* Editor Layout */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              setEditorPanels((prev) => ({
                ...prev,
                quickStart: !prev.quickStart,
              }))
            }
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left hover:bg-amber-100/80 dark:border-amber-900/60 dark:bg-amber-950/20 dark:hover:bg-amber-900/30"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("workspace.quickStartTitle", "Quick ATS Onboarding")}</p>
              {doneCount > 0 && (
                <button
                  type="button"
                  onClick={() => setEditorPanels((prev) => ({ ...prev, quickStart: false }))}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {t("workspace.skipOnboarding", "Saltar")}
                </button>
              )}
              <svg className={`h-4 w-4 text-slate-600 transition-transform dark:text-slate-300 ${editorPanels.quickStart ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{t("workspace.quickStartProgress", "{{done}} of 3 completed", { done: doneCount })}</p>
          </button>

          <button
            type="button"
            onClick={() =>
              setEditorPanels((prev) => ({
                ...prev,
                ats: !prev.ats,
              }))
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">ATS Optimizer</p>
              <svg className={`h-4 w-4 text-slate-600 transition-transform dark:text-slate-300 ${editorPanels.ats ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {atsResult
                ? t("workspace.atsScoreDisplay", "Score actual: {{score}} · {{coverage}}% keywords", {
                    score: atsResult.score,
                    coverage: atsResult.keywordCoverage,
                  })
                : t("workspace.atsCompactHint", "Pega una vacante y ejecuta analisis ATS")}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setEditorPanels((prev) => ({
                ...prev,
                aiSuggestions: !prev.aiSuggestions,
              }))
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("ai.suggestions", "Sugerencias de IA")}</p>
              <svg className={`h-4 w-4 text-slate-600 transition-transform dark:text-slate-300 ${editorPanels.aiSuggestions ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">            {editorPanels.aiSuggestions
              ? t("workspace.aiActiveHint", "Verbos y logros listos para insertar")
              : t("workspace.aiCompactHint", "Verbos y logros sugeridos para mejorar impacto y ATS")}</p>
          </button>
        </div>

        {editorPanels.quickStart && (
          <div className="rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3 dark:border-amber-900/60 dark:from-slate-900 dark:to-amber-950/20">
            <div className="grid gap-2 md:grid-cols-3">
              {onboardingSteps.map((step) => (
                <div
                  key={step.id}
                  className={`rounded-lg border p-3 text-sm ${
                    step.done
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
                      : "border-slate-200 bg-white/90 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                  }`}
                >
                  <p className="font-semibold">{step.title}</p>
                  <p className="mt-1 text-xs opacity-85">{step.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {editorPanels.ats && (
          <ATSOptimizationPanel
            jobDescription={jobDescription}
            onJobDescriptionChange={setJobDescription}
            onAnalyze={async () => {
              try {
                setAtsLoading(true);
                const endpoint = editingCv?.id ? `/cvs/${editingCv.id}/analyze` : '/cvs/analyze-draft';
                const response = await api.post(endpoint, {
                  jobDescription,
                  data,
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
            }}
            onTailor={async () => {
              try {
                setTailoringLoading(true);
                const endpoint = editingCv?.id ? `/cvs/${editingCv.id}/tailor` : '/cvs/tailor-draft';
                const response = await api.post(endpoint, {
                  jobDescription,
                  data,
                });
                setTailoringResult(response.data.tailoring || null);
                toast.success(t("workspace.toast.tailoringCompleted"));
              } catch (error: any) {
                toast.error(error?.response?.data?.message || t("workspace.toast.tailoringError"));
              } finally {
                setTailoringLoading(false);
              }
            }}
            onApplyMissingKeywords={() => {
              if (!atsResult || atsResult.missingKeywords.length === 0) {
                return;
              }

              const existing = new Set((data.skills || []).map((item) => String(item.name || '').trim().toLowerCase()));
              const additions = atsResult.missingKeywords
                .slice(0, 12)
                .filter((keyword) => !existing.has(keyword.toLowerCase()))
                .map((keyword) => ({
                  id: createId(),
                  name: keyword,
                  level: 3,
                }));

              if (additions.length === 0) {
                toast('No hay nuevas keywords para agregar');
                return;
              }

              setData((prev) => ({
                ...prev,
                skills: [...(prev.skills || []), ...additions],
              }));
              setActiveSection('skills');
              toast.success(t("workspace.toast.keywordsAdded", "{{count}} keywords agregadas a skills", { count: additions.length }));
            }}
            onApplyTailoring={() => {
              if (!tailoringResult) {
                return;
              }

              setData((prev) => {
                const byId = new Map(tailoringResult.experience.map((item) => [item.id, item]));
                const nextExperience = (prev.experience || []).map((item, index) => {
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

                return {
                  ...prev,
                  personal: {
                    ...prev.personal,
                    summary: tailoringResult.summary || prev.personal?.summary || '',
                  },
                  experience: nextExperience,
                };
              });

              setActiveSection('experience');
              toast.success(t("workspace.toast.tailoringApplied"));
            }}
            loading={atsLoading}
            tailoringLoading={tailoringLoading}
            result={atsResult}
            tailoringResult={tailoringResult}
            history={atsHistory}
            comparison={atsComparison}
          />
        )}

        {editorPanels.aiSuggestions && (
          <Suspense fallback={<EditorChunkFallback />}>
            <AISuggestionsPanel
              jobTitle={data.personal?.role || ""}
              onVerbSelect={(verb) => {
                insertSuggestionIntoActiveSection(verb, 'verb');
              }}
              onAchievementSelect={(achievement) => {
                insertSuggestionIntoActiveSection(achievement, 'achievement');
              }}
            />
          </Suspense>
        )}

        {/* Editor and Preview Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor Panel */}
          <div className="space-y-6">
            {/* CV Title and Template */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t("cv.title")}
                  </label>
                  <input
                    type="text"
                    value={cvTitle}
                    onChange={(e) => setCvTitle(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    placeholder={t("workspace.editor.cvTitlePlaceholder")}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t("cv.template")}
                  </label>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <TemplateSelector
                      templates={templates}
                      currentTemplate={template}
                      isGuest={false}
                      onTemplateSelect={setTemplate}
                      onLockedClick={() => {}}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <TemplateColorCustomizer
                  template={template}
                  settings={data.settings}
                  onChange={(nextSettings) => {
                    setData((prev) => ({
                      ...prev,
                      settings: nextSettings,
                    }));
                  }}
                />
              </div>
            </div>

            {/* Section Tabs */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="flex overflow-x-auto">
                  {sectionTabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveSection(tab.key)}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        activeSection === tab.key
                          ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300"
                          : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
                      }`}
                    >
                      {t(tab.labelKey)}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                <Suspense fallback={<EditorChunkFallback />}>
                  {renderActiveSection()}
                </Suspense>
              </div>
            </div>
          </div>

           {showPreview && (
             <div className="space-y-6">
               <div className="h-fit rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                 <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{t("cv.preview")}</h3>
                 <div className="pdf-export-container overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950" data-pdf-target="true">
                   <div className="p-6">
                     <Suspense fallback={<EditorChunkFallback />}>
                       <TemplateRenderer
                         template={template}
                         data={{
                           settings: data.settings,
                           personal: {
                             ...(data.personal || {}),
                             name: data.personal?.name || '',
                             role: data.personal?.role || '',
                             emails: (data.personal?.emails || []).map(e => ({
                               value: e.value,
                               type: (e.type || 'Otro') as ContactType
                             })),
                            phones: (data.personal?.phones || []).map(p => ({
                              value: p.value,
                              type: (p.type || 'Otro') as ContactType
                            })),
                          },
                           experience: (data.experience || []).map(exp => ({
                             id: exp.id,
                             company: exp.company,
                             role: exp.role,
                             from: exp.from,
                             to: exp.to,
                             description: exp.description,
                             city: exp.city,
                             country: exp.country,
                           })),
                           education: (data.education || []).map(edu => ({
                             id: edu.id,
                             institution: edu.institution,
                             degree: edu.degree,
                             from: edu.from,
                             to: edu.to,
                             city: edu.city,
                             country: edu.country,
                           })),
                           skills: (data.skills || []).map(skill => ({
                             id: skill.id,
                             name: skill.name,
                             level: skill.level,
                           })),
                           languages: (data.languages || []).map(lang => ({
                             id: lang.id,
                             name: lang.name,
                             level: lang.level,
                             certificateUrl: lang.certificateUrl,
                           })),
                           certificates: (data.certificates || []).map(cert => ({
                             id: cert.id,
                             title: cert.title,
                             url: cert.url,
                           })),
                           links: data.links || {},
                         }}
                       />
                     </Suspense>
                   </div>
                 </div>
               </div>
             </div>
           )}
         </div>


      </div>

      {/* Toast notifications */}
      {notification && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
          notification.type === "success" ? "bg-green-500" : "bg-red-500"
        } text-white`}>
          {notification.message}
        </div>
      )}
    </div>
  );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <AppHeader />
      <main className="flex-1 p-6">
        {authLoading || dashboardLoading ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
            <SkeletonTable />
          </div>
        ) : editingCv ? (
          renderEditor()
        ) : (
          renderDashboard()
        )}
      </main>
      <Footer />

      {/* Modals */}
      {showVersionsModal && editingCv && (
        <Suspense fallback={<EditorChunkFallback />}>
          <VersionsModal
            cvId={editingCv.id}
            isOpen={showVersionsModal}
            onClose={() => setShowVersionsModal(false)}
            onRestore={() => {
              // Handle version restore
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
