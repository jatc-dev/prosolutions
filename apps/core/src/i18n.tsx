import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "es" | "en";

export const messages = {
  es: {
    seo: {
      title: "ProSolutions — Ecosistema de herramientas profesionales tech",
      description: "ProSolutions es el ecosistema de herramientas profesionales tech: crea tu CV optimizado para ATS con ProCV y encuentra empleos tech remotos con ProJobs.",
      socialDescription: "Crea tu CV optimizado para ATS con ProCV y encuentra empleos tech remotos con ProJobs. Un solo ecosistema para tu carrera.",
      locale: "es_ES",
      structuredDescription: "Ecosistema de herramientas profesionales tech: ProCV (hojas de vida) y ProJobs (empleos tech remotos).",
    },
    navigation: {
      home: "Inicio",
      procv: "ProCV",
      projobs: "ProJobs",
      plans: "Planes Premium",
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
      badge: "El ecosistema de herramientas tech",
      titleLead: "Tu carrera profesional,",
      titleAccent: "potenciada por un solo ecosistema",
      descriptionLead: "ProSolutions reúne las herramientas que todo profesional tech necesita: crea hojas de vida optimizadas para ATS con",
      connector: "y encuentra empleos remotos con",
      conclusion: "Una cuenta, un ecosistema, cero fricción.",
      procvCta: "Probar ProCV",
      projobsCta: "Explorar Empleos (ProJobs)",
      stats: [
        { value: "2", label: "Módulos activos" },
        { value: "ATS", label: "Plantillas optimizadas" },
        { value: "100%", label: "Enfocado en tech" },
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
        tagline: "Empleos tech remotos",
        description: "Vacantes tech remotas seleccionadas, con filtros por stack y búsqueda en vivo para encontrar tu próximo rol.",
        features: ["Vacantes tech remotas", "Filtros por stack y búsqueda", "Listado actualizado a diario"],
        cta: "Explorar vacantes",
      },
      comingSoon: "Próximamente",
      newModules: "Nuevos módulos SaaS",
      futureDescription: "Estamos construyendo nuevos módulos para el ecosistema ProSolutions: analítica de carrera, portafolios y más herramientas para profesionales tech.",
      soon: "Muy pronto",
    },
    plans: {
      eyebrow: "Planes Premium",
      title: "Potencia tu carrera con ProSolutions Premium",
      description: "Empieza gratis y escala cuando lo necesites. Todos los planes incluyen acceso al ecosistema completo de herramientas.",
      free: { name: "Gratis", period: "/siempre", description: "Para crear tu primer CV profesional y explorar el ecosistema.", features: ["Editor completo de ProCV", "Plantillas base optimizadas para ATS", "Exportación en PDF estándar"], cta: "Empezar gratis" },
      pro: { name: "Pro", period: "/mes", description: "Para profesionales tech que se postulan activamente.", features: ["Todas las plantillas premium", "Análisis y puntaje ATS avanzado", "Múltiples versiones de tu CV", "Exportación PDF, JSON y XML"], cta: "Hazte Pro" },
      teams: { name: "Equipos", period: "/mes", description: "Para reclutadores y equipos que evalúan talento tech.", features: ["Todo lo incluido en Pro", "Gestión de múltiples miembros", "Plantillas corporativas", "Soporte prioritario"], cta: "Contactar" },
      popular: "Más popular",
    },
    footer: {
      ecosystem: "Ecosistema",
      legal: "Legal",
      home: "Inicio",
      plans: "Planes Premium",
      privacy: "Privacidad",
      terms: "Términos",
      description: "El ecosistema de herramientas profesionales tech. Crea tu hoja de vida optimizada para ATS con ProCV y encuentra tu próximo empleo remoto con ProJobs.",
      credit: "Un producto desarrollado por",
      tagline: "Hecho para profesionales tech",
    },
    ads: { label: "Espacios publicitarios" },
    auth: {
      loginTitle: "Iniciar sesión",
      loginSubtitle: "Accede a tu cuenta de ProSolutions",
      email: "Correo electrónico",
      password: "Contraseña",
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
      subtitle: "Crea CVs optimizados para ATS, encuentra empleos tech remotos y gestiona tu perfil profesional en un solo ecosistema.",
      platformTitle: "Todo lo que necesitas para tu carrera tech",
      platformDescription: "Accede a herramientas especializadas para crear currículums, buscar empleo y gestionar tu identidad profesional con un único inicio de sesión.",
      moduleProcv: {
        title: "ProCV Platform",
        badge: "Creador de CVs · Optimización ATS",
        description: "Crea y gestiona tu currículum optimizado para filtros ATS en minutos. Exporta en PDF, JSON y XML.",
        action: "Crear CV sin registro"
      },
      moduleProjobs: {
        title: "ProJobs Platform",
        badge: "Búsqueda de empleo tech · Remoto",
        description: "Encuentra empleo remoto en tecnología según tu stack técnico, seniority y preferencias.",
        action: "Explorar vacantes"
      }
    }
  },
  en: {
    seo: {
      title: "ProSolutions — Professional tech tools ecosystem",
      description: "ProSolutions is the professional tech tools ecosystem: build an ATS-optimized resume with ProCV and find remote tech jobs with ProJobs.",
      socialDescription: "Build an ATS-optimized resume with ProCV and find remote tech jobs with ProJobs. One ecosystem for your career.",
      locale: "en_US",
      structuredDescription: "Professional tech tools ecosystem: ProCV (resumes) and ProJobs (remote tech jobs).",
    },
    navigation: {
      home: "Home",
      procv: "ProCV",
      projobs: "ProJobs",
      plans: "Premium plans",
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
      badge: "The tech tools ecosystem",
      titleLead: "Your professional career,",
      titleAccent: "powered by one ecosystem",
      descriptionLead: "ProSolutions brings together the tools every tech professional needs: create ATS-optimized resumes with",
      connector: "and find remote jobs with",
      conclusion: "One account, one ecosystem, zero friction.",
      procvCta: "Try ProCV",
      projobsCta: "Explore jobs (ProJobs)",
      stats: [
        { value: "2", label: "Active modules" },
        { value: "ATS", label: "Optimized templates" },
        { value: "100%", label: "Built for tech" },
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
        tagline: "Remote tech jobs",
        description: "Curated remote tech openings, with stack filters and live search to find your next role.",
        features: ["Remote tech openings", "Stack filters and search", "Updated daily"],
        cta: "Explore jobs",
      },
      comingSoon: "Coming soon",
      newModules: "New SaaS modules",
      futureDescription: "We are building new modules for the ProSolutions ecosystem: career analytics, portfolios, and more tools for tech professionals.",
      soon: "Coming soon",
    },
    plans: {
      eyebrow: "Premium plans",
      title: "Move your career forward with ProSolutions Premium",
      description: "Start for free and upgrade when you need more. Every plan includes access to the full tools ecosystem.",
      free: { name: "Free", period: "/forever", description: "Create your first professional CV and explore the ecosystem.", features: ["Full ProCV editor", "ATS-optimized starter templates", "Standard PDF export"], cta: "Get started free" },
      pro: { name: "Pro", period: "/month", description: "For tech professionals actively applying for jobs.", features: ["All premium templates", "Advanced ATS analysis and scoring", "Multiple CV versions", "PDF, JSON, and XML export"], cta: "Get Pro" },
      teams: { name: "Teams", period: "/month", description: "For recruiters and teams evaluating tech talent.", features: ["Everything in Pro", "Multi-member management", "Corporate templates", "Priority support"], cta: "Contact us" },
      popular: "Most popular",
    },
    footer: {
      ecosystem: "Ecosystem",
      legal: "Legal",
      home: "Home",
      plans: "Premium plans",
      privacy: "Privacy",
      terms: "Terms",
      description: "The ecosystem of professional tech tools. Build an ATS-optimized resume with ProCV and find your next remote job with ProJobs.",
      credit: "A product developed by",
      tagline: "Made for tech professionals",
    },
    ads: { label: "Advertising spaces" },
    auth: {
      loginTitle: "Welcome back!",
      loginSubtitle: "Sign in to your ProSolutions account",
      email: "Email",
      password: "Password",
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
      subtitle: "Create ATS-optimized CVs, find remote tech jobs, and manage your professional profile in one ecosystem.",
      platformTitle: "Everything you need for your tech career",
      platformDescription: "Access specialized tools to create CVs, find jobs, and manage your professional identity with a single login.",
      moduleProcv: {
        title: "ProCV Platform",
        badge: "CV Builder · ATS Optimization",
        description: "Create and manage your ATS-optimized CV in minutes. Export in PDF, JSON, and XML.",
        action: "Create CV without registration"
      },
      moduleProjobs: {
        title: "ProJobs Platform",
        badge: "Remote Tech Jobs · Search",
        description: "Find remote tech jobs based on your technical stack, seniority, and preferences.",
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

    try {
      window.localStorage.setItem("prosolutions-core-locale", locale);
    } catch {
      // Language switching remains available when browser storage is disabled.
    }
    writeSharedLocale(locale);
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, copy: messages[locale] }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useCoreLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useCoreLocale must be used inside CoreLocaleProvider");
  return value;
}
