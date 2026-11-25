import React from 'react';
import { tx } from '../../../uiText';

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  isSaving,
  lastSaved,
  hasUnsavedChanges,
}) => {
  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return tx('editor.ui.savedSeconds', 'Guardado hace unos segundos');
    if (minutes === 1) return tx('editor.ui.savedMinute', 'Guardado hace 1 minuto');
    if (minutes < 60) return tx('editor.ui.savedMinutes', 'Guardado hace {{count}} minutos', { count: minutes });

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return tx('editor.ui.savedHour', 'Guardado hace 1 hora');
    return tx('editor.ui.savedHours', 'Guardado hace {{count}} horas', { count: hours });
  };

  if (isSaving) {
    return (
      <div className="flex items-center space-x-2 text-brand-700">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-700"></div>
        <span className="text-sm">{tx('editor.ui.saving', 'Guardando...')}</span>
      </div>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <div className="flex items-center space-x-2 text-orange-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="text-sm">{tx('editor.ui.unsaved', 'Cambios sin guardar')}</span>
      </div>
    );
  }

  if (lastSaved) {
    const saved = lastSaved instanceof Date ? lastSaved : new Date(lastSaved);
    if (Number.isNaN(saved.getTime())) return null;
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm">{formatLastSaved(saved)}</span>
      </div>
    );
  }

  return null;
};