import React from 'react';

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

    if (minutes < 1) return 'Guardado hace unos segundos';
    if (minutes === 1) return 'Guardado hace 1 minuto';
    if (minutes < 60) return `Guardado hace ${minutes} minutos`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return 'Guardado hace 1 hora';
    return `Guardado hace ${hours} horas`;
  };

  if (isSaving) {
    return (
      <div className="flex items-center space-x-2 text-blue-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm">Guardando...</span>
      </div>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <div className="flex items-center space-x-2 text-orange-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="text-sm">Cambios sin guardar</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm">{formatLastSaved(lastSaved)}</span>
      </div>
    );
  }

  return null;
};