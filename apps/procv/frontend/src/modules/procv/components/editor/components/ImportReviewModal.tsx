import React from 'react';
import { useTranslation } from 'react-i18next';
import { ParsedCvDraft } from "../../../../../shared/services/cvImport";

interface ImportReviewModalProps {
  isOpen: boolean;
  fileName: string;
  parsedData: ParsedCvDraft | null;
  onCancel: () => void;
  onApply: () => void;
}

const getSafeCount = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

export const ImportReviewModal: React.FC<ImportReviewModalProps> = ({
  isOpen,
  fileName,
  parsedData,
  onCancel,
  onApply,
}) => {
  const { t } = useTranslation();

  if (!isOpen || !parsedData) {
    return null;
  }

  const personal = parsedData.personal || {};
  const detectedFields = [
    personal.fullName,
    personal.professionalTitle,
    personal.summary,
    personal.website,
    personal.linkedin,
    personal.github,
  ].filter(Boolean).length + getSafeCount(personal.emails) + getSafeCount(personal.phones);

  const sectionCounts = [
    { key: 'experience', count: getSafeCount(parsedData.experience) },
    { key: 'education', count: getSafeCount(parsedData.education) },
    { key: 'skills', count: getSafeCount(parsedData.skills) },
    { key: 'languages', count: getSafeCount(parsedData.languages) },
    { key: 'certificates', count: getSafeCount(parsedData.certificates) },
    { key: 'links', count: getSafeCount(parsedData.links) },
  ];

  const totalDetected = detectedFields + sectionCounts.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('editor.importer.reviewTitle')}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('editor.importer.reviewDescription')}</p>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <span className="font-semibold">{t('editor.importer.fileLabel')}:</span> {fileName}
          </div>

          {totalDetected === 0 ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t('editor.importer.nothingDetected')}
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('editor.tabs.personal')}</h4>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {t('editor.importer.itemsDetected', { count: detectedFields })}
                </p>
                {personal.fullName && <p className="mt-2 text-sm text-slate-800 dark:text-slate-100">{personal.fullName}</p>}
                {personal.professionalTitle && <p className="text-sm text-slate-700 dark:text-slate-300">{personal.professionalTitle}</p>}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sectionCounts.map((section) => (
                  <div key={section.key} className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t(`editor.tabs.${section.key}`)}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('editor.importer.itemsDetected', { count: section.count })}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t('editor.importer.cancel')}
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={totalDetected === 0}
            className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {t('editor.importer.apply')}
          </button>
        </div>
      </div>
    </div>
  );
};