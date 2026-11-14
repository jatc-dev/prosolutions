import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  CVData,
  SectionType,
  PersonalData,
  ExperienceItem,
  EducationItem,
  SkillItem,
  LanguageItem,
  CertificateItem,
  LinkItem,
  ValidationErrors
} from '../types';
import { toast } from 'react-hot-toast';
import { api } from '../services/api';

interface CVEditorState {
  // CV Data
  cvData: CVData;
  originalCvData: CVData | null;

  // UI State
  activeSection: SectionType;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;

  // Validation
  validationErrors: ValidationErrors;
  touchedFields: Set<string>;

  // Templates & Suggestions
  templates: Record<string, any>;
  suggestions: Record<string, any[]>;

// Actions
    setActiveSection: (section: SectionType) => void;
    setTemplate: (templateId: string) => void;
  updatePersonal: (data: PersonalData) => void;
  updateExperience: (data: ExperienceItem[]) => void;
  updateEducation: (data: EducationItem[]) => void;
  updateSkills: (data: SkillItem[]) => void;
  updateLanguages: (data: LanguageItem[]) => void;
  updateCertificates: (data: CertificateItem[]) => void;
  updateLinks: (data: LinkItem[]) => void;
  updateCvData: (data: Partial<CVData>) => void;

  // Validation
  validateField: (field: string, value: any) => void;
  validateSection: (section: SectionType) => boolean;
  validateCV: () => boolean;
  getSectionCompletion: (section: SectionType) => boolean;

  // Persistence
  saveCV: () => Promise<void>;
  loadCV: (cvId: string) => Promise<void>;
  resetCV: () => void;
  markAsSaved: () => void;

  // Guest Mode
  isGuest: boolean;
  setIsGuest: (value: boolean) => void;

  // Templates
  loadTemplates: () => Promise<void>;
  applyTemplate: (templateId: string, section: SectionType) => void;
}

export const createInitialCVData = (): CVData => ({
  id: undefined,
  title: 'Mi CV',
  template: 'modern',
  settings: {
    sidebarBg: '#0f172a',
    developerBg: '#0f172a',
    creativeGradient: 'linear-gradient(135deg, #3730a3 0%, #0f172a 55%, #1e293b 100%)',
    creativeIntensity: 'medium',
    executiveTop: '#0f172a',
    executiveAccent: '#3b82f6',
    fontBody: 'inter',
    fontHeading: 'inter',
    density: 'balanced',
    sectionSpacing: 2,
    showSectionIcons: true,
    accentColor: '#3b82f6',
    headingColor: '#0f172a',
    textColor: '#1e293b',
    mutedTextColor: '#64748b',
    linkColor: '#2563eb',
    sidebarTextColor: '#e2e8f0',
    sidebarSectionTitleColor: '#f1f5f9',
  },
  personal: {
    fullName: '',
    professionalTitle: '',
    profileImage: undefined,
    profileImageStyle: 'round',
    birthDate: undefined,
    emails: [{
      id: 'primary-email',
      type: 'personal',
      label: 'Email Personal',
      value: '',
      isPrimary: true,
    }],
    phones: [{
      id: 'primary-phone',
      type: 'personal',
      number: '',
      label: 'Teléfono Personal',
      isPrimary: true,
    }],
    address: '',
    city: '',
    country: '',
    nationality: '',
    showAddress: true,
    showCity: true,
    showCountry: true,
    website: '',
    valueProposition: '',
    showValuePropositionTitle: true,
    sidebarIntroMode: 'valueProposition',
    documentType: '',
    documentNumber: '',
    showDocumentIdentity: false,
    references: [],
    summary: '',
    linkedin: '',
    github: '',
    twitter: '',
  },
  experience: [],
  education: [],
  skills: [],
  languages: [],
  certificates: [],
  links: [],
  application: {},
});

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  if (typeof value === 'number') return value === 1;
  return false;
};

