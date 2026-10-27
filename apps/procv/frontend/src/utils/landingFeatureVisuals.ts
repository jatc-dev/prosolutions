import { BarChart3, Bot, FileText, Pencil, Save, ShieldCheck, Smartphone, Sparkles, Upload, Zap, type LucideIcon } from "lucide-react";

interface LandingFeatureVisualInput {
  title: string;
  description: string;
}

interface LandingFeatureVisual {
  icon: LucideIcon;
  iconContainerClass: string;
  borderHoverClass: string;
}

const VISUAL_PALETTE = [
  {
    iconContainerClass: "bg-cyan-100 text-cyan-700 ring-cyan-200",
    borderHoverClass: "hover:border-cyan-200",
  },
  {
    iconContainerClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    borderHoverClass: "hover:border-emerald-200",
  },
  {
    iconContainerClass: "bg-amber-100 text-amber-700 ring-amber-200",
    borderHoverClass: "hover:border-amber-200",
  },
  {
    iconContainerClass: "bg-rose-100 text-rose-700 ring-rose-200",
    borderHoverClass: "hover:border-rose-200",
  },
];

function resolveIcon(text: string): LucideIcon {
  if (/(export|descarga|download|pdf|xml|json)/i.test(text)) return Upload;
  if (/(editor|edita|edit|resume|curriculum|cv)/i.test(text)) return Pencil;
  if (/(template|plantilla|design|diseño|diseno|layout)/i.test(text)) return FileText;
  if (/(contact|correo|email|phone|telefono|whatsapp)/i.test(text)) return Smartphone;
  if (/(auto.?save|autoguard|save|guardado)/i.test(text)) return Save;
  if (/(ai|ia|inteligencia|assistant|asistente)/i.test(text)) return Bot;
  if (/(secure|security|seguridad|privacy|privacidad)/i.test(text)) return ShieldCheck;
  if (/(analytics|analit|metrics|metricas|insight|data|datos)/i.test(text)) return BarChart3;
  if (/(fast|speed|rapid|rápid|rendimiento|performance)/i.test(text)) return Zap;
  return Sparkles;
}

export function getLandingFeatureVisual(feature: LandingFeatureVisualInput, index: number): LandingFeatureVisual {
  const text = `${feature.title} ${feature.description}`.toLowerCase();
  const palette = VISUAL_PALETTE[index % VISUAL_PALETTE.length];

  return {
    icon: resolveIcon(text),
    iconContainerClass: palette.iconContainerClass,
    borderHoverClass: palette.borderHoverClass,
  };
}
