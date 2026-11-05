import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";
import { Button, Input } from "@prosolutions/ui";
import { MODULES, PlatformModule } from "../../shared/config/platform";
import { CURATED_CV_TEMPLATES } from "../../shared/utils/templateCatalog";

interface BilingualFeature {
  id: string;
  en: {
    title: string;
    description: string;
  };
  es: {
    title: string;
    description: string;
  };
}

interface ModuleStatus {
  id: string;
  name: string;
  path: string;
  status: "active" | "beta" | "planned";
}

interface FeaturedTemplate {
  key: string;
  label: string;
  category: string;
  featured: boolean;
}

function syncModulesWithRegistry(localModules: ModuleStatus[]): ModuleStatus[] {
  return MODULES.map((module: PlatformModule) => {
    const local = localModules.find((m) => m.id === module.id);
    return {
      id: module.id,
      name: module.name,
      path: module.path,
      status: local?.status ?? module.status,
    };
  });
}

export function LandingPageManagement() {
  const { t } = useTranslation();
  const [features, setFeatures] = useState<BilingualFeature[]>([]);
  const [modules, setModules] = useState<ModuleStatus[]>([]);
  const [featuredTemplates, setFeaturedTemplates] = useState<FeaturedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadFeatures();
    loadModules();
    loadFeaturedTemplates();
  }, []);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/settings");

      const enSetting = response.data.find((s: any) => s.key === "landing_features_en");
      const esSetting = response.data.find((s: any) => s.key === "landing_features_es");

      const enFeatures = enSetting ? JSON.parse(enSetting.value) : [];
      const esFeatures = esSetting ? JSON.parse(esSetting.value) : [];

      const bilingualFeatures: BilingualFeature[] = [];
      const maxLength = Math.max(enFeatures.length, esFeatures.length);

      for (let i = 0; i < maxLength; i++) {
        if (enFeatures[i] || esFeatures[i]) {
          bilingualFeatures.push({
            id: enFeatures[i]?.id || esFeatures[i]?.id || Date.now().toString(),
            en: {
              title: enFeatures[i]?.title || "",
              description: enFeatures[i]?.description || "",
            },
            es: {
              title: esFeatures[i]?.title || "",
              description: esFeatures[i]?.description || "",
            },
          });
        }
      }
      setFeatures(bilingualFeatures);
    } catch (err: any) {
      console.error("Error loading features:", err);
      setError(t("admin.landingManagement.errors.loadFeatures"));
    } finally {
      setLoading(false);
    }
  };

  const loadModules = async () => {
    try {
      const response = await api.get("/admin/settings");
      const modulesSetting = response.data.find((s: any) => s.key === "landing_modules");
      const savedModules = modulesSetting ? JSON.parse(modulesSetting.value) : [];

      setModules(syncModulesWithRegistry(savedModules));
    } catch (err: any) {
      console.error("Error loading modules:", err);
      setModules(syncModulesWithRegistry([]));
    }
  };

  const loadFeaturedTemplates = async () => {
    try {
      const response = await api.get("/admin/settings");
      const templatesSetting = response.data.find((s: any) => s.key === "landing_featured_templates");
      const saved = templatesSetting ? JSON.parse(templatesSetting.value) : [];

      const merged = CURATED_CV_TEMPLATES.map((t: typeof CURATED_CV_TEMPLATES[number]) => {
        const local = saved.find((st: any) => st.key === t.key);
        return {
          key: t.key,
          label: t.label,
          category: t.category,
          featured: local?.featured ?? false,
        };
      });

      setFeaturedTemplates(merged);
    } catch (err: any) {
      console.error("Error loading featured templates:", err);
      setFeaturedTemplates(
        CURATED_CV_TEMPLATES.map((t: typeof CURATED_CV_TEMPLATES[number]) => ({
          key: t.key,
          label: t.label,
          category: t.category,
          featured: false,
        }))
      );
    }
  };

  const saveAll = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const enFeatures = features.map((f) => ({
        id: f.id,
        title: f.en.title,
        description: f.en.description,
      }));

      const esFeatures = features.map((f) => ({
        id: f.id,
        title: f.es.title,
        description: f.es.description,
      }));

      const settingsToUpdate = [
        {
          key: "landing_features_en",
          value: JSON.stringify(enFeatures),
          type: "json",
          category: "landing",
          description: "Landing page features in English",
          isPublic: true,
        },
        {
          key: "landing_features_es",
          value: JSON.stringify(esFeatures),
          type: "json",
          category: "landing",
          description: "Landing page features in Spanish",
          isPublic: true,
        },
        {
          key: "landing_modules",
          value: JSON.stringify(modules),
          type: "json",
          category: "landing",
          description: "Platform module statuses",
          isPublic: true,
        },
        {
          key: "landing_featured_templates",
          value: JSON.stringify(featuredTemplates),
          type: "json",
          category: "landing",
          description: "Featured CV templates for public catalog",
          isPublic: true,
        },
      ];

      await api.put("/admin/settings", { settings: settingsToUpdate });

      setSuccess(t("admin.landingManagement.success.saved"));
    } catch (err: any) {
      console.error("Error saving settings:", err);
      setError(t("admin.landingManagement.errors.saveFeatures"));
    } finally {
      setSaving(false);
    }
  };

  const updateFeature = (index: number, language: "en" | "es", field: "title" | "description", value: string) => {
    const newFeatures = [...features];
    newFeatures[index][language][field] = value;
    setFeatures(newFeatures);
  };

  const addFeature = () => {
    const newFeatures = [...features];
    const newId = Date.now().toString();
    newFeatures.push({
      id: newId,
      en: { title: "", description: "" },
      es: { title: "", description: "" },
    });
    setFeatures(newFeatures);
  };

  const removeFeature = (index: number) => {
    const newFeatures = [...features];
    newFeatures.splice(index, 1);
    setFeatures(newFeatures);
  };

  const moveFeature = (fromIndex: number, toIndex: number) => {
    const newFeatures = [...features];
    const [moved] = newFeatures.splice(fromIndex, 1);
    newFeatures.splice(toIndex, 0, moved);
    setFeatures(newFeatures);
  };

  const updateModuleStatus = (moduleId: string, status: "active" | "beta" | "planned") => {
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, status } : m))
    );
  };

  const toggleTemplateFeatured = (templateKey: string) => {
    setFeaturedTemplates((prev) =>
      prev.map((t) =>
        t.key === templateKey ? { ...t, featured: !t.featured } : t
      )
    );
  };

  if (loading) {
    return (
      <div className="ui-card flex items-center justify-center h-64">
        <div className="text-lg text-slate-600">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t("admin.landingManagement.title")}
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            {t("admin.landingManagement.subtitle")}
          </p>
        </div>
        <Button
          onClick={saveAll}
          disabled={saving}
          variant="primary"
        >
          {saving ? t("admin.landingManagement.saving") : t("admin.landingManagement.saveChanges")}
        </Button>
      </div>

      {error && (
        <div className="ui-error-state" role="alert" aria-live="assertive">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200" role="status" aria-live="polite">
          <p>{success}</p>
        </div>
      )}

      {/* Module Status Management */}
      <div className="ui-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Modulos del catalogo
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Gestiona el estado de publicacion de cada modulo en el catalogo publico.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((module) => (
            <div key={module.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {module.name}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  module.status === "active"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : module.status === "beta"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}>
                  {module.status}
                </span>
              </div>
              <select
                value={module.status}
                onChange={(e) => updateModuleStatus(module.id, e.target.value as "active" | "beta" | "planned")}
                className="text-xs rounded-lg border border-slate-300 px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-500"
              >
                <option value="active">Activo</option>
                <option value="beta">Beta</option>
                <option value="planned">Planificado</option>
              </select>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Plantillas destacadas
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Selecciona que plantillas aparecen destacadas en el catalogo publico.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredTemplates.map((t) => (
              <div
                key={t.key}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  t.featured
                    ? "border-brand-500 dark:border-brand-400 bg-brand-50 dark:bg-brand-900/20"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-400/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={t.featured}
                  onChange={() => toggleTemplateFeatured(t.key)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 dark:text-brand-400"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">{t.label}</span>
                <span className="ml-auto text-[10px] uppercase tracking-tighter text-slate-400 dark:text-slate-500">
                  {t.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features List */}
      <div className="ui-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t("admin.landingManagement.featuresTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {t("admin.landingManagement.featuresSubtitle")}
            </p>
          </div>
          <Button
            onClick={addFeature}
            variant="outline"
            size="sm"
          >
            {t("admin.landingManagement.addFeature")}
          </Button>
        </div>

        {features.map((feature, index) => (
          <div key={feature.id} className="ui-surface p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {t("admin.landingManagement.featureLabel", { number: index + 1 })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveFeature(index, Math.max(0, index - 1))}
                  disabled={index === 0}
                  aria-label={t("admin.landingManagement.moveUp", { defaultValue: `Move feature ${index + 1} up` })}
                  title={t("admin.landingManagement.moveUp", { defaultValue: `Move feature ${index + 1} up` })}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-50 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveFeature(index, Math.min(features.length - 1, index + 1))}
                  disabled={index === features.length - 1}
                  aria-label={t("admin.landingManagement.moveDown", { defaultValue: `Move feature ${index + 1} down` })}
                  title={t("admin.landingManagement.moveDown", { defaultValue: `Move feature ${index + 1} down` })}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-50 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeFeature(index)}
                  aria-label={t("admin.landingManagement.removeFeature", { defaultValue: `Remove feature ${index + 1}` })}
                  className="text-red-400 hover:text-red-600"
                >
                  {t("common.remove")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="border-b border-slate-200 pb-1 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  {t("settings.english")}
                </h3>
                <Input
                  label={t("admin.landingManagement.titleLabel")}
                  value={feature.en.title}
                  onChange={(e) => updateFeature(index, "en", "title", e.target.value)}
                  placeholder={t("admin.landingManagement.placeholders.enTitle")}
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t("admin.landingManagement.descriptionLabel")}
                  </label>
                  <textarea
                    value={feature.en.description}
                    onChange={(e) => updateFeature(index, "en", "description", e.target.value)}
                    placeholder={t("admin.landingManagement.placeholders.enDescription")}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="border-b border-slate-200 pb-1 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  {t("settings.spanish")}
                </h3>
                <Input
                  label={t("admin.landingManagement.titleLabel")}
                  value={feature.es.title}
                  onChange={(e) => updateFeature(index, "es", "title", e.target.value)}
                  placeholder={t("admin.landingManagement.placeholders.esTitle")}
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t("admin.landingManagement.descriptionLabel")}
                  </label>
                  <textarea
                    value={feature.es.description}
                    onChange={(e) => updateFeature(index, "es", "description", e.target.value)}
                    placeholder={t("admin.landingManagement.placeholders.esDescription")}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {features.length === 0 && (
          <div className="ui-empty-state py-10">
            {t("admin.landingManagement.empty")}
          </div>
        )}
      </div>
    </div>
  );
}
