
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FontSelector } from "./FontSelector";
import { ColorCustomizer } from "./ColorCustomizer";
import { LayoutCustomizer } from "./LayoutCustomizer";
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

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "fonts", label: t("customizer.tabs.fonts", "Fuentes"), icon: "Aa" },
    { key: "colors", label: t("customizer.tabs.colors", "Colores"), icon: "??" },
    { key: "layout", label: t("customizer.tabs.layout", "Layout"), icon: "??" },
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
                ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-300"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "fonts" && (
          <div className="space-y-4">
            <FontSelector
              label={t("customizer.fontBody", "Fuente del cuerpo")}
              value={settings.fontBody || "inter"}
              onChange={(v) => update({ fontBody: v })}
            />
            <FontSelector
              label={t("customizer.fontHeading", "Fuente de t�tulos")}
              value={settings.fontHeading || "inter"}
              onChange={(v) => update({ fontHeading: v })}
            />
          </div>
        )}

        {activeTab === "colors" && (
          <ColorCustomizer
            settings={settings}
            onChange={update}
          />
        )}

        {activeTab === "layout" && (
          <LayoutCustomizer
            settings={settings}
            onChange={update}
          />
        )}
      </div>
    </div>
  );
}