const normalizeLoadedCVData = (rawData: any): CVData => {
  const initial = createInitialCVData();
  const safe = rawData || {};
  const safePersonal = safe.personal || {};
  const normalizedProfileImageStyle = ['round', 'square', 'portrait'].includes(String(safePersonal.profileImageStyle))
    ? safePersonal.profileImageStyle
    : initial.personal.profileImageStyle;
  const rawSkills = Array.isArray(safe.skills) ? safe.skills : [];
  const normalizedSkills = rawSkills.map((item: any, index: number) => ({
    ...item,
    id: item?.id || `skill-${index}`,
    isCertified: toBoolean(item?.isCertified),
    order: typeof item?.order === 'number' ? item.order : index,
  }));
  const normalizedLanguages: LanguageItem[] = Array.isArray(safe.languages) ? safe.languages : [];
  const normalizedCertificates: CertificateItem[] = Array.isArray(safe.certificates)
    ? safe.certificates.map((item: any, index: number) => ({
        id: item?.id || `cert-${index}`,
        title: String(item?.title || '').trim(),
        issuingOrganization: String(item?.issuingOrganization || '').trim(),
        issueDate: String(item?.issueDate || ''),
        expiryDate: item?.expiryDate || '',
        credentialId: item?.credentialId || '',
        verificationUrl: item?.verificationUrl || '',
        description: item?.description || '',
        fileUrl: item?.fileUrl || '',
        order: typeof item?.order === 'number' ? item.order : index,
      })).filter((item: CertificateItem) => item.title.length > 0)
    : [];

  const existingLanguageNames = new Set(
    normalizedLanguages
      .map((lang) => String(lang?.language || '').trim().toLowerCase())
      .filter((name) => name.length > 0)
  );

  const migratedLanguageSkills = normalizedSkills.filter(
    (item: any) => item?.category === 'language' && String(item?.name || '').trim().length > 0
  );

  const existingCertificateTitles = new Set(
    normalizedCertificates
      .map((cert) => String(cert.title || '').trim().toLowerCase())
      .filter((title) => title.length > 0)
  );

  const migratedCertificationSkills = normalizedSkills.filter(
    (item: any) => item?.category === 'certification' && String(item?.name || '').trim().length > 0
  );

  migratedCertificationSkills.forEach((item: any) => {
    const title = String(item.name || '').trim();
    const key = title.toLowerCase();
    if (!key || existingCertificateTitles.has(key)) {
      return;
    }

    normalizedCertificates.push({
      id: `cert-from-skill-${item.id || Math.random().toString(36).slice(2)}`,
      title,
      issuingOrganization: '',
      issueDate: '',
      expiryDate: '',
      credentialId: '',
      verificationUrl: '',
      description: '',
      fileUrl: '',
      order: normalizedCertificates.length,
    });
    existingCertificateTitles.add(key);
  });

  migratedLanguageSkills.forEach((item: any) => {
    const languageName = String(item.name || '').trim();
    const key = languageName.toLowerCase();
    if (!key || existingLanguageNames.has(key)) {
      return;
    }

    normalizedLanguages.push({
      id: `lang-from-skill-${item.id || createInitialCVData().id || Math.random().toString(36).slice(2)}`,
      language: languageName,
      listeningLevel: 'B1',
      readingLevel: 'B1',
      speakingLevel: 'B1',
      writingLevel: 'B1',
      certification: '',
      yearsOfStudy: undefined,
      order: normalizedLanguages.length,
    });
    existingLanguageNames.add(key);
  });

  const normalizedSkillsWithoutLanguage = normalizedSkills
    .filter((item: any) => item?.category !== 'language' && item?.category !== 'certification')
    .map((item: any, index: number) => ({
      ...item,
      order: index,
    }));
  const normalizedLinks: LinkItem[] = Array.isArray(safe.links)
    ? safe.links.map((item: any, index: number) => ({
        ...item,
        id: item?.id || `link-${index}`,
        isVisible: toBoolean(item?.isVisible),
        order: typeof item?.order === 'number' ? item.order : index,
      }))
    : [];

  const legacySocialCandidates = [
    { label: 'Sitio web', type: 'website' as const, url: safePersonal.website },
    { label: 'LinkedIn', type: 'linkedin' as const, url: safePersonal.linkedin },
    { label: 'GitHub', type: 'github' as const, url: safePersonal.github },
    { label: 'Twitter', type: 'twitter' as const, url: safePersonal.twitter },
  ].filter((item) => typeof item.url === 'string' && item.url.trim().length > 0);

  const existingUrls = new Set(
    normalizedLinks
      .map((item) => (item?.url || '').trim().toLowerCase())
      .filter((url) => url.length > 0)
  );

  legacySocialCandidates.forEach((item) => {
    const trimmedUrl = (item.url as string).trim();
    const key = trimmedUrl.toLowerCase();
    if (!key || existingUrls.has(key)) {
      return;
    }

    normalizedLinks.push({
      id: `link-legacy-${normalizedLinks.length}`,
      label: item.label,
      url: trimmedUrl,
      type: item.type,
      isVisible: true,
      order: normalizedLinks.length,
    });
    existingUrls.add(key);
  });

  return {
    ...initial,
    ...safe,
    settings: {
      ...initial.settings,
      ...(safe.settings || {}),
    },
    personal: {
      ...initial.personal,
      ...safePersonal,
      // Asegura que valueProposition y showValuePropositionTitle siempre estén presentes y no undefined
      valueProposition: typeof safePersonal.valueProposition === 'string' ? safePersonal.valueProposition : '',
      showValuePropositionTitle: safePersonal.showValuePropositionTitle === undefined ? true : toBoolean(safePersonal.showValuePropositionTitle),
      profileImageStyle: normalizedProfileImageStyle,
      showProfileImage: toBoolean(safePersonal.showProfileImage),
      documentType: String(safePersonal.documentType || ''),
      documentNumber: String(safePersonal.documentNumber || ''),
      showDocumentIdentity: toBoolean(safePersonal.showDocumentIdentity),
      sidebarIntroMode: ['valueProposition', 'summary', 'none'].includes(String(safePersonal.sidebarIntroMode)) ? safePersonal.sidebarIntroMode : initial.personal.sidebarIntroMode,
      references: Array.isArray(safePersonal.references) ? safePersonal.references.map((item: any, index: number) => ({ ...item, id: item?.id || 'reference-' + index, type: item?.type === 'laboral' ? 'laboral' : 'personal' })) : [],
      showBirthDate: toBoolean(safePersonal.showBirthDate),
      showAge: toBoolean(safePersonal.showAge),
      showAddress: safePersonal.showAddress === undefined ? true : toBoolean(safePersonal.showAddress),
      showCity: safePersonal.showCity === undefined ? true : toBoolean(safePersonal.showCity),
      showCountry: safePersonal.showCountry === undefined ? true : toBoolean(safePersonal.showCountry),
      emails: Array.isArray(safePersonal.emails)
        ? safePersonal.emails.map((item: any, index: number) => ({
            ...item,
            id: item?.id || `email-${index}`,
            isPrimary: toBoolean(item?.isPrimary),
          }))
        : initial.personal.emails,
      phones: Array.isArray(safePersonal.phones)
        ? safePersonal.phones.map((item: any, index: number) => ({
            ...item,
            id: item?.id || `phone-${index}`,
            isPrimary: toBoolean(item?.isPrimary),
          }))
        : initial.personal.phones,
    },
    experience: Array.isArray(safe.experience)
      ? safe.experience.map((item: any, index: number) => ({
          ...item,
          isCurrentPosition: toBoolean(item?.isCurrentPosition),
          order: typeof item?.order === 'number' ? item.order : index,
        }))
      : [],
    skills: normalizedSkillsWithoutLanguage,
    languages: normalizedLanguages,
    certificates: normalizedCertificates.map((item, index) => ({
      ...item,
      order: index,
    })),
    links: normalizedLinks,
  };
};

