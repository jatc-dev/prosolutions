import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { publicApi } from "../services/api";

export interface LandingFeature {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export function useLandingFeatures() {
  const { t, i18n } = useTranslation();
  const [features, setFeatures] = useState<LandingFeature[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(true);
  const [featuresError, setFeaturesError] = useState<string | null>(null);
  const featuresRequestRef = useRef(0);

  const loadFeatures = useCallback(async () => {
    const requestId = ++featuresRequestRef.current;

    try {
      setFeaturesLoading(true);
      setFeaturesError(null);
      const currentLang = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
      const response = await publicApi.get(`/public/landing-features?lang=${currentLang}`);
      if (requestId !== featuresRequestRef.current) return;
      setFeatures(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      if (requestId !== featuresRequestRef.current) return;
      console.error("Error loading landing features:", err);
      setFeatures([]);
      setFeaturesError(t("landing.featuresLoadError"));
    } finally {
      if (requestId === featuresRequestRef.current) {
        setFeaturesLoading(false);
      }
    }
  }, [i18n.language, i18n.resolvedLanguage, t]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  return {
    features,
    featuresLoading,
    featuresError,
    reloadFeatures: loadFeatures,
  };
}
