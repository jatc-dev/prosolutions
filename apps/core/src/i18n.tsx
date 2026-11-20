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
    landing: {
      badge: "Gratis · Sin registro para empezar",
      titleLead: "Tu próximo empleo empieza con",
      titleAccent: "una hoja de vida que sí pasa los filtros",
      description: "Crea tu hoja de vida optimizada para ATS en minutos, busca vacantes de todos los sectores y resuelve tus dudas laborales con calculadoras y guías gratuitas.",
      primaryCta: "Crear mi hoja de vida gratis",
      primaryNote: "Sin registro · Descarga en PDF · 7 plantillas",
      secondaryCta: "Ver cómo funciona",
      searchTitle: "Buscar empleo",
      searchQuery: "Cargo o habilidad",
      searchLocation: "Ciudad",
      searchSubmit: "Buscar vacantes",
      welcome: "Hola",
      welcomeDescription: "Continúa donde lo dejaste.",
      quickLinks: { cvs: "Mis hojas de vida", applications: "Mis postulaciones", jobs: "Buscar empleo", dashboard: "Mi panel" },
      preview: { name: "Laura Gómez", role: "Analista administrativa", score: "Compatible con ATS", sections: ["Perfil profesional", "Experiencia", "Educación", "Habilidades"] },
      productsTitle: "Todo lo que necesitas para tu búsqueda de empleo",
      productsDescription: "Herramientas gratuitas que funcionan juntas con una sola cuenta, para profesionales de todas las áreas.",
      products: {
        procv: { name: "ProCV", tagline: "Hoja de vida ATS", description: "Editor con plantillas que los sistemas de selección leen bien. Importa tu CV en PDF o Word y descárgalo en PDF.", cta: "Crear hoja de vida" },
        projobs: { name: "ProJobs", tagline: "Empleo en todos los sectores", description: "Vacantes con filtros por modalidad, salario y habilidades. Postúlate en un clic con tu CV de ProCV.", cta: "Buscar vacantes" },
        tools: { name: "ProTools", tagline: "Calculadoras laborales", description: "Salario neto, liquidación, contrato laboral frente a prestación de servicios y evaluador de hoja de vida.", cta: "Usar herramientas" },
        academy: { name: "ProAcademy", tagline: "Guías prácticas", description: "Artículos para preparar entrevistas, negociar tu salario y entender tus derechos laborales.", cta: "Leer guías" },
      },
      stepsTitle: "Así de simple",
      steps: [
        { title: "Crea tu hoja de vida", description: "Elige una plantilla, importa tu CV actual o empieza desde cero. No necesitas cuenta para empezar." },
        { title: "Encuentra vacantes", description: "Busca por cargo, ciudad o modalidad y guarda las ofertas que te interesan." },
        { title: "Postúlate en un clic", description: "Con tu cuenta, envía tu hoja de vida de ProCV y sigue el estado de cada postulación." },
      ],
      toolsTitle: "Calculadoras gratuitas",
      toolsDescription: "Resuelve en segundos las dudas más comunes sobre tu salario y tu contrato.",
      toolsCta: "Ver todas las herramientas",
      academyTitle: "Guías para tu carrera",
      academyDescription: "Contenido práctico escrito por el equipo de ProSolutions.",
      academyCta: "Ver todas las guías",
      readMinutes: "min de lectura",
      employersTitle: "¿Tu empresa está contratando?",
      employersDescription: "Publica vacantes con salario visible, recibe hojas de vida ordenadas y gestiona tus candidatos en un solo tablero.",
      employersCta: "Publicar una vacante",
      finalTitle: "Empieza hoy tu hoja de vida",
      finalDescription: "Es gratis, no necesitas registrarte y puedes descargarla cuando quieras.",
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
    landing: {
      badge: "Free · No sign-up to start",
      titleLead: "Your next job starts with",
      titleAccent: "a CV that actually gets through",
      description: "Build an ATS-friendly CV in minutes, search jobs in every sector and get answers to your work questions with free calculators and guides.",
      primaryCta: "Create my free CV",
      primaryNote: "No sign-up · PDF download · 7 templates",
      secondaryCta: "See how it works",
      searchTitle: "Search jobs",
      searchQuery: "Job title or skill",
      searchLocation: "City",
      searchSubmit: "Search jobs",
      welcome: "Hi",
      welcomeDescription: "Pick up where you left off.",
      quickLinks: { cvs: "My CVs", applications: "My applications", jobs: "Search jobs", dashboard: "My dashboard" },
      preview: { name: "Laura Gómez", role: "Administrative analyst", score: "ATS-friendly", sections: ["Professional summary", "Experience", "Education", "Skills"] },
      productsTitle: "Everything you need for your job search",
      productsDescription: "Free tools that work together with a single account, for professionals in every field.",
      products: {
        procv: { name: "ProCV", tagline: "ATS-friendly CV", description: "An editor with templates that hiring systems read well. Import your CV from PDF or Word and download it as PDF.", cta: "Create a CV" },
        projobs: { name: "ProJobs", tagline: "Jobs in every sector", description: "Openings you can filter by work mode, salary and skills. Apply in one click with your ProCV CV.", cta: "Search jobs" },
        tools: { name: "ProTools", tagline: "Work calculators", description: "Net salary, severance, employment vs. contractor and a CV checker.", cta: "Use the tools" },
        academy: { name: "ProAcademy", tagline: "Practical guides", description: "Articles to prepare interviews, negotiate your salary and understand your rights at work.", cta: "Read the guides" },
      },
      stepsTitle: "It's that simple",
      steps: [
        { title: "Create your CV", description: "Pick a template, import your current CV or start from scratch. No account needed to begin." },
        { title: "Find openings", description: "Search by title, city or work mode and save the jobs you like." },
        { title: "Apply in one click", description: "With an account, send your ProCV CV and track every application." },
      ],
      toolsTitle: "Free calculators",
      toolsDescription: "Answer the most common salary and contract questions in seconds (Colombian rules, in Spanish).",
      toolsCta: "See all tools",
      academyTitle: "Career guides",
      academyDescription: "Practical content written by the ProSolutions team (in Spanish).",
      academyCta: "See all guides",
      readMinutes: "min read",
      employersTitle: "Is your company hiring?",
      employersDescription: "Post jobs with visible salaries, receive tidy CVs and manage candidates on a single board.",
      employersCta: "Post a job",
      finalTitle: "Start your CV today",
      finalDescription: "It's free, no sign-up required, and you can download it whenever you want.",
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
