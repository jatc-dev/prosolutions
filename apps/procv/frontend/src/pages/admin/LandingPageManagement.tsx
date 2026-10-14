import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

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

export function LandingPageManagement() {
  const { t } = useTranslation();
  const [features, setFeatures] = useState<BilingualFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/settings');

      // Get features from settings only (no system defaults)
      const enSetting = response.data.find((s: any) => s.key === 'landing_features_en');
      const esSetting = response.data.find((s: any) => s.key === 'landing_features_es');

      const enFeatures = enSetting ? JSON.parse(enSetting.value) : [];
      const esFeatures = esSetting ? JSON.parse(esSetting.value) : [];

      // Combine saved features into bilingual format
      const bilingualFeatures: BilingualFeature[] = [];
      const maxLength = Math.max(enFeatures.length, esFeatures.length);

      for (let i = 0; i < maxLength; i++) {
        if (enFeatures[i] || esFeatures[i]) {
          bilingualFeatures.push({
            id: enFeatures[i]?.id || esFeatures[i]?.id || Date.now().toString(),
            en: {
              title: enFeatures[i]?.title || '',
              description: enFeatures[i]?.description || ''
            },
            es: {
              title: esFeatures[i]?.title || '',
              description: esFeatures[i]?.description || ''
            }
          });
        }
      }
      setFeatures(bilingualFeatures);
    } catch (err: any) {
      console.error('Error loading features:', err);
      console.error('Error response:', err.response?.data);
      setError(t('admin.landingManagement.errors.loadFeatures'));
    } finally {
      setLoading(false);
    }
  };

  const saveFeatures = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Save all features (including defaults that have been customized)
      const enFeatures = features.map(f => ({
        id: f.id,
        title: f.en.title,
        description: f.en.description
      }));

      const esFeatures = features.map(f => ({
        id: f.id,
        title: f.es.title,
        description: f.es.description
      }));

      const settingsToUpdate = [
        {
          key: 'landing_features_en',
          value: JSON.stringify(enFeatures),
          type: 'json',
          category: 'landing',
          description: 'Landing page features in English',
          isPublic: true
        },
        {
          key: 'landing_features_es',
          value: JSON.stringify(esFeatures),
          type: 'json',
          category: 'landing',
          description: 'Landing page features in Spanish',
          isPublic: true
        }
      ];

      await api.put('/admin/settings', { settings: settingsToUpdate });

      setSuccess(t('admin.landingManagement.success.saved'));
    } catch (err: any) {
      console.error('Error saving features:', err);
      console.error('Error response:', err.response?.data);
      setError(t('admin.landingManagement.errors.saveFeatures'));
    } finally {
      setSaving(false);
    }
  };

  const updateFeature = (index: number, language: 'en' | 'es', field: 'title' | 'description', value: string) => {
    const newFeatures = [...features];
    newFeatures[index][language][field] = value;
    setFeatures(newFeatures);
  };

  const addFeature = () => {
    const newFeatures = [...features];
    const newId = Date.now().toString();
    newFeatures.push({
      id: newId,
      en: { title: '', description: '' },
      es: { title: '', description: '' }
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

  if (loading) {
    return (
      <div className="ui-card flex items-center justify-center h-64">
        <div className="text-lg text-slate-600">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('admin.landingManagement.title')}</h1>
          <p className="text-slate-600 dark:text-slate-300">{t('admin.landingManagement.subtitle')}</p>
        </div>
        <Button
          onClick={saveFeatures}
          disabled={saving}
          variant="primary"
        >
          {saving ? t('admin.landingManagement.saving') : t('admin.landingManagement.saveChanges')}
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

      {/* Features List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t('admin.landingManagement.featuresTitle')}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {t('admin.landingManagement.featuresSubtitle')}
            </p>
          </div>
          <Button
            onClick={addFeature}
            variant="outline"
            size="sm"
          >
            {t('admin.landingManagement.addFeature')}
          </Button>
        </div>

        {features.map((feature, index) => (
          <div key={feature.id} className="ui-surface p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('admin.landingManagement.featureLabel', { number: index + 1 })}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveFeature(index, Math.max(0, index - 1))}
                  disabled={index === 0}
                  aria-label={t('admin.landingManagement.moveUp', { defaultValue: `Move feature ${index + 1} up` })}
                  title={t('admin.landingManagement.moveUp', { defaultValue: `Move feature ${index + 1} up` })}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-50 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveFeature(index, Math.min(features.length - 1, index + 1))}
                  disabled={index === features.length - 1}
                  aria-label={t('admin.landingManagement.moveDown', { defaultValue: `Move feature ${index + 1} down` })}
                  title={t('admin.landingManagement.moveDown', { defaultValue: `Move feature ${index + 1} down` })}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-50 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeFeature(index)}
                  aria-label={t('admin.landingManagement.removeFeature', { defaultValue: `Remove feature ${index + 1}` })}
                  className="text-red-400 hover:text-red-600"
                >
                  {t('common.remove')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* English */}
              <div className="space-y-3">
                <h3 className="border-b border-slate-200 pb-1 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  {t('settings.english')}
                </h3>
                <Input
                  label={t('admin.landingManagement.titleLabel')}
                  value={feature.en.title}
                  onChange={(e) => updateFeature(index, 'en', 'title', e.target.value)}
                  placeholder={t('admin.landingManagement.placeholders.enTitle')}
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('admin.landingManagement.descriptionLabel')}
                  </label>
                  <textarea
                    value={feature.en.description}
                    onChange={(e) => updateFeature(index, 'en', 'description', e.target.value)}
                    placeholder={t('admin.landingManagement.placeholders.enDescription')}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Spanish */}
              <div className="space-y-3">
                <h3 className="border-b border-slate-200 pb-1 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  {t('settings.spanish')}
                </h3>
                <Input
                  label={t('admin.landingManagement.titleLabel')}
                  value={feature.es.title}
                  onChange={(e) => updateFeature(index, 'es', 'title', e.target.value)}
                  placeholder={t('admin.landingManagement.placeholders.esTitle')}
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('admin.landingManagement.descriptionLabel')}
                  </label>
                  <textarea
                    value={feature.es.description}
                    onChange={(e) => updateFeature(index, 'es', 'description', e.target.value)}
                    placeholder={t('admin.landingManagement.placeholders.esDescription')}
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
            {t('admin.landingManagement.empty')}
          </div>
        )}
      </div>
    </div>
  );
}