import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ParsedCvDraft } from "../../../../../shared/services/cvImport";

interface ImportReviewModalProps {
  isOpen: boolean;
  fileName: string;
  parsedData: ParsedCvDraft | null;
  onCancel: () => void;
  onApply: (parsedData: ParsedCvDraft) => void;
}

const getSafeCount = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

type ReviewSection = 'experience' | 'education' | 'certificates';

function isComplete(section: ReviewSection, item: Record<string, unknown>): boolean {
  if (section === 'experience') {
    return Boolean(item.position && item.company && item.startDate)
      && String(item.description || '').trim().length >= 10;
  }
  if (section === 'education') {
    return Boolean(item.degree && item.institution && item.startDate);
  }
  return Boolean(item.title && String(item.issuingOrganization || '').trim().length >= 2);
}

export const ImportReviewModal: React.FC<ImportReviewModalProps> = ({
  isOpen,
  fileName,
  parsedData,
  onCancel,
  onApply,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ParsedCvDraft>(() => parsedData || {});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const reviewSections = useMemo(() => ({
    experience: (draft.experience || []) as Array<Record<string, unknown>>,
    education: (draft.education || []) as Array<Record<string, unknown>>,
    certificates: (draft.certificates || []) as Array<Record<string, unknown>>,
  }), [draft]);
  useEffect(() => {
    if (parsedData) {
      setDraft(parsedData);
      setExcluded(new Set());
    }
  }, [parsedData]);

  if (!isOpen || !parsedData) {
    return null;
  }

  const personal = draft.personal || {};
  const incompleteItems = Object.entries(reviewSections).flatMap(([section, items]) =>
    items.map((item, index) => ({
      key: `${section}-${index}`,
      section: section as ReviewSection,
      index,
      complete: isComplete(section as ReviewSection, item),
    })),
  ).filter((item) => !item.complete && !excluded.has(item.key));
  const updateItem = (section: ReviewSection, index: number, field: string, value: string) => {
    setDraft((current) => ({
      ...current,
      [section]: (current[section] || []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };
  const toggleExcluded = (key: string) => {
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const applyDraft = () => {
    const filtered = Object.fromEntries(
      Object.entries(draft).map(([key, value]) => {
        if (!['experience', 'education', 'certificates'].includes(key) || !Array.isArray(value)) {
          return [key, value];
        }
        return [key, value.filter((_item, index) => !excluded.has(`${key}-${index}`))];
      }),
    ) as ParsedCvDraft;
    onApply(filtered);
  };
  const sectionCounts = [
    { key: 'experience' as const, count: getSafeCount(draft.experience) },
    { key: 'education' as const, count: getSafeCount(draft.education) },
    { key: 'skills' as const, count: getSafeCount(draft.skills) },
    { key: 'languages' as const, count: getSafeCount(draft.languages) },
    { key: 'certificates' as const, count: getSafeCount(draft.certificates) },
    { key: 'links' as const, count: getSafeCount(draft.links) },
  ];
  const detectedFields = [
    personal.fullName,
    personal.professionalTitle,
    personal.summary,
    personal.website,
    personal.linkedin,
    personal.github,
  ].filter(Boolean).length + getSafeCount(personal.emails) + getSafeCount(personal.phones);

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
              <div className="space-y-3">
                {(['experience', 'education', 'certificates'] as ReviewSection[]).map((section) =>
                  reviewSections[section].map((item, index) => {
                    const key = `${section}-${index}`;
                    const complete = isComplete(section, item);
                    const isExcluded = excluded.has(key);
                    return (
                      <div key={key} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                              {t(`editor.tabs.${section}`)} {index + 1}
                            </h4>
                            <p className={`mt-1 text-sm ${isExcluded ? 'text-slate-500' : complete ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {isExcluded ? 'Se excluirá de la importación.' : complete ? 'Completo: se incorporará al editor.' : 'Necesita revisión antes de aplicar.'}
                            </p>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <input type="checkbox" checked={isExcluded} onChange={() => toggleExcluded(key)} />
                            Excluir
                          </label>
                        </div>
                        {!isExcluded && (
                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {section === 'experience' && (
                              <>
                                <input className="rounded border p-2" value={String(item.position || '')} placeholder="Cargo" onChange={(event) => updateItem(section, index, 'position', event.target.value)} />
                                <input className="rounded border p-2" value={String(item.company || '')} placeholder="Empresa" onChange={(event) => updateItem(section, index, 'company', event.target.value)} />
                                <input className="rounded border p-2" value={String(item.startDate || '')} placeholder="Fecha de inicio" onChange={(event) => updateItem(section, index, 'startDate', event.target.value)} />
                                <textarea className="rounded border p-2 sm:col-span-2" value={String(item.description || '')} placeholder="Descripción (mínimo 10 caracteres)" onChange={(event) => updateItem(section, index, 'description', event.target.value)} />
                              </>
                            )}
                            {section === 'education' && (
                              <>
                                <input className="rounded border p-2" value={String(item.degree || '')} placeholder="Título" onChange={(event) => updateItem(section, index, 'degree', event.target.value)} />
                                <input className="rounded border p-2" value={String(item.institution || '')} placeholder="Institución" onChange={(event) => updateItem(section, index, 'institution', event.target.value)} />
                                <input className="rounded border p-2" value={String(item.startDate || '')} placeholder="Fecha de inicio" onChange={(event) => updateItem(section, index, 'startDate', event.target.value)} />
                              </>
                            )}
                            {section === 'certificates' && (
                              <>
                                <input className="rounded border p-2" value={String(item.title || '')} placeholder="Certificación" onChange={(event) => updateItem(section, index, 'title', event.target.value)} />
                                <input className="rounded border p-2" value={String(item.issuingOrganization || '')} placeholder="Organización emisora" onChange={(event) => updateItem(section, index, 'issuingOrganization', event.target.value)} />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }),
                )}
              </div>
              {incompleteItems.length > 0 && (
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Completa los registros pendientes o márcalos explícitamente para excluirlos.
                </p>
              )}
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
            onClick={applyDraft}
            disabled={totalDetected === 0 || incompleteItems.length > 0}
            className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {t('editor.importer.apply')}
          </button>
        </div>
      </div>
    </div>
  );
};