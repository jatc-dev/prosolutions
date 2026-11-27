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
  | 'references'
  | 'application';

export type ContactType = 'personal' | 'work' | 'education' | 'other';
export type PhoneType = 'personal' | 'office' | 'home' | 'whatsapp' | 'other';
export type EmploymentType = 'full-time' | 'part-time' | 'freelance' | 'contract' | 'internship';
export type SkillCategory = 'technical' | 'soft' | 'language' | 'certification';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type LinkType = 'linkedin' | 'github' | 'portfolio' | 'website' | 'twitter' | 'other';
/** Photo shape: round, square, portrait (rounded rectangle), oval (ellipse), arch (rounded top, flat base). */
export type ProfileImageStyle = 'round' | 'square' | 'portrait' | 'oval' | 'arch';
/** Photo size in templates: small, medium (default), large, extra large. */
export type ProfileImageSize = 'sm' | 'md' | 'lg' | 'xl';

// ==============================================
// CONTACT INTERFACES
// ==============================================

export interface ContactItem {
  id: string;
  isVisible?: boolean;
  type: ContactType;
  label: string;
  value: string;
  isPrimary?: boolean;
}

export interface PhoneItem {
  id: string;
  isVisible?: boolean;
  type: PhoneType;
  number: string;
  label?: string;
  isPrimary?: boolean;
}

export interface ReferenceItem {
  id: string;
  isVisible?: boolean;
  type: 'laboral' | 'personal' | 'familiar';
  name: string;
  position?: string;
  company?: string;
  relationship?: string;
  phone?: string;
  email?: string;
  hiddenFields?: string[];
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
  profileImageSize?: ProfileImageSize;
  /** Photo framing inside its shape, 0–100 % (50 = centred). */
  profileImagePositionX?: number;
  /** Photo zoom inside its frame: 1 = none, up to 2.5. */
  profileImageZoom?: number;
  profileImagePositionY?: number;
  /** false removes the template's photo border. */
  profileImageBorder?: boolean;
  showProfileImage?: boolean;
  documentType?: string;
  documentNumber?: string;
  showDocumentIdentity?: boolean;
  /** Tarjeta o matrícula profesional (see modules/procv/professionalCard.ts). */
  professionalCardNumber?: string;
  professionalCardIssuer?: string;
  professionalCardDate?: string;
  showProfessionalCard?: boolean;
  showProfessionalCardIssuer?: boolean;
  showProfessionalCardDate?: boolean;
  showFullName?: boolean;
  showProfessionalTitle?: boolean;
  showNationality?: boolean;
  /** How emails and phones are introduced in the templates (default: label). */
  contactLabelStyle?: 'label' | 'icon' | 'none';
  showDocumentType?: boolean;
  showDocumentNumber?: boolean;
  sidebarIntroMode?: 'valueProposition' | 'summary' | 'none';
  /** Given names and surnames as entered; fullName is both joined (see personName.ts). */
  firstName?: string;
  lastName?: string;
  references?: ReferenceItem[];
  showReferences?: boolean;
  referencesAvailableOnRequest?: boolean;
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
  showValuePropositionContent?: boolean;
  summary: string;
  showSummaryTitle?: boolean;
  showSummaryContent?: boolean;

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
  isVisible?: boolean;
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
  /** Formato único (Función Pública): sector; empty = from the employment type (see dafpExperience.ts). */
  dafpSector?: string;
  /** Formato único: area or office ("dependencia") of the entity. */
  dafpDependency?: string;
  /** Formato único: department (Colombian administrative region) of the entity. */
  dafpDepartment?: string;
  /** Formato único: entity's address, phone and e-mail. */
  dafpAddress?: string;
  dafpPhone?: string;
  dafpEmail?: string;
}

// ==============================================
// EDUCATION SECTION
// ==============================================

export interface EducationItem {
  id: string;
  isVisible?: boolean;
  degree: string;
  institution: string;
  location?: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string;
  isCurrentlyStudying: boolean;
  gpa?: string;
  /** Formato único (Función Pública): academic modality code, see education.ts. */
  dafpModality?: string;
  /** Formato único: approved semesters. */
  dafpSemesters?: string;
  /** Formato único: graduated ("yes" / "no"); empty = from the dates. */
  dafpGraduated?: string;
  activities: string[];
  achievements: string[];
  order: number;
}

// ==============================================
// SKILLS SECTION
// ==============================================

export interface SkillItem {
  id: string;
  isVisible?: boolean;
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
  isVisible?: boolean;
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
  isVisible?: boolean;
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

export interface CoverLetterData {
  recipientName?: string;
  recipientTitle?: string;
  company?: string;
  companyAddress?: string;
  /** Position applied for (defaults to the CV's professional title in the draft). */
  position?: string;
  city?: string;
  /** ISO date (YYYY-MM-DD) printed as "Ciudad, 19 de noviembre de 2026". */
  date?: string;
  greeting?: string;
  /** Paragraphs separated by a blank line. */
  body?: string;
  closing?: string;
}

export interface CVData {
  id?: string;
  title: string;
  template: string;
  settings?: {
    /** Sections hidden from the CV (their data is kept), e.g. ["certificates"]. */
    hiddenSections?: string[];
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
    /** Size multipliers (1 = the template's size); see FONT_SCALE_STEPS. */
    fontScaleBody?: number;
    fontScaleHeading?: number;
    /** User-renamed section titles; empty or missing uses the default. */
    sectionTitles?: Partial<Record<"summary" | "experience" | "education" | "skills" | "languages" | "certificates" | "links", string>>;
    // Densidad y layout
    density?: "tight" | "compact" | "balanced" | "spacious" | "airy";
    sectionSpacing?: number; // 0-6, see cvSpacing.ts
    // Acentos
    accentColor?: string;
    /** Page (paper) colour, see pageColor.ts. */
    pageColor?: string;
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
  /** Cover letter stored with the CV: reuses its personal data, template, fonts and colours. */
  coverLetter?: CoverLetterData;
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

