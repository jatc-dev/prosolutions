import React, { useEffect, useState, useRef } from 'react';
import { tx } from '../../../uiText';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { CertificateItem, ValidationErrors } from "../../../../../shared/types";
import {
  FormSection,
  FormField,
  InputField,
  TextareaField,
  DateField
} from "../FormSection";
import { getPrefixMatches } from "../utils/suggestions";

interface CertificatesSectionProps {
  data: CertificateItem[];
  onChange: (data: CertificateItem[]) => void;
  errors?: ValidationErrors;
  isLoading?: boolean;
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const EXPANDED_STORAGE_KEY = 'editor.expanded.certificates';

const CERTIFICATE_SUGGESTIONS = {
  es: [
    'AWS Certified Solutions Architect',
    'Google Cloud Professional Cloud Architect',
    'Microsoft Azure Solutions Architect',
    'Cisco CCNA',
    'Cisco CCNP',
    'CompTIA A+',
    'CompTIA Security+',
    'Project Management Professional (PMP)',
    'Certified Scrum Master (CSM)',
    'Prince2 Foundation',
    'ITIL Foundation',
    'TOEFL',
    'IELTS',
    'DELE',
    'Cambridge English Certificate',
    'Six Sigma Green Belt',
    'Six Sigma Black Belt',
    'Certified Information Systems Security Professional (CISSP)',
    'Certified Ethical Hacker (CEH)',
    'Certified Information Security Manager (CISM)',
  ],
  en: [
    'AWS Certified Solutions Architect',
    'Google Cloud Professional Cloud Architect',
    'Microsoft Azure Solutions Architect',
    'Cisco CCNA',
    'Cisco CCNP',
    'CompTIA A+',
    'CompTIA Security+',
    'Project Management Professional (PMP)',
    'Certified Scrum Master (CSM)',
    'Prince2 Foundation',
    'ITIL Foundation',
    'TOEFL',
    'IELTS',
    'DELE',
    'Cambridge English Certificate',
    'Six Sigma Green Belt',
    'Six Sigma Black Belt',
    'Certified Information Systems Security Professional (CISSP)',
    'Certified Ethical Hacker (CEH)',
    'Certified Information Security Manager (CISM)',
  ],
};

const ISSUING_ORGANIZATIONS = {
  es: [
    'Amazon Web Services (AWS)',
    'Google Cloud',
    'Microsoft',
    'Cisco Systems',
    'CompTIA',
    'PMI (Project Management Institute)',
    'Scrum Alliance',
    'Axelos',
    'PeopleCert',
    'ETS',
    'Instituto Cervantes',
    'Cambridge Assessment English',
    'EC-Council',
    'ISACA',
  ],
  en: [
    'Amazon Web Services (AWS)',
    'Google Cloud',
    'Microsoft',
    'Cisco Systems',
    'CompTIA',
    'PMI (Project Management Institute)',
    'Scrum Alliance',
    'Axelos',
    'PeopleCert',
    'ETS',
    'Instituto Cervantes',
    'Cambridge Assessment English',
    'EC-Council',
    'ISACA',
  ],
};

export const CertificatesSection: React.FC<CertificatesSectionProps> = ({
  data,
  onChange,
  errors = {},
  isLoading = false,
}) => {
  const { t, i18n } = useTranslation();
  const [newCertificate, setNewCertificate] = useState('');
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = sessionStorage.getItem(EXPANDED_STORAGE_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [stored];
    } catch {
      return [stored];
    }
  });
  const [draggedCertificateId, setDraggedCertificateId] = useState<string | null>(null);
  const [issuerDrafts, setIssuerDrafts] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locale = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
  const certificateSuggestions = CERTIFICATE_SUGGESTIONS[locale];
  const issuingOrganizations = ISSUING_ORGANIZATIONS[locale];

  useEffect(() => {
    setIssuerDrafts((prev) => {
      const next: Record<string, string> = {};
      data.forEach((item) => {
        const key = String(item.id ?? '');
        if (Object.prototype.hasOwnProperty.call(prev, key)) {
          next[key] = prev[key];
        } else {
          next[key] = typeof item.issuingOrganization === 'string' ? item.issuingOrganization : String(item.issuingOrganization ?? '');
        }
      });
      return next;
    });
  }, [data]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (expandedItems.length > 0) {
      sessionStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(expandedItems));
      return;
    }
    sessionStorage.removeItem(EXPANDED_STORAGE_KEY);
  }, [expandedItems]);

  const toggleExpandedItem = (id: string) => {
    setExpandedItems((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  };

  const addCertificate = (title: string) => {
    if (!title.trim()) return;

    const newCertificateItem: CertificateItem = {
      id: generateId(),
      title: title.trim(),
      issuingOrganization: '',
      issueDate: '',
      expiryDate: '',
      credentialId: '',
      verificationUrl: '',
      description: '',
      fileUrl: '',
      order: data.length,
    };

    onChange([...data, newCertificateItem]);
    setExpandedItems((prev) => (prev.includes(newCertificateItem.id) ? prev : [...prev, newCertificateItem.id]));
    setNewCertificate('');
  };

  const reorderCertificates = (sourceId: string, targetId: string) => {
    const ordered = [...data].sort((a, b) => a.order - b.order);
    const sourceIndex = ordered.findIndex((item) => item.id === sourceId);
    const targetIndex = ordered.findIndex((item) => item.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      return;
    }

    const reordered = [...ordered];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    onChange(
      reordered.map((item, index) => ({
        ...item,
        order: index,
      }))
    );
  };

  const handleDragStart = (certificateId: string, event: React.DragEvent<HTMLButtonElement>) => {
    setDraggedCertificateId(certificateId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', certificateId);
  };

  const handleDrop = (targetCertificateId: string, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceId = draggedCertificateId || event.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetCertificateId) {
      setDraggedCertificateId(null);
      return;
    }

    reorderCertificates(sourceId, targetCertificateId);
    setDraggedCertificateId(null);
  };

  const updateCertificate = (id: string, updates: Partial<CertificateItem>) => {
    const targetId = String(id ?? '');
    const updatedData = data.map(cert =>
      String((cert as CertificateItem).id ?? '') === targetId ? { ...cert, ...updates } : cert
    );
    onChange(updatedData);
  };

  const removeCertificate = (id: string) => {
    const filteredData = data.filter(cert => cert.id !== id);
    setExpandedItems((prev) => prev.filter((itemId) => itemId !== id));
    // Reorder remaining items
    const reorderedData = filteredData.map((cert, index) => ({
      ...cert,
      order: index,
    }));
    onChange(reorderedData);
  };

  const moveCertificate = (id: string, direction: 'up' | 'down') => {
    const currentIndex = data.findIndex(cert => cert.id === id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === data.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newData = [...data];

    // Swap positions
    [newData[currentIndex], newData[newIndex]] = [newData[newIndex], newData[currentIndex]];

    // Update order values
    const reorderedData = newData.map((cert, index) => ({
      ...cert,
      order: index,
    }));

    onChange(reorderedData);
  };

  const handleFileUpload = (certificateId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        alert(t('editor.certificates.alerts.invalidFileType'));
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(t('editor.certificates.alerts.fileTooLarge'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        updateCertificate(certificateId, { fileUrl: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = (certificateId: string) => {
    updateCertificate(certificateId, { fileUrl: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const threeMonths = new Date();
    threeMonths.setMonth(now.getMonth() + 3);
    return expiry <= threeMonths && expiry >= now;
  };

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const sortedData = [...data].sort((a, b) => a.order - b.order);
  const expandAllItems = () => setExpandedItems(sortedData.map((certificate) => certificate.id));
  const collapseAllItems = () => setExpandedItems([]);
  const allExpanded = sortedData.length > 0 && sortedData.every((certificate) => expandedItems.includes(certificate.id));
  const allCollapsed = expandedItems.length === 0;

  return (
    <FormSection
      title={t('editor.certificates.title')}
      description={t('editor.certificates.description')}
      errors={errors}
      isLoading={isLoading}
    >
      {/* Add new certificate */}
      <div className="bg-slate-50 rounded-lg p-6 space-y-4">
        <h4 className="text-sm font-medium text-slate-900">{t('editor.certificates.addNew')}</h4>

        <div className="relative">
          <FormField label={t('editor.certificates.fields.title')}>
            <InputField
              value={newCertificate}
              onChange={setNewCertificate}
              placeholder={t('editor.certificates.placeholders.title')}
              list="certificate-title-suggestions"
            />
            <datalist id="certificate-title-suggestions">
              {getPrefixMatches(certificateSuggestions, newCertificate, 8)
                .filter(
                  (cert) => !data.some((existing) => existing.title.toLowerCase() === cert.toLowerCase())
                )
                .map((cert) => (
                  <option key={cert} value={cert} />
                ))}
            </datalist>
          </FormField>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => addCertificate(newCertificate)}
            disabled={!newCertificate.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-700 hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('editor.certificates.addCertificate')}
          </button>
        </div>
      </div>

      {/* Certificates list */}
      {sortedData.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={expandAllItems}
            disabled={allExpanded}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('editor.common.expandAll', { defaultValue: 'Expandir todo' })}
          </button>
          <button
            type="button"
            onClick={collapseAllItems}
            disabled={allCollapsed}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('editor.common.collapseAll', { defaultValue: 'Colapsar todo' })}
          </button>
        </div>
      )}

      {sortedData.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-900">{t('editor.certificates.emptyTitle')}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {t('editor.certificates.emptyDescription')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedData.map((certificate, index) => (
            <div
              key={certificate.id}
              className={`bg-white border rounded-lg shadow-sm overflow-hidden transition-colors ${draggedCertificateId === certificate.id ? 'border-brand-300 bg-brand-50/30' : 'border-slate-200'}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(certificate.id, event)}
            >
              {/* Header */}
              <div
                className="px-6 py-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => toggleExpandedItem(certificate.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      draggable
                      onClick={(event) => event.stopPropagation()}
                      onDragStart={(event) => handleDragStart(certificate.id, event)}
                      onDragEnd={() => setDraggedCertificateId(null)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                      title={t('editor.certificates.reorderHint', { defaultValue: 'Arrastra para reordenar' })}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </button>

                    {/* Certificate icon and title */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                    </div>

                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-slate-900">{certificate.title}</h4><label className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><input type="checkbox" checked={certificate.isVisible !== false} onChange={(event) => updateCertificate(certificate.id, { isVisible: event.target.checked })} />{tx('editor.ui.showInCv', 'Mostrar en el CV')}</label>
                      <p className="text-sm text-slate-600">
                        {certificate.issuingOrganization}
                        {certificate.issueDate && ` • ${t('editor.certificates.issuedOn')}: ${new Date(certificate.issueDate).toLocaleDateString()}`}
                      </p>

                      {/* Status badges */}
                      <div className="flex items-center space-x-2 mt-1">
                        {certificate.expiryDate && isExpired(certificate.expiryDate) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            {t('editor.certificates.expired')}
                          </span>
                        )}
                        {certificate.expiryDate && isExpiringSoon(certificate.expiryDate) && !isExpired(certificate.expiryDate) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            {t('editor.certificates.expiresSoon')}
                          </span>
                        )}
                        {certificate.verificationUrl && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            {t('editor.certificates.verifiable')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Move up/down buttons */}
                    <div className="flex flex-col space-y-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          moveCertificate(certificate.id, 'up');
                        }}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          moveCertificate(certificate.id, 'down');
                        }}
                        disabled={index === sortedData.length - 1}
                        className="text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleExpandedItem(certificate.id);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <svg
                        className={`w-5 h-5 transition-transform ${expandedItems.includes(certificate.id) ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeCertificate(certificate.id);
                      }}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Certificate details */}
              {expandedItems.includes(certificate.id) && (
              <div className="editor-item-scroll px-6 py-6 space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <FormField
                    label={t('editor.certificates.fields.issuer')}
                    required
                    error={errors[`certificate.${certificate.id}.issuingOrganization`]?.[0]}
                  >
                    <>
                      <InputField
                        value={issuerDrafts[String(certificate.id ?? '')] ?? (typeof certificate.issuingOrganization === 'string' ? certificate.issuingOrganization : String(certificate.issuingOrganization ?? ''))}
                        onChange={(value) => {
                          const key = String(certificate.id ?? '');
                          setIssuerDrafts((prev) => ({ ...prev, [key]: value }));
                          updateCertificate(certificate.id, { issuingOrganization: value });
                        }}
                        onBlur={() => {
                          const key = String(certificate.id ?? '');
                          updateCertificate(certificate.id, { issuingOrganization: issuerDrafts[key] ?? '' });
                          toast.success(
                            locale === 'es'
                              ? 'Organizacion emisora actualizada. Se guardara automaticamente.'
                              : 'Issuing organization updated. It will be auto-saved.'
                          );
                        }}
                        placeholder={t('editor.certificates.placeholders.issuer')}
                        list={`certificate-issuer-${certificate.id}`}
                        required
                      />
                      <datalist id={`certificate-issuer-${certificate.id}`}>
                        {getPrefixMatches(issuingOrganizations, certificate.issuingOrganization, 8).map((org) => (
                          <option key={org} value={org} />
                        ))}
                      </datalist>
                    </>
                  </FormField>

                  <FormField
                    label={t('editor.certificates.fields.credentialId')}
                    error={errors[`certificate.${certificate.id}.credentialId`]?.[0]}
                    help={t('editor.certificates.help.credentialId')}
                  >
                    <InputField
                      value={certificate.credentialId || ''}
                      onChange={(value) => updateCertificate(certificate.id, { credentialId: value })}
                      placeholder={t('editor.certificates.placeholders.credentialId')}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <FormField
                    label={t('editor.certificates.fields.issueDate')}
                    required
                    error={errors[`certificate.${certificate.id}.issueDate`]?.[0]}
                  >
                    <DateField
                      value={certificate.issueDate}
                      onChange={(value) => updateCertificate(certificate.id, { issueDate: value })}
                      required
                    />
                  </FormField>

                  <FormField
                    label={t('editor.certificates.fields.expiryDate')}
                    error={errors[`certificate.${certificate.id}.expiryDate`]?.[0]}
                    help={t('editor.certificates.help.expiryDate')}
                  >
                    <DateField
                      value={certificate.expiryDate || ''}
                      onChange={(value) => updateCertificate(certificate.id, { expiryDate: value })}
                    />
                  </FormField>
                </div>

                <FormField
                  label={t('editor.certificates.fields.verificationUrl')}
                  error={errors[`certificate.${certificate.id}.verificationUrl`]?.[0]}
                  help={t('editor.certificates.help.verificationUrl')}
                >
                  <InputField
                    type="url"
                    value={certificate.verificationUrl || ''}
                    onChange={(value) => updateCertificate(certificate.id, { verificationUrl: value })}
                    placeholder={t('editor.certificates.placeholders.verificationUrl')}
                  />
                </FormField>

                {/* File upload */}
                <FormField
                  label={t('editor.certificates.fields.file')}
                  error={errors[`certificate.${certificate.id}.fileUrl`]?.[0]}
                  help={t('editor.certificates.help.file')}
                >
                  <div className="flex items-center space-x-4">
                    {certificate.fileUrl ? (
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-green-600">{t('editor.certificates.fileUploaded')}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(certificate.id)}
                          className="text-red-500 hover:text-red-700 text-sm underline"
                        >
                          {t('editor.certificates.removeFile')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => handleFileUpload(certificate.id, e)}
                          className="hidden"
                          id={`certificate-file-${certificate.id}`}
                        />
                        <label
                          htmlFor={`certificate-file-${certificate.id}`}
                          className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          {t('editor.certificates.uploadFile')}
                        </label>
                      </div>
                    )}
                  </div>
                </FormField>

                <FormField
                  label={t('editor.certificates.fields.description')}
                  error={errors[`certificate.${certificate.id}.description`]?.[0]}
                  help={t('editor.certificates.help.description')}
                >
                  <TextareaField
                    value={certificate.description || ''}
                    onChange={(value) => updateCertificate(certificate.id, { description: value })}
                    placeholder={t('editor.certificates.placeholders.description')}
                    rows={3}
                  />
                </FormField>
              </div>
              )}
            </div>
          ))}

        </div>
      )}
    </FormSection>
  );
};