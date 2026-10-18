import React from 'react';
import { useTranslation } from 'react-i18next';
import { ProHeader } from '@prosolutions/ui';
import { useParams } from 'react-router-dom';
import { CompleteCVEditor } from '../components/editor/CompleteCVEditor';

export function CVEditorPage() {
  const { cvId } = useParams<{ cvId: string }>();
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];

  return (
    <div className="ui-page min-h-screen bg-gradient-to-br from-brand-50 to-blue-50">
      <ProHeader activeApp="procv" locale={language === "es" ? "es" : "en"} onLocaleChange={() => i18n.changeLanguage(language === "es" ? "en" : "es")} />
      <CompleteCVEditor cvId={cvId} />
    </div>
  );
}