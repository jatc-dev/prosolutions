
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { LayoutPanelLeft, Palette, Type, type LucideIcon } from "lucide-react";
import { FontSelector, FontSizeStepper } from "./FontSelector";
import { ColorCustomizer } from "./ColorCustomizer";
import { LayoutCustomizer } from "./LayoutCustomizer";
import { SectionTitlesEditor } from "./SectionTitlesEditor";
import { CVData } from "../../../../../shared/types";

interface CustomizerPanelProps {
  settings: NonNullable<CVData["settings"]>;
  onSettingsChange: (settings: NonNullable<CVData["settings"]>) => void;
}

type Tab = "fonts" | "colors" | "layout";

export function CustomizerPanel({ settings, onSettingsChange }: CustomizerPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("fonts");

  const update = (partial: NonNullable<CVData["settings"]>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  const tabs: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: "fonts", label: t("customizer.tabs.fonts", "Fuentes"), icon: Type },
    { key: "colors", label: t("customizer.tabs.colors", "Colores"), icon: Palette },
    { key: "layout", label: t("customizer.tabs.layout", "Diseño"), icon: LayoutPanelLeft },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {t("customizer.title", "Personalizar plantilla")}
        </h3>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-brand-700 text-brand-800 dark:border-brand-400 dark:text-brand-300"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <tab.icon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "fonts" && (
          <div className="space-y-4">
            {/* One typeface for titles and text, like most CV builders; the
                two stored keys are kept so older CVs render unchanged. */}
            <FontSelector
              label={t("customizer.font", "Tipografía")}
              value={settings.fontBody || "template"}
              onChange={(v) => update({ fontBody: v, fontHeading: v })}
            />
            <div className="grid grid-cols-2 gap-3">
              <FontSizeStepper
                label={t("customizer.headingSize", "Tamaño de títulos")}
                value={settings.fontScaleHeading}
                onChange={(v) => update({ fontScaleHeading: v })}
              />
              <FontSizeStepper
                label={t("customizer.bodySize", "Tamaño del texto")}
                value={settings.fontScaleBody}
                onChange={(v) => update({ fontScaleBody: v })}
              />
            </div>
          </div>
        )}

        {activeTab === "colors" && (
          <ColorCustomizer
            settings={settings}
            onChange={update}
          />
        )}

        {activeTab === "layout" && (
          <div className="space-y-5">
            <LayoutCustomizer
              settings={settings}
              onChange={update}
            />
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <SectionTitlesEditor
                value={settings.sectionTitles}
                onChange={(sectionTitles) => update({ sectionTitles })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

