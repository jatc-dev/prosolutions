import React, { ReactNode, useEffect, useState } from 'react';
import { tx } from '../../uiText';
import { useTranslation } from 'react-i18next';
import { ValidationErrors } from "../../../../shared/types";

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  errors?: ValidationErrors;
  isLoading?: boolean;
  className?: string;
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: ReactNode;
  className?: string;
}

interface FormActionsProps {
  onSave?: () => void;
  onCancel?: () => void;
  onAdd?: () => void;
  isLoading?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  addLabel?: string;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  errors = {},
  isLoading = false,
  className = '',
}) => {
  const { t } = useTranslation();
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 dark:border-slate-700">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
        )}
        {hasErrors && (
          <div className="mt-2 text-sm text-red-600">
            {t('editor.common.validationErrors')}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`space-y-6 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        {children}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white bg-opacity-75 dark:bg-slate-900/75">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-700"></div>
            <span className="text-sm text-slate-600 dark:text-slate-300">{t('common.saving')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  help,
  children,
  className = '',
}) => {
  const { t } = useTranslation();
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {children}
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {help && !error && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{help}</p>
      )}
    </div>
  );
};

export const FormActions: React.FC<FormActionsProps> = ({
  onSave,
  onCancel,
  onAdd,
  isLoading = false,
  saveLabel,
  cancelLabel,
  addLabel,
  className = '',
}) => {
  const { t } = useTranslation();
  const effectiveSaveLabel = saveLabel || t('editor.common.saveChanges');
  const effectiveCancelLabel = cancelLabel || t('common.cancel');
  const effectiveAddLabel = addLabel || t('common.add');

  return (
    <div className={`flex justify-between items-center pt-6 border-t border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="flex space-x-3">
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={isLoading}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {effectiveAddLabel}
          </button>
        )}
      </div>

      <div className="flex space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={isLoading}
          >
            {effectiveCancelLabel}
          </button>
        )}
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-800 hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {effectiveSaveLabel}
          </button>
        )}
      </div>
    </div>
  );
};

// Specialized Form Components

interface InputFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'url' | 'tel' | 'password';
  list?: string;
  disabled?: boolean;
  required?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  list,
  disabled = false,
  required = false,
}) => {
  return (
    <input
      type={type}
      list={list}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className="block w-full rounded-md border border-brand-300 bg-white px-3 py-2 shadow-sm placeholder-slate-400 focus:border-brand-700 focus:outline-none focus:ring-brand-700 sm:text-sm disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
    />
  );
};

interface TextareaFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({
  value,
  onChange,
  placeholder,
  rows = 4,
  disabled = false,
  required = false,
}) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      required={required}
      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 shadow-sm placeholder-slate-400 focus:border-brand-600 focus:outline-none focus:ring-brand-600 sm:text-sm disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
    />
  );
};

interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  required = false,
}) => {
  const { t } = useTranslation();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-brand-600 focus:outline-none focus:ring-brand-600 sm:text-sm disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
    >
      <option value="">{placeholder || t('editor.common.select')}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  allowPartial?: boolean;
}

// Helper function to format date for HTML date input (YYYY-MM-DD)
const formatDateForInput = (dateString: string): string => {
  if (!dateString) return '';

  const raw = String(dateString).trim();
  if (!raw) return '';

  // Preserve exact, month-only, and year-only values.
  if (/^\d{4}$/.test(raw) || /^\d{4}-\d{2}$/.test(raw)) return raw;

  // Accept canonical date input value directly.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // Accept ISO timestamps by extracting the date portion.
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoMatch) {
    return isoMatch[1];
  }

  // Support common dd/mm/yyyy persisted values.
  const slashDateMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashDateMatch) {
    const [, day, month, year] = slashDateMatch;
    return `${year}-${month}-${day}`;
  }

  // Last resort parser for legacy data formats.
  const parsedTime = Date.parse(raw);
  if (!Number.isNaN(parsedTime)) {
    const parsedDate = new Date(parsedTime);
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
};

export const DateField: React.FC<DateFieldProps> = ({ value, onChange, disabled = false, required = false, allowPartial = false }) => {
  const normalizedExternalValue = formatDateForInput(value);
  const getPrecision = (raw: string): 'day' | 'month' | 'year' => /^\d{4}$/.test(raw) ? 'year' : /^\d{4}-\d{2}$/.test(raw) ? 'month' : 'day';
  const [inputValue, setInputValue] = useState<string>(normalizedExternalValue);
  const [precision, setPrecision] = useState<'day' | 'month' | 'year'>(getPrecision(normalizedExternalValue));
  useEffect(() => { setInputValue(normalizedExternalValue); setPrecision(getPrecision(normalizedExternalValue)); }, [normalizedExternalValue]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { const selectedValue = e.target.value; setInputValue(selectedValue); onChange(selectedValue); };
  const handlePrecisionChange = (next: 'day' | 'month' | 'year') => {
    setPrecision(next);
    if (next === 'year') { const year = inputValue.match(/^\d{4}/)?.[0] || ''; setInputValue(year); onChange(year); }
    else if (next === 'month') { const monthValue = /^\d{4}-\d{2}/.test(inputValue) ? inputValue.slice(0, 7) : ''; setInputValue(monthValue); onChange(monthValue); }
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(inputValue)) { setInputValue(''); onChange(''); }
  };
  const inputType = !allowPartial || precision === 'day' ? 'date' : precision === 'month' ? 'month' : 'number';
  return <div className="space-y-2">{allowPartial ? <select aria-label={tx('editor.ui.datePrecision', 'Precisión de fecha')} value={precision} onChange={(event) => handlePrecisionChange(event.target.value as 'day' | 'month' | 'year')} disabled={disabled} className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"><option value="day">{tx('editor.ui.dateDay', 'Día, mes y año')}</option><option value="month">{tx('editor.ui.dateMonth', 'Mes y año')}</option><option value="year">{tx('editor.ui.dateYear', 'Solo año')}</option></select> : null}<input type={inputType} value={inputValue} min={inputType === 'number' ? 1900 : undefined} max={inputType === 'number' ? 2100 : undefined} step={inputType === 'number' ? 1 : undefined} onChange={handleChange} disabled={disabled} required={required} placeholder={inputType === 'number' ? 'AAAA' : undefined} className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-brand-600 focus:outline-none focus:ring-brand-600 sm:text-sm disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-500" /></div>;
};