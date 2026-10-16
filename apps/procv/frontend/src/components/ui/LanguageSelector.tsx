import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@prosolutions/ui';

export const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('common.language')}</span>
      <div className="flex gap-1">
        <Button
          variant={i18n.language === 'en' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => changeLanguage('en')}
          className="min-w-10 px-2 text-xs"
        >
          EN
        </Button>
        <Button
          variant={i18n.language === 'es' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => changeLanguage('es')}
          className="min-w-10 px-2 text-xs"
        >
          ES
        </Button>
      </div>
    </div>
  );
};