import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "es" | "en";

export const messages = {
  es: {
    seo: {
      title: "ProSolutions — Herramientas para tu carrera profesional",
      description: "ProSolutions reúne herramientas para tu carrera profesional: crea tu CV optimizado para ATS con ProCV y encuentra empleo en cualquier sector con ProJobs.",
      socialDescription: "Crea tu CV optimizado para ATS con ProCV y encuentra empleo en cualquier sector con ProJobs. Un solo ecosistema para tu carrera.",
      locale: "es_ES",
      structuredDescription: "Ecosistema de herramientas profesionales: ProCV (hojas de vida) y ProJobs (bolsa de empleo para todos los sectores).",
    },
    navigation: {
      home: "Inicio",
      procv: "ProCV",
      projobs: "ProJobs",
      active: "Activo",
      beta: "Beta",
      createCv: "Crear mi CV Gratis",
      exploreJobs: "Explorar Empleos",
      theme: "Tema",
      light: "Activar modo claro",
      dark: "Activar modo oscuro",
      openMenu: "Abrir menu",
      closeMenu: "Cerrar menu",
      ecosystem: "Navegacion del ecosistema ProSolutions",
      language: "Cambiar idioma a inglés",
    },
    hero: {
      badge: "El ecosistema para tu carrera profesional",
      titleLead: "Tu carrera profesional,",
      titleAccent: "potenciada por un solo ecosistema",
      descriptionLead: "ProSolutions reúne las herramientas que todo profesional necesita, sin importar su área: crea hojas de vida optimizadas para ATS con",
      connector: "y encuentra empleo con",
      conclusion: "Una cuenta, un ecosistema, cero fricción.",
      procvCta: "Probar ProCV",
      projobsCta: "Explorar Empleos (ProJobs)",
      stats: [
        { value: "2", label: "Módulos activos" },
        { value: "ATS", label: "Plantillas optimizadas" },
        { value: "1 clic", label: "Para postularte" },
      ],
    },
    modules: {
      eyebrow: "Módulos",
      title: "Un ecosistema, múltiples herramientas",
      description: "Cada módulo de ProSolutions resuelve una etapa de tu carrera profesional. Úsalos por separado o en conjunto: tu información siempre bajo tu control.",
      procv: {
        tagline: "Hojas de vida profesionales",
        description: "Crea, edita y descarga tu hoja de vida con plantillas diseñadas para superar filtros ATS.",
        features: ["Plantillas optimizadas para ATS", "Exportación a PDF, JSON y XML", "Edición en tiempo real"],
        cta: "Ir a ProCV",
      },
      projobs: {
        tagline: "Empleo en todos los sectores",
        description: "Vacantes de todos los sectores, con búsqueda instantánea y filtros por modalidad, salario y habilidades para encontrar tu próximo empleo.",
        features: ["Vacantes de todos los sectores", "Búsqueda y filtros al instante", "Postulación en un clic con tu CV"],
        cta: "Explorar vacantes",
      },
      comingSoon: "Próximamente",
      newModules: "Nuevos módulos SaaS",
      futureDescription: "Estamos construyendo nuevos módulos para el ecosistema ProSolutions: analítica de carrera, portafolios y más herramientas para profesionales de todas las áreas.",
      soon: "Muy pronto",
    },
    footer: {
      ecosystem: "Ecosistema",
      legal: "Legal",
      home: "Inicio",
      privacy: "Privacidad",
      terms: "Términos",
      description: "El ecosistema de herramientas para tu carrera profesional. Crea tu hoja de vida optimizada para ATS con ProCV y encuentra tu próximo empleo con ProJobs.",
      credit: "Un producto desarrollado por",
      tagline: "Hecho para profesionales de todas las áreas",
    },
    ads: { label: "Espacios publicitarios" },
    auth: {
      loginTitle: "Iniciar sesión",
      loginSubtitle: "Accede a tu cuenta de ProSolutions",
      email: "Correo electrónico",
      password: "Contraseña",
      showPassword: "Mostrar contraseña",
      hidePassword: "Ocultar contraseña",
      emailPlaceholder: "Ingresa tu correo",
      passwordPlaceholder: "Ingresa tu contraseña",
      forgotPassword: "¿Olvidaste tu contraseña?",
      signingIn: "Iniciando sesión...",
      signIn: "Iniciar sesión",
      noAccount: "¿No tienes cuenta?",
      createAccount: "Regístrate",
      loginError: "No se pudo iniciar sesión.",
    },
    home: {
      title: "Tu carrera profesional, potenciada por un solo ecosistema",
      subtitle: "Crea CVs optimizados para ATS, encuentra empleo y gestiona tu perfil profesional en un solo ecosistema.",
      platformTitle: "Todo lo que necesitas para tu carrera profesional",
      platformDescription: "Accede a herramientas especializadas para crear currículums, buscar empleo y gestionar tu identidad profesional con un único inicio de sesión.",
      moduleProcv: {
        title: "ProCV Platform",
        badge: "Creador de CVs · Optimización ATS",
        description: "Crea y gestiona tu currículum optimizado para filtros ATS en minutos. Exporta en PDF, JSON y XML.",
        action: "Crear CV sin registro"
      },
      moduleProjobs: {
        title: "ProJobs Platform",
        badge: "Búsqueda de empleo · Todos los sectores",
        description: "Encuentra empleo según tus habilidades, tu experiencia y la modalidad que prefieras.",
        action: "Explorar vacantes"
      }
    }
  },
  en: {
    seo: {
      title: "ProSolutions — Tools for your professional career",
      description: "ProSolutions brings together tools for your career: build an ATS-optimized resume with ProCV and find jobs in any field with ProJobs.",
      socialDescription: "Build an ATS-optimized resume with ProCV and find jobs in any field with ProJobs. One ecosystem for your career.",
      locale: "en_US",
      structuredDescription: "Professional tools ecosystem: ProCV (resumes) and ProJobs (job board for every field).",
    },
    navigation: {
      home: "Home",
      procv: "ProCV",
      projobs: "ProJobs",
      active: "Active",
      beta: "Beta",
      createCv: "Create my free CV",
      exploreJobs: "Explore jobs",
      theme: "Theme",
      light: "Switch to light mode",
      dark: "Switch to dark mode",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      ecosystem: "ProSolutions ecosystem navigation",
      language: "Switch language to Spanish",
    },
    hero: {
      badge: "The ecosystem for your professional career",
      titleLead: "Your professional career,",
      titleAccent: "powered by one ecosystem",
      descriptionLead: "ProSolutions brings together the tools every professional needs, whatever their field: create ATS-optimized resumes with",
      connector: "and find jobs with",
      conclusion: "One account, one ecosystem, zero friction.",
      procvCta: "Try ProCV",
      projobsCta: "Explore jobs (ProJobs)",
      stats: [
        { value: "2", label: "Active modules" },
        { value: "ATS", label: "Optimized templates" },
        { value: "1 click", label: "To apply" },
      ],
    },
    modules: {
      eyebrow: "Modules",
      title: "One ecosystem, multiple tools",
      description: "Each ProSolutions module supports a different stage of your career. Use them on their own or together, with your information always under your control.",
      procv: {
        tagline: "Professional resumes",
        description: "Create, edit, and download your resume with templates designed to pass ATS filters.",
        features: ["ATS-optimized templates", "PDF, JSON, and XML export", "Real-time editing"],
        cta: "Go to ProCV",
      },
      projobs: {
        tagline: "Jobs in every field",
        description: "Openings in every field, with instant search and filters by workplace, salary, and skills to find your next job.",
        features: ["Openings in every field", "Instant search and filters", "One-click apply with your CV"],
        cta: "Explore jobs",
      },
      comingSoon: "Coming soon",
      newModules: "New SaaS modules",
      futureDescription: "We are building new modules for the ProSolutions ecosystem: career analytics, portfolios, and more tools for professionals in every field.",
      soon: "Coming soon",
    },
    footer: {
      ecosystem: "Ecosystem",
      legal: "Legal",
      home: "Home",
      privacy: "Privacy",
      terms: "Terms",
      description: "The ecosystem of tools for your professional career. Build an ATS-optimized resume with ProCV and find your next job with ProJobs.",
      credit: "A product developed by",
      tagline: "Made for professionals in every field",
    },
    ads: { label: "Advertising spaces" },
    auth: {
      loginTitle: "Welcome back!",
      loginSubtitle: "Sign in to your ProSolutions account",
      email: "Email",
      password: "Password",
      showPassword: "Show password",
      hidePassword: "Hide password",
      emailPlaceholder: "Enter your email",
      passwordPlaceholder: "Enter your password",
      forgotPassword: "Forgot Password?",
      signingIn: "Signing in...",
      signIn: "Sign In",
      noAccount: "Don't have an account?",
      createAccount: "Register",
      loginError: "Login failed.",
    },
    home: {
      title: "Your professional career, powered by one ecosystem",
      subtitle: "Create ATS-optimized CVs, find jobs, and manage your professional profile in one ecosystem.",
      platformTitle: "Everything you need for your professional career",
      platformDescription: "Access specialized tools to create CVs, find jobs, and manage your professional identity with a single login.",
      moduleProcv: {
        title: "ProCV Platform",
        badge: "CV Builder · ATS Optimization",
        description: "Create and manage your ATS-optimized CV in minutes. Export in PDF, JSON, and XML.",
        action: "Create CV without registration"
      },
      moduleProjobs: {
        title: "ProJobs Platform",
        badge: "Job Search · Every Field",
        description: "Find jobs based on your skills, experience, and preferred workplace.",
        action: "Explore vacancies"
      }
    }
  },
} as const;