// Validation rules
const validationRules: Record<string, (value: any) => string | null> = {
  'personal.fullName': (value) => !value || value.trim().length < 2 ? 'El nombre es requerido (mínimo 2 caracteres)' : null,
  'personal.professionalTitle': (value) => !value || value.trim().length < 3 ? 'El título profesional es requerido' : null,
  'personal.summary': (value) => !value || value.trim().length < 50 ? 'El resumen debe tener al menos 50 caracteres' : null,
  'personal.emails.*.value': (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !emailRegex.test(value) ? 'Email inválido' : null;
  },
  'personal.phones.*.number': (value) => {
    if (!value) return null;
    const phoneRegex = /^[+]?[0-9\s\-()]{7,}$/;
    return !phoneRegex.test(value) ? 'Número de teléfono inválido' : null;
  },
  'experience.*.position': (value) => !value || value.trim().length < 2 ? 'El cargo es requerido' : null,
  'experience.*.company': (value) => !value || value.trim().length < 2 ? 'La empresa es requerida' : null,
  'experience.*.startDate': (value) => !value ? 'La fecha de inicio es requerida' : null,
  'experience.*.description': (value) => !value || value.trim().length < 10 ? 'La descripción debe tener al menos 10 caracteres' : null,
  'education.*.degree': (value) => !value ? 'El título es requerido' : null,
  'education.*.institution': (value) => !value || value.trim().length < 2 ? 'La institución es requerida' : null,
  'education.*.startDate': (value) => !value ? 'La fecha de inicio es requerida' : null,
  'skills.*.name': (value) => !value || value.trim().length < 2 ? 'El nombre de la habilidad es requerido' : null,
  'languages.*.language': (value) => !value ? 'El idioma es requerido' : null,
  'certificates.*.title': (value) => !value || value.trim().length < 2 ? 'El título es requerido' : null,
  'certificates.*.issuingOrganization': (value) => !value || value.trim().length < 2 ? 'La organización emisora es requerida' : null,
  'links.*.url': (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'URL inválida';
    }
  },
};

