export interface TemplateVisualSettings {
  sidebarBg?: string;
  developerBg?: string;
  creativeGradient?: string;
  creativeIntensity?: "soft" | "medium" | "strong";
  executiveTop?: string;
  executiveAccent?: string;
  extensaTop?: string;
  extensaAccent?: string;
  extensaDensity?: "normal" | "compact";
}

export interface TemplateColorOption {
  value: string;
  label: string;
  mode: "solid" | "gradient";
  accent?: string;
}

const PRESETS: Record<string, TemplateColorOption[]> = {
  sidebar: [
    { value: "#0f172a", label: "Slate", mode: "solid" },
    { value: "#1e3a8a", label: "Navy", mode: "solid" },
    { value: "#064e3b", label: "Emerald", mode: "solid" },
    { value: "#7c2d12", label: "Copper", mode: "solid" },
    { value: "#4a044e", label: "Plum", mode: "solid" },
    { value: "#14532d", label: "Forest", mode: "solid" },
    { value: "#1f2937", label: "Graphite", mode: "solid" },
    { value: "#0c4a6e", label: "Ocean", mode: "solid" },
    { value: "#172554", label: "Royal Blue", mode: "solid" },
    { value: "#3f3f46", label: "Zinc", mode: "solid" },
  ],
  developer: [
    { value: "#020617", label: "Midnight", mode: "solid" },
    { value: "#0f172a", label: "Slate", mode: "solid" },
    { value: "#0b1120", label: "Code Blue", mode: "solid" },
    { value: "#111827", label: "Graphite", mode: "solid" },
    { value: "#052e16", label: "Terminal Green", mode: "solid" },
    { value: "#0a0f1f", label: "Deep Space", mode: "solid" },
    { value: "#1e293b", label: "Steel", mode: "solid" },
    { value: "#0c1225", label: "Night IDE", mode: "solid" },
    { value: "#082f49", label: "Cyber Teal", mode: "solid" },
    { value: "#1f2937", label: "Dark Graphite", mode: "solid" },
  ],
  creative: [
    {
      value: "linear-gradient(135deg, #3730a3 0%, #0f172a 55%, #1e293b 100%)",
      label: "Indigo Night",
      mode: "gradient",
    },
    {
      value: "linear-gradient(135deg, #9a3412 0%, #7f1d1d 45%, #1f2937 100%)",
      label: "Sunset Ember",
      mode: "gradient",
    },
    {
      value: "linear-gradient(135deg, #0f766e 0%, #1d4ed8 50%, #312e81 100%)",
      label: "Ocean Pulse",
      mode: "gradient",
    },
    {
      value: "linear-gradient(135deg, #4c1d95 0%, #7c2d12 45%, #0f172a 100%)",
      label: "Neon Studio",
      mode: "gradient",
    },
    {
      value: "linear-gradient(135deg, #be123c 0%, #7c3aed 50%, #0f172a 100%)",
      label: "Magenta Flux",
      mode: "gradient",
    },
    {
      value: "linear-gradient(135deg, #065f46 0%, #0ea5e9 50%, #1e1b4b 100%)",
      label: "Aurora",
      mode: "gradient",
    },
    {
      value: "linear-gradient(135deg, #9a3412 0%, #f59e0b 45%, #1f2937 100%)",
      label: "Golden Hour",
      mode: "gradient",
    },
    {
      value: "linear-gradient(135deg, #334155 0%, #475569 50%, #111827 100%)",
      label: "Monochrome",
      mode: "gradient",
    },
  ],
  executive: [
    { value: "#0f172a", accent: "#3b82f6", label: "Classic Navy", mode: "solid" },
    { value: "#1f2937", accent: "#10b981", label: "Graphite", mode: "solid" },
    { value: "#111827", accent: "#f59e0b", label: "Carbon Gold", mode: "solid" },
    { value: "#312e81", accent: "#22d3ee", label: "Royal", mode: "solid" },
    { value: "#7f1d1d", accent: "#fda4af", label: "Burgundy", mode: "solid" },
    { value: "#052e16", accent: "#34d399", label: "Emerald Board", mode: "solid" },
    { value: "#1e293b", accent: "#38bdf8", label: "Steel Blue", mode: "solid" },
    { value: "#292524", accent: "#fbbf24", label: "Espresso", mode: "solid" },
    { value: "#172554", accent: "#60a5fa", label: "Imperial", mode: "solid" },
    { value: "#3f3f46", accent: "#a78bfa", label: "Slate Violet", mode: "solid" },
  ],
  extensa: [
    { value: "#0f172a", accent: "#22c55e", label: "Navy Green", mode: "solid" },
    { value: "#1f2937", accent: "#60a5fa", label: "Graphite Blue", mode: "solid" },
    { value: "#172554", accent: "#38bdf8", label: "Royal Cyan", mode: "solid" },
    { value: "#052e16", accent: "#34d399", label: "Forest Mint", mode: "solid" },
    { value: "#7f1d1d", accent: "#fda4af", label: "Burgundy Rose", mode: "solid" },
    { value: "#312e81", accent: "#a78bfa", label: "Indigo Violet", mode: "solid" },
  ],
};

export function getTemplateColorOptions(template: string): TemplateColorOption[] {
  return PRESETS[template] || [];
}

export function getCurrentTemplateColor(template: string, settings: TemplateVisualSettings | undefined): string {
  if (template === "sidebar") return settings?.sidebarBg || "#0f172a";
  if (template === "developer") return settings?.developerBg || "#0f172a";
  if (template === "creative") return settings?.creativeGradient || "linear-gradient(135deg, #3730a3 0%, #0f172a 55%, #1e293b 100%)";
  if (template === "executive") return settings?.executiveTop || "#0f172a";
  if (template === "extensa") return settings?.extensaTop || "#0f172a";
  return "";
}

export function applyTemplateColorSelection(
  template: string,
  option: TemplateColorOption,
  current: TemplateVisualSettings | undefined
): TemplateVisualSettings {
  const base = { ...(current || {}) };

  if (template === "sidebar") {
    base.sidebarBg = option.value;
  }

  if (template === "developer") {
    base.developerBg = option.value;
  }

  if (template === "creative") {
    base.creativeGradient = option.value;
  }

  if (template === "executive") {
    base.executiveTop = option.value;
    base.executiveAccent = option.accent || base.executiveAccent || "#3b82f6";
  }

  if (template === "extensa") {
    base.extensaTop = option.value;
    base.extensaAccent = option.accent || base.extensaAccent || "#22c55e";
  }

  return base;
}
