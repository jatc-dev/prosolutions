import React from "react";

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">
        {label}
      </label>
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      />
    </div>
  );
}

interface ColorCustomizerProps {
  settings: {
    accentColor?: string;
    headingColor?: string;
    textColor?: string;
    mutedTextColor?: string;
    linkColor?: string;
    sidebarTextColor?: string;
    sidebarSectionTitleColor?: string;
  };
  onChange: (settings: Partial<ColorCustomizerProps["settings"]>) => void;
}

export function ColorCustomizer({ settings, onChange }: ColorCustomizerProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Mientras no cambies un color, la plantilla usa su propia paleta.
      </p>
      <ColorField
        label="Color de acento"
        value={settings.accentColor || "#3b82f6"}
        onChange={(v) => onChange({ accentColor: v })}
      />
      <ColorField
        label="Color de títulos"
        value={settings.headingColor || "#0f172a"}
        onChange={(v) => onChange({ headingColor: v })}
      />
      <ColorField
        label="Color de texto"
        value={settings.textColor || "#1e293b"}
        onChange={(v) => onChange({ textColor: v })}
      />
      <ColorField
        label="Texto secundario"
        value={settings.mutedTextColor || "#64748b"}
        onChange={(v) => onChange({ mutedTextColor: v })}
      />
      <ColorField
        label="Enlaces"
        value={settings.linkColor || "#2563eb"}
        onChange={(v) => onChange({ linkColor: v })}
      />
      <ColorField
        label="Texto sidebar"
        value={settings.sidebarTextColor || "#e2e8f0"}
        onChange={(v) => onChange({ sidebarTextColor: v })}
      />
      <ColorField
        label="Título sidebar"
        value={settings.sidebarSectionTitleColor || "#f1f5f9"}
        onChange={(v) => onChange({ sidebarSectionTitleColor: v })}
      />
      <button
        type="button"
        onClick={() => onChange({ accentColor: undefined, headingColor: undefined, textColor: undefined, mutedTextColor: undefined, linkColor: undefined, sidebarTextColor: undefined, sidebarSectionTitleColor: undefined })}
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Usar los colores de la plantilla
      </button>
    </div>
  );
}