import React from 'react';
import { ValidationErrors, SectionType } from "../../../../../shared/types";

interface ValidationSummaryProps {
  errors: ValidationErrors;
  section: SectionType;
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  errors,
  section,
}) => {
  // Filter errors for current section
  const sectionErrors = Object.entries(errors).filter(([key, error]) =>
    (key.startsWith(`${section}.`) || key.startsWith(`${section}[`)) &&
    (Array.isArray(error) ? error.some((message) => Boolean(message?.trim())) : Boolean(error))
  );

  if (sectionErrors.length === 0) {
    return null;
  }

  const getErrorMessage = (field: string) => {
    const error = errors[field];
    if (Array.isArray(error)) {
      return error.find((message) => Boolean(message?.trim()));
    }
    return error;
  };

  const formatFieldName = (field: string) => {
    // Remove section prefix
    const fieldPath = field.replace(`${section}.`, '').replace(`${section}[`, '');

    // Convert camelCase and array notation to readable text
    return fieldPath
      .replace(/([A-Z])/g, ' $1')
      .replace(/\[\d+\]/g, '')
      .replace(/\./g, ' → ')
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h4 className="text-sm font-medium text-red-900">
            Errores de validación
          </h4>
        </div>
        <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
          {sectionErrors.length} error{sectionErrors.length !== 1 ? 'es' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {sectionErrors.map(([field, error]) => (
          <div key={field} className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-1.5 h-1.5 bg-red-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="text-sm text-red-800">
                <span className="font-medium">{formatFieldName(field)}:</span>{' '}
                {getErrorMessage(field)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-red-700">
        Corrige estos errores antes de guardar o cambiar de sección.
      </div>
    </div>
  );
};