const getFieldValue = (root: unknown, path: string[]): unknown =>
  path.reduce<unknown>((value, segment) => {
    if (segment === '*') return value;
    if (value === null || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[segment];
  }, root);

const expandValidationPath = (root: unknown, path: string[]): Array<{ path: string; value: unknown }> => {
  const visit = (value: unknown, remaining: string[], resolved: string[]): Array<{ path: string; value: unknown }> => {
    if (remaining.length === 0) return [{ path: resolved.join('.'), value }];

    const [segment, ...rest] = remaining;
    if (segment === '*') {
      if (!Array.isArray(value)) return [];
      return value.flatMap((item, index) => visit(item, rest, [...resolved, String(index)]));
    }

    if (value === null || typeof value !== 'object') return [];
    const child = (value as Record<string, unknown>)[segment];
    return visit(child, rest, [...resolved, segment]);
  };

  return visit(root, path, []);
};

export const useCVEditorStore = create<CVEditorState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        cvData: createInitialCVData(),
        originalCvData: null,
        activeSection: 'personal',
        isLoading: false,
        isSaving: false,
        lastSaved: null,
        hasUnsavedChanges: false,
        validationErrors: {},
        touchedFields: new Set(),
        templates: {},
        suggestions: {},
        isGuest: false,

        // Actions
        setActiveSection: (section) => set({ activeSection: section }),
        setTemplate: (templateId: string) => {
          set((state) => ({
            cvData: { ...state.cvData, template: templateId },
            hasUnsavedChanges: true,
          }));
        },

        updatePersonal: (data) => {
          try {
            set((state) => {
              const newCvData = { ...state.cvData, personal: data };
              return {
                cvData: newCvData,
                hasUnsavedChanges: true,
              };
            });
          } catch (err) {
            toast.error('Error actualizando datos personales');
          }
        },

        updateExperience: (data) =>
          set((state) => {
            const newCvData = { ...state.cvData, experience: data };
            return {
              cvData: newCvData,
              hasUnsavedChanges: true,
            };
          }),

        updateEducation: (data) =>
          set((state) => {
            const newCvData = { ...state.cvData, education: data };
            return {
              cvData: newCvData,
              hasUnsavedChanges: true,
            };
          }),

        updateSkills: (data) =>
          set((state) => {
            const newCvData = { ...state.cvData, skills: data };
            return {
              cvData: newCvData,
              hasUnsavedChanges: true,
            };
          }),

        updateLanguages: (data) =>
          set((state) => {
            const newCvData = { ...state.cvData, languages: data };
            return {
              cvData: newCvData,
              hasUnsavedChanges: true,
            };
          }),

        updateCertificates: (data) =>
          set((state) => {
            const newCvData = { ...state.cvData, certificates: data };
            return {
              cvData: newCvData,
              hasUnsavedChanges: true,
            };
          }),

        updateLinks: (data) =>
          set((state) => {
            const newCvData = { ...state.cvData, links: data };
            return {
              cvData: newCvData,
              hasUnsavedChanges: true,
            };
          }),

        updateCvData: (data) =>
          set((state) => ({
            cvData: { ...state.cvData, ...data },
            hasUnsavedChanges: true,
          })),

        // Validation
        validateField: (field, value) => {
          const rule = validationRules[field] || validationRules[field.replace(/\.\d+\./, '.*.')];
          if (!rule) return;

          let error: string | null;
          try {
            error = rule(value);
          } catch {
            error = 'No se pudo validar este campo';
          }

          set((state) => {
            const validationErrors = { ...state.validationErrors };
            if (error) validationErrors[field] = [error];
            else delete validationErrors[field];

            return {
              validationErrors,
              touchedFields: new Set([...state.touchedFields, field]),
            };
          });
        },

        validateSection: (section) => {
          const sectionPrefix = `${section}.`;
          const { cvData } = get();
          const nextSectionErrors: ValidationErrors = {};
          const sectionTouched = new Set<string>();

          try {
            Object.entries(validationRules).forEach(([rulePath, rule]) => {
              if (!rulePath.startsWith(sectionPrefix)) return;

              const dataPath = rulePath.slice(sectionPrefix.length).split('.');
              const matches = expandValidationPath(cvData[section as keyof CVData], dataPath);
              if (!rulePath.includes('*') && matches.length === 0) {
                matches.push({ path: dataPath.join('.'), value: getFieldValue(cvData[section as keyof CVData], dataPath) });
              }

              matches.forEach(({ path, value }) => {
                const field = `${section}.${path}`;
                sectionTouched.add(field);
                const error = rule(value);
                if (error) nextSectionErrors[field] = [error];
              });
            });
          } catch {
            return false;
          }

          set((state) => {
            const validationErrors = Object.fromEntries(
              Object.entries(state.validationErrors).filter(([field]) => !field.startsWith(sectionPrefix)),
            );

            return {
              validationErrors: { ...validationErrors, ...nextSectionErrors },
              touchedFields: new Set([
                ...[...state.touchedFields].filter((field) => !field.startsWith(sectionPrefix)),
                ...sectionTouched,
              ]),
            };
          });

          return Object.keys(nextSectionErrors).length === 0;
        },

        validateCV: () => {
          const state = get();
          const sections: SectionType[] = ['personal', 'experience', 'education', 'skills', 'languages', 'certificates', 'links', 'application'];
          let allValid = true;
          sections.forEach((section) => {
            try {
              if (!state.validateSection(section)) {
                allValid = false;
              }
            } catch {
              allValid = false;
            }
          });
          return allValid;
        },

        getSectionCompletion: (section) => {
          const state = get();
          const sectionData = state.cvData[section as keyof CVData];

          switch (section) {
            case 'personal': {
              const personal = sectionData as PersonalData;
              return !!(
                personal.fullName &&
                personal.professionalTitle &&
                personal.summary &&
                personal.emails.some((e: any) => e.value)
              );
            }
            case 'experience':
              return Array.isArray(sectionData) && sectionData.length > 0;
            case 'education':
              return Array.isArray(sectionData) && sectionData.length > 0;
            case 'skills':
              return Array.isArray(sectionData) && sectionData.length > 0;
            case 'languages':
              return Array.isArray(sectionData) && sectionData.length > 0;
            case 'certificates':
              return Array.isArray(sectionData) && sectionData.length > 0;
            case 'links':
              return Array.isArray(sectionData) && sectionData.length > 0;
            default:
              return false;
          }
        },

        // Persistence
        saveCV: async () => {
          const state = get();

          // Validate before saving — reject if any section has validation errors
          if (!state.validateCV()) {
            set({ isSaving: false });
            throw new Error('VALIDATION_ERROR');
          }

          set({ isSaving: true });

          try {
            // Guest mode: save to localStorage only
            if (state.isGuest) {
              const guestData = {
                title: state.cvData.title,
                template: state.cvData.template,
                data: state.cvData,
              };
              localStorage.setItem('procv_guest_resume', JSON.stringify(guestData));

              set({
                isSaving: false,
                lastSaved: new Date(),
                hasUnsavedChanges: false,
                originalCvData: { ...state.cvData },
              });

              toast.success('CV guardado localmente');
              return;
            }

            // Authenticated mode: save to server
            const cvId = state.cvData.id;
            const saveData = {
              title: state.cvData.title,
              template: state.cvData.template,
              data: state.cvData,
            };

            if (cvId) {
              await api.put(`/cvs/${cvId}`, saveData);
            } else {
              const response = await api.post('/cvs', saveData);
              const result = response.data;
              // Update CV ID in state
              set((state) => ({
                cvData: { ...state.cvData, id: result.cv.id }
              }));
            }

            set({
              isSaving: false,
              lastSaved: new Date(),
              hasUnsavedChanges: false,
              originalCvData: { ...state.cvData },
            });

            toast.success('CV guardado exitosamente');
          } catch (error: any) {
            set({ isSaving: false });
            const message = error?.response?.data?.message || 'Error al guardar el CV';
            toast.error(message);
            throw error;
          }
        },

        loadCV: async (cvId) => {
          set({ isLoading: true });

          try {
            const response = await api.get(`/cvs/${cvId}`);
            const result = response.data;
            const cvData = normalizeLoadedCVData(result.cv?.data ?? result.cv);

            set({
              cvData,
              originalCvData: { ...cvData },
              isLoading: false,
              hasUnsavedChanges: false,
              validationErrors: {},
              touchedFields: new Set(),
            });

            toast.success('CV cargado exitosamente');
          } catch (error: any) {
            set({ isLoading: false });
            const message = error?.response?.data?.message || 'Error al cargar el CV';
            toast.error(message);
            throw error;
          }
        },

        resetCV: () => {
          const initialData = createInitialCVData();
          set({
            cvData: initialData,
            originalCvData: { ...initialData },
            hasUnsavedChanges: false,
            validationErrors: {},
            touchedFields: new Set(),
            lastSaved: null,
          });
          toast.success('CV reiniciado');
        },

        markAsSaved: () => {
          const state = get();
          set({
            lastSaved: new Date(),
            hasUnsavedChanges: false,
            originalCvData: { ...state.cvData },
          });
        },

        // Guest Mode
        setIsGuest: (value: boolean) => {
          set({ isGuest: value });
          if (value) {
            // Load from localStorage when entering guest mode
            const saved = localStorage.getItem('procv_guest_resume');
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                const normalized = normalizeLoadedCVData(parsed?.data ?? parsed);
                set({
                  cvData: normalized,
                  originalCvData: { ...normalized },
                  hasUnsavedChanges: false,
                });
              } catch (error) {
                console.error('Error loading guest resume from localStorage:', error);
              }
            }
          }
        },

        // Templates
        loadTemplates: async () => {
          try {
            // Simulate loading templates
            const templates = {
              experience: {
                developer: {
                  description: 'Desarrollé aplicaciones web utilizando tecnologías modernas, incluyendo React, Node.js y bases de datos SQL/NoSQL. Implementé APIs RESTful y trabajé en equipos ágiles.',
                  achievements: [
                    'Incrementé el rendimiento de la aplicación en un 40% mediante optimizaciones de código y consultas a base de datos eficientes',
                    'Desarrollé nuevas funcionalidades solicitadas por el cliente, incluyendo sistema de autenticación de usuarios y procesamiento de pagos en línea',
                    'Colaboré estrechamente con el equipo de diseño para mejorar la experiencia de usuario y garantizar la accesibilidad del sitio web',
                  ],
                },
                manager: {
                  description: 'Gestioné equipos de desarrollo y proyectos tecnológicos, coordinando recursos, plazos y entregables. Lideré implementaciones de nuevas tecnologías y procesos de mejora continua.',
                  achievements: [
                    'Dirigí un equipo de 5 desarrolladores en proyectos críticos, garantizando entregas puntuales y estándares de calidad del código',
                    'Completé proyectos por debajo del presupuesto y tiempo estimado mediante gestión eficiente de recursos y mitigación proactiva de riesgos',
                    'Introduje metodologías ágiles (Scrum/Kanban) incrementando la productividad del equipo en un 30%',
                  ],
                },
              },
              personal: {
                summary: {
                  description: 'Resumen profesional conciso destacando experiencia, habilidades y objetivos profesionales.',
                  achievements: [
                    'Acumulé más de 5 años de experiencia sólida en desarrollo web full-stack',
                    'Especialicé en tecnologías JavaScript/TypeScript, React y Node.js con expertise comprobada',
                    'Demostré liderazgo técnico efectivo en la gestión y dirección de equipos de desarrollo',
                  ],
                },
              },
              skills: {
                technical: {
                  description: 'Habilidades técnicas avanzadas en desarrollo web, bases de datos y herramientas de desarrollo.',
                  achievements: [
                    'Dominé JavaScript/TypeScript avanzado con experiencia demostrada en frameworks modernos (React, Vue, Angular)',
                    'Especialicé en desarrollo backend con Node.js, Express y bases de datos SQL/NoSQL (PostgreSQL, MongoDB)',
                    'Certifiqué experiencia en DevOps, CI/CD y deployment en la nube (AWS, Azure, Heroku)',
                  ],
                },
                soft: {
                  description: 'Habilidades interpersonales y de liderazgo desarrolladas a través de experiencia profesional.',
                  achievements: [
                    'Ejercí liderazgo efectivo de equipos técnicos y mentoría de desarrolladores junior',
                    'Establecí comunicación efectiva con stakeholders y equipos multidisciplinarios',
                    'Demostré capacidad para resolver problemas complejos y tomar decisiones estratégicas bajo presión',
                  ],
                },
              },
              education: {
                computerScience: {
                  description: 'Formación académica en Ciencias de la Computación o áreas relacionadas con el desarrollo de software.',
                  achievements: [
                    'Completé Ingeniería en Sistemas/Informática con énfasis especializado en desarrollo web y móvil',
                    'Cursé programas especializados en inteligencia artificial y machine learning',
                    'Desarrollé proyecto de grado: Plataforma de e-commerce utilizando tecnologías modernas y escalables',
                  ],
                },
                business: {
                  description: 'Formación en administración de empresas complementada con conocimientos técnicos.',
                  achievements: [
                    'Obtuve Licenciatura en Administración de Empresas con especialización en Tecnologías de la Información',
                    'Certifiqué competencias en gestión de proyectos (PMP, Scrum Master)',
                    'Demostré experiencia en análisis de requisitos y gestión efectiva de stakeholders',
                  ],
                },
              },
              languages: {
                multilingual: {
                  description: 'Dominio de múltiples idiomas incluyendo inglés técnico y español nativo.',
                  achievements: [
                    'Alcanzé nivel avanzado de inglés (C1) con puntuación TOEIC de 950 puntos',
                    'Dominó español nativo con experiencia comprobada en redacción técnica especializada',
                    'Desarrollé competencia intermedia en francés para comunicación internacional efectiva',
                  ],
                },
              },
              certificates: {
                technical: {
                  description: 'Certificaciones profesionales en tecnologías y metodologías de desarrollo.',
                  achievements: [
                    'Obtuve certificación de Arquitecto de Soluciones AWS - experiencia demostrada en arquitectura de nube',
                    'Certifiqué competencias como Desarrollador Profesional de Google Cloud - desarrollo de aplicaciones en la nube',
                    'Completé certificación Scrum Master - liderazgo efectivo de equipos ágiles',
                  ],
                },
              },
              links: {
                professional: {
                  description: 'Perfiles profesionales en plataformas de desarrollo y redes sociales.',
                  achievements: [
                    'Mantengo GitHub con más de 50 repositorios de código abierto y contribuciones activas',
                    'Desarrollé red profesional en LinkedIn con más de 500 conexiones en el sector tecnológico',
                    'Creé portfolio personal showcaseando proyectos destacados y casos de estudio detallados',
                  ],
                },
              },
            };

            set({ templates });
          } catch (error) {
            toast.error('Error cargando plantillas');
          }
        },

        applyTemplate: (templateId, section) => {
          const state = get();
          const template = state.templates[section]?.[templateId];

          if (template) {
            // Apply template based on section
            if (section === 'experience') {
              // This would be applied to the currently edited experience
              toast.success('Plantilla aplicada');
            }
          }
        },
      }),
      {
        name: 'cv-editor-storage',
        partialize: (state) => ({
          cvData: state.cvData,
          activeSection: state.activeSection,
          lastSaved: state.lastSaved,
          isGuest: state.isGuest,
        }),
        onRehydrateStorage: () => (rawState) => {
          if (rawState) {
            const parsed = rawState.lastSaved ? new Date(rawState.lastSaved) : null;
            rawState.lastSaved = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
          }
        },
      }
    ),
    { name: 'cv-editor' }
  )
);
