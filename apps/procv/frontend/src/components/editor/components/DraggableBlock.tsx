import React, { useState } from "react";
import { Award, Briefcase, GraduationCap, Languages, Link2, Zap, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CVData, ExperienceItem, EducationItem, SkillItem, LanguageItem, CertificateItem, LinkItem } from "../../../types";

export interface DraggableBlockProps {
  type: "experience" | "education" | "skills" | "languages" | "certificates" | "links";
  onAdd: (type: DraggableBlockProps["type"]) => void;
}

const blockConfig: Record<DraggableBlockProps["type"], { icon: LucideIcon; labelKey: string; descKey: string }> = {
  experience: { icon: Briefcase, labelKey: "block.experience", descKey: "block.experienceDesc" },
  education: { icon: GraduationCap, labelKey: "block.education", descKey: "block.educationDesc" },
  skills: { icon: Zap, labelKey: "block.skills", descKey: "block.skillsDesc" },
  languages: { icon: Languages, labelKey: "block.languages", descKey: "block.languagesDesc" },
  certificates: { icon: Award, labelKey: "block.certificates", descKey: "block.certificatesDesc" },
  links: { icon: Link2, labelKey: "block.links", descKey: "block.linksDesc" },
};

export function DraggableBlock({ type, onAdd }: DraggableBlockProps) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  const config = blockConfig[type];

  return (
    <button
      type="button"
      onClick={() => onAdd(type)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex items-start w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${
        isHovered
          ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950/40 shadow-md"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      }`}
    >
      <config.icon className="mr-3 h-5 w-5 flex-shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.8} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {t(config.labelKey)}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {t(config.descKey)}
        </div>
      </div>
      <svg
        className={`w-4 h-4 text-brand-500 transition-transform flex-shrink-0 ml-2 ${
          isHovered ? "translate-x-1" : ""
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}

export function BlockPalette({ onAdd }: { onAdd: (type: DraggableBlockProps["type"]) => void }) {
  const { t } = useTranslation();
  const types: DraggableBlockProps["type"][] = [
    "experience",
    "education",
    "skills",
    "languages",
    "certificates",
    "links",
  ];

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
        {t("block.palette.title", "Bloques disponibles")}
      </h4>
      <div className="grid grid-cols-1 gap-2">
        {types.map((type) => (
          <DraggableBlock
            key={type}
            type={type}
            onAdd={onAdd}
          />
        ))}
      </div>
    </div>
  );
}

// Helper to create empty items for each block type
export function createEmptyItem(type: DraggableBlockProps["type"]): any {
  const id = Math.random().toString(36).slice(2, 11);
  switch (type) {
    case "experience":
      return {
        id,
        position: "",
        company: "",
        location: "",
        employmentType: "full-time" as const,
        startDate: "",
        endDate: "",
        isCurrentPosition: false,
        description: "",
        achievements: [],
        technologies: [],
        order: 0,
      } as ExperienceItem;
    case "education":
      return {
        id,
        degree: "",
        institution: "",
        location: "",
        fieldOfStudy: "",
        startDate: "",
        endDate: "",
        isCurrentlyStudying: false,
        gpa: "",
        activities: [],
        achievements: [],
        order: 0,
      } as EducationItem;
    case "skills":
      return {
        id,
        name: "",
        category: "technical" as const,
        level: "intermediate" as const,
        yearsOfExperience: undefined,
        isCertified: false,
        certificationName: "",
        order: 0,
      } as SkillItem;
    case "languages":
      return {
        id,
        language: "",
        listeningLevel: "B1" as const,
        readingLevel: "B1" as const,
        speakingLevel: "B1" as const,
        writingLevel: "B1" as const,
        certification: "",
        yearsOfStudy: undefined,
        order: 0,
      } as LanguageItem;
    case "certificates":
      return {
        id,
        title: "",
        issuingOrganization: "",
        issueDate: "",
        expiryDate: undefined,
        credentialId: "",
        verificationUrl: "",
        description: "",
        fileUrl: "",
        order: 0,
      } as CertificateItem;
    case "links":
      return {
        id,
        label: "",
        url: "",
        type: "other" as const,
        isVisible: true,
        order: 0,
      } as LinkItem;
    default:
      return null;
  }
}