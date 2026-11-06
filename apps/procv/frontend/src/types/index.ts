// ==============================================
// CV EDITOR TYPES
// ==============================================

export type SectionType =
  | 'personal'
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'certificates'
  | 'links'
  | 'application';

export type ContactType = 'personal' | 'work' | 'education' | 'other';
export type PhoneType = 'personal' | 'office' | 'home' | 'whatsapp' | 'other';
export type EmploymentType = 'full-time' | 'part-time' | 'freelance' | 'contract' | 'internship';
export type SkillCategory = 'technical' | 'soft' | 'language' | 'certification';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type LinkType = 'linkedin' | 'github' | 'portfolio' | 'website' | 'twitter' | 'other';
export type ProfileImageStyle = 'round' | 'square' | 'portrait';

// ==============================================
// CONTACT INTERFACES
// ==============================================

export interface ContactItem {
  id: string;
  type: ContactType;
  label: string;
  value: string;
  isPrimary?: boolean;
}

export interface PhoneItem {
  id: string;
  type: PhoneType;
  number: string;
  label?: string;
  isPrimary?: boolean;
}

// ==============================================
// PERSONAL SECTION
// ==============================================

export interface PersonalData {
  // Basic Info
  fullName: string;
  professionalTitle: string;
  profileImage?: string;
  profileImageStyle?: ProfileImageStyle;
  showProfileImage?: boolean;
  birthDate?: string;
  showBirthDate?: boolean;
  showAge?: boolean;

  // Contact Info
  emails: ContactItem[];
  phones: PhoneItem[];
  address?: string;
  city?: string;
  country?: string;
  nationality?: string;
  showAddress?: boolean;
  showCity?: boolean;
  showCountry?: boolean;
  website?: string;

  // Professional Summary
  valueProposition?: string;
  showValuePropositionTitle?: boolean;
  summary: string;

  // Social Links
  linkedin?: string;
  github?: string;
  twitter?: string;
}

// ==============================================
// EXPERIENCE SECTION
// ==============================================

export interface ExperienceItem {
  id: string;
  position: string;
  company: string;
  location?: string;
  employmentType: EmploymentType;
  startDate: string;
  endDate?: string;
  isCurrentPosition: boolean;
  description: string;
  achievements: string[];
  technologies: string[];
  order: number;
}

// ==============================================
// EDUCATION SECTION
// ==============================================

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  location?: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string;
  isCurrentlyStudying: boolean;
  gpa?: string;
  activities: string[];
  achievements: string[];
  order: number;
}

// ==============================================
// SKILLS SECTION
// ==============================================

export interface SkillItem {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  yearsOfExperience?: number;
  isCertified: boolean;
  certificationName?: string;
  order: number;
}

// ==============================================
// LANGUAGES SECTION
// ==============================================

export interface LanguageItem {
  id: string;
  language: string;
  listeningLevel: LanguageLevel;
  readingLevel: LanguageLevel;
  speakingLevel: LanguageLevel;
  writingLevel: LanguageLevel;
  certification?: string;
  yearsOfStudy?: number;
  order: number;
}

// ==============================================
// CERTIFICATES SECTION
// ==============================================

export interface CertificateItem {
  id: string;
  title: string;
  issuingOrganization: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  verificationUrl?: string;
  description?: string;
  fileUrl?: string;
  order: number;
}

// ==============================================
// LINKS SECTION
// ==============================================

export interface LinkItem {
  id: string;
  label: string;
  url: string;
  type: LinkType;
  isVisible: boolean;
  order: number;
}

// ==============================================
// CV DATA INTERFACE
// ==============================================

export interface CVData {
  id?: string;
  title: string;
  template: string;
  settings?: {
    // Colores
    sidebarBg?: string;
    developerBg?: string;
    creativeGradient?: string;
    creativeIntensity?: "soft" | "medium" | "strong";
    executiveTop?: string;
    executiveAccent?: string;
    // Tipografía
    fontBody?: string;
    fontHeading?: string;
    // Densidad y layout
    density?: "compact" | "balanced" | "spacious";
    sectionSpacing?: number; // 0-3
    showSectionIcons?: boolean;
    // Acentos
    accentColor?: string;
    headingColor?: string;
    textColor?: string;
    mutedTextColor?: string;
    linkColor?: string;
    // Sidebar
    sidebarTextColor?: string;
    sidebarSectionTitleColor?: string;
  };
  personal: PersonalData;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: SkillItem[];
  languages: LanguageItem[];
  certificates: CertificateItem[];
  links: LinkItem[];
  application?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

// ==============================================
// EDITOR STATE
// ==============================================

interface EditorState {
  cvData: CVData;
  activeSection: SectionType;
  isSaving: boolean;
  lastSaved?: Date;
  hasUnsavedChanges: boolean;
  validationErrors: Record<string, string[]>;
}

// ==============================================
// FORM VALIDATION
// ==============================================

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationErrors {
  [key: string]: string[];
}

// ==============================================
// COMPONENT PROPS
// ==============================================

interface FormSectionProps<T = any> {
  data: T;
  onChange: (data: T) => void;
  errors?: ValidationErrors;
  isLoading?: boolean;
}

