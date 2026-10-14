interface LandingFeatureVisualInput {
  title: string;
  description: string;
}

interface LandingFeatureVisual {
  icon: string;
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

function resolveIcon(text: string): string {
  if (/(export|descarga|download|pdf|xml|json)/i.test(text)) return "📤";
  if (/(editor|edita|edit|resume|curriculum|cv)/i.test(text)) return "✏️";
  if (/(template|plantilla|design|diseño|diseno|layout)/i.test(text)) return "📄";
  if (/(contact|correo|email|phone|telefono|whatsapp)/i.test(text)) return "📱";
  if (/(auto.?save|autoguard|save|guardado)/i.test(text)) return "💾";
  if (/(ai|ia|inteligencia|assistant|asistente)/i.test(text)) return "🤖";
  if (/(secure|security|seguridad|privacy|privacidad)/i.test(text)) return "🔒";
  if (/(analytics|analit|metrics|metricas|insight|data|datos)/i.test(text)) return "📊";
  if (/(fast|speed|rapid|rápid|rendimiento|performance)/i.test(text)) return "⚡";
  return "✨";
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