export type CoreCopy = (typeof messages)[Locale];

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  copy: CoreCopy;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const SHARED_LOCALE_COOKIE = "prosolutions_locale";

function readSharedLocale(): Locale | null {
  try {
    const entry = document.cookie.split("; ").find((part) => part.startsWith(`${SHARED_LOCALE_COOKIE}=`));
    const value = entry?.split("=").slice(1).join("=");
    return value === "en" || value === "es" ? value : null;
  } catch {
    return null;
  }
}

function writeSharedLocale(locale: Locale) {
  try {
    const sharedDomain = window.location.hostname === "prosolutions.page" || window.location.hostname.endsWith(".prosolutions.page");
    const domain = sharedDomain ? "; Domain=.prosolutions.page" : "";
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${SHARED_LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${domain}${secure}`;
  } catch {
    // Local preference remains available when cookies are disabled.
  }
}

function getInitialLocale(): Locale {
  // Pre-rendering (Node) has no browser globals: public pages are Spanish.
  if (typeof window === "undefined") return "es";
  const shared = readSharedLocale();
  if (shared) return shared;
  try {
    const saved = window.localStorage.getItem("prosolutions-core-locale");
    if (saved === "en" || saved === "es") return saved;
  } catch {
    // Fall through to the system language.
  }
  return window.navigator.language?.toLowerCase().startsWith("en") ? "en" : "es";
}

export function CoreLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    // Public pages (academy, tools, legal...) ship their own pre-rendered SEO
    // head; only the landing page head is localized here.
    const isLanding = window.location.pathname === "/";
    try {
      window.localStorage.setItem("prosolutions-core-locale", locale);
    } catch {
      // Language switching remains available when browser storage is disabled.
    }
    writeSharedLocale(locale);
    if (!isLanding) return;
    document.title = messages[locale].seo.title;

    const updateMeta = (selector: string, content: string) => {
      document.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
    };
    updateMeta('meta[name="description"]', messages[locale].seo.description);
    updateMeta('meta[property="og:locale"]', messages[locale].seo.locale);
    updateMeta('meta[property="og:title"]', messages[locale].seo.title);
    updateMeta('meta[property="og:description"]', messages[locale].seo.socialDescription);
    updateMeta('meta[name="twitter:title"]', messages[locale].seo.title);
    updateMeta('meta[name="twitter:description"]', messages[locale].seo.socialDescription);

    const structuredData = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
    if (structuredData?.textContent) {
      try {
        const data = JSON.parse(structuredData.textContent);
        data.description = messages[locale].seo.structuredDescription;
        data.inLanguage = locale;
        structuredData.textContent = JSON.stringify(data);
      } catch {
        // Keep the static structured data if its markup cannot be parsed.
      }
    }

  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, copy: messages[locale] }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useCoreLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useCoreLocale must be used inside CoreLocaleProvider");
  return value;
}
