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
    fontBody: 'template',
    fontHeading: 'template',
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
      profileImageSize: ['sm', 'md', 'lg', 'xl'].includes(String(safePersonal.profileImageSize)) ? safePersonal.profileImageSize : 'md',
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
                operations: {
                  description: 'Coordiné las operaciones diarias del área, asegurando el cumplimiento de metas, tiempos y estándares de calidad.',
                  achievements: [
                    'Reduje los tiempos de respuesta al cliente en un 30% reorganizando los turnos y el flujo de trabajo',
                    'Implementé controles de inventario que disminuyeron las pérdidas en un 15%',
                    'Capacité a nuevos integrantes del equipo y acompañé su adaptación al puesto',
                  ],
                },
                manager: {
                  description: 'Lideré equipos de trabajo, coordinando recursos, presupuestos y plazos para cumplir los objetivos del área.',
                  achievements: [
                    'Dirigí un equipo de 12 personas, logrando superar las metas trimestrales durante dos años consecutivos',
                    'Completé proyectos por debajo del presupuesto mediante una gestión eficiente de recursos',
                    'Estandaricé procesos clave que aumentaron la productividad del equipo en un 20%',
                  ],
                },
              },
              personal: {
                summary: {
                  description: 'Resumen profesional conciso destacando experiencia, habilidades y objetivos profesionales.',
                  achievements: [
                    'Acumulé más de 5 años de experiencia en atención al cliente y coordinación de equipos',
                    'Me destaco por la comunicación clara, la organización y el cumplimiento de metas',
                    'Demostré liderazgo en la mejora de procesos y la formación de nuevos colaboradores',
                  ],
                },
              },
              skills: {
                technical: {
                  description: 'Conocimientos y herramientas propios del cargo que respaldan tu experiencia.',
                  achievements: [
                    'Manejo avanzado de Microsoft Excel para reportes, indicadores y control de presupuestos',
                    'Experiencia con sistemas de gestión como SAP o software contable',
                    'Conocimiento de normas de calidad y de seguridad y salud en el trabajo',
                  ],
                },
                soft: {
                  description: 'Habilidades interpersonales y de liderazgo desarrolladas a través de experiencia profesional.',
                  achievements: [
                    'Ejercí liderazgo efectivo de equipos y acompañamiento de colaboradores nuevos',
                    'Establecí comunicación efectiva con clientes, proveedores y equipos de distintas áreas',
                    'Demostré capacidad para resolver problemas y tomar decisiones bajo presión',
                  ],
                },
              },
              education: {
                technical: {
                  description: 'Formación técnica o tecnológica relacionada con tu área de trabajo.',
                  achievements: [
                    'Completé un programa técnico con prácticas en empresas del sector',
                    'Obtuve reconocimiento académico por desempeño destacado',
                    'Desarrollé un proyecto de grado aplicado a una necesidad real de la comunidad',
                  ],
                },
                business: {
                  description: 'Formación en administración de empresas y áreas afines.',
                  achievements: [
                    'Obtuve el título de Administración de Empresas con énfasis en gestión comercial',
                    'Certifiqué competencias en gestión de proyectos',
                    'Demostré experiencia en análisis de procesos y relación con clientes',
                  ],
                },
              },
              languages: {
                multilingual: {
                  description: 'Dominio de varios idiomas útiles para el trabajo.',
                  achievements: [
                    'Alcancé nivel avanzado de inglés (C1) certificado',
                    'Español nativo con excelente redacción y ortografía',
                    'Desarrollé competencia intermedia en francés para comunicación internacional',
                  ],
                },
              },
              certificates: {
                professional: {
                  description: 'Certificaciones profesionales que respaldan tus competencias.',
                  achievements: [
                    'Obtuve certificación en servicio al cliente de alto nivel',
                    'Certifiqué competencias en manejo seguro de alimentos y primeros auxilios',
                    'Completé certificación en gestión de proyectos',
                  ],
                },
              },
              links: {
                professional: {
                  description: 'Perfiles profesionales y portafolio en línea.',
                  achievements: [
                    'Mantengo un perfil de LinkedIn actualizado con recomendaciones de jefes y clientes',
                    'Desarrollé una red profesional con más de 500 contactos en mi sector',
                    'Creé un portafolio con mis proyectos y resultados más destacados',
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
