import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { LinkItem, LinkType, ValidationErrors } from "../../../../../shared/types";
import {
  FormSection,
  FormField,
  FormActions,
  InputField
} from "../FormSection";

interface LinksSectionProps {
  data: LinkItem[];
  onChange: (data: LinkItem[]) => void;
  errors?: ValidationErrors;
  isLoading?: boolean;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const getIconSvg = (iconName: string) => {
  const icons: Record<string, string> = {
    linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
    github: 'M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z',
    globe: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.717-.962 1.228-1.682 1.048-.724-.18-1.228-.962-1.048-1.682.18-.717.962-1.228 1.682-1.048.724.18 1.228.962 1.048 1.682zm-5.562 1.839c-1.439 0-2.609-1.17-2.609-2.609s1.17-2.609 2.609-2.609 2.609 1.17 2.609 2.609-1.17 2.609-2.609 2.609zm5.616-4.45c-.717.18-1.499-.331-1.682-1.048-.18-.717.331-1.499 1.048-1.682.717-.18 1.499.331 1.682 1.048.18.717-.331 1.499-1.048 1.682z',
    twitter: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z',
    'external-link': 'M18.25 15.5a.75.75 0 00.75-.75V8.06l-6.22 6.22a.75.75 0 101.06 1.06L20 8.81V14.75a.75.75 0 00.75.75z M20.24 5.79l-4.95-4.95a.75.75 0 00-.53-.22H8.75A2.75 2.75 0 006 3.25v11.5A2.75 2.75 0 008.75 17h11.5a2.75 2.75 0 002.75-2.75V9.56a.75.75 0 00-.22-.53z',
  };

  return icons[iconName] || icons.globe;
};

export const LinksSection: React.FC<LinksSectionProps> = ({
  data,
  onChange,
  errors = {},
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<LinkType>('portfolio');
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const linkTypeOptions: { value: LinkType; label: string; icon: string; placeholder: string }[] = [
    { value: 'linkedin', label: 'LinkedIn', icon: 'linkedin', placeholder: t('editor.links.placeholders.linkedin') },
    { value: 'github', label: 'GitHub', icon: 'github', placeholder: t('editor.links.placeholders.github') },
    { value: 'portfolio', label: t('editor.links.types.portfolio'), icon: 'globe', placeholder: t('editor.links.placeholders.portfolio') },
    { value: 'website', label: t('editor.links.types.website'), icon: 'globe', placeholder: t('editor.links.placeholders.website') },
    { value: 'twitter', label: 'Twitter', icon: 'twitter', placeholder: t('editor.links.placeholders.twitter') },
    { value: 'other', label: t('editor.links.types.other'), icon: 'external-link', placeholder: t('editor.links.placeholders.other') },
  ];

  const addLink = () => {
    if (!newLabel.trim() || !newUrl.trim()) return;

    // Basic URL validation
    try {
      new URL(newUrl);
    } catch {
      toast.error(t('editor.links.alerts.invalidUrl'));
      return;
    }

    // Check if URL already exists
    if (data.some(link => link.url.toLowerCase() === newUrl.toLowerCase())) {
      toast.error(t('editor.links.alerts.duplicateUrl'));
      return;
    }

    const newLink: LinkItem = {
      id: generateId(),
      label: newLabel.trim(),
      url: newUrl.trim(),
      type: selectedType,
      isVisible: true,
      order: data.length,
    };

    onChange([...data, newLink]);
    setNewLabel('');
    setNewUrl('');
  };

  const updateLink = (id: string, updates: Partial<LinkItem>) => {
    const updatedData = data.map(link =>
      link.id === id ? { ...link, ...updates } : link
    );
    onChange(updatedData);
  };

  const removeLink = (id: string) => {
    const filteredData = data.filter(link => link.id !== id);
    // Reorder remaining items
    const reorderedData = filteredData.map((link, index) => ({
      ...link,
      order: index,
    }));
    onChange(reorderedData);
  };

  const moveLink = (id: string, direction: 'up' | 'down') => {
    const currentIndex = data.findIndex(link => link.id === id);
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
    const reorderedData = newData.map((link, index) => ({
      ...link,
      order: index,
    }));

    onChange(reorderedData);
  };

  const detectLinkType = (url: string): LinkType => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('linkedin.com')) return 'linkedin';
    if (lowerUrl.includes('github.com')) return 'github';
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'twitter';
    if (lowerUrl.includes('portfolio') || lowerUrl.includes('cv') || lowerUrl.includes('resume')) return 'portfolio';
    return 'website';
  };

  const handleUrlChange = (url: string) => {
    setNewUrl(url);
    // Auto-detect link type based on URL
    const detectedType = detectLinkType(url);
    if (detectedType !== selectedType) {
      setSelectedType(detectedType);
    }
  };

  const sortedData = [...data].sort((a, b) => a.order - b.order);

  return (
    <FormSection
      title={t('editor.links.title')}
      description={t('editor.links.description')}
      errors={errors}
      isLoading={isLoading}
    >
      {/* Add new link */}
      <div className="bg-slate-50 rounded-lg p-6 space-y-4">
        <h4 className="text-sm font-medium text-slate-900">{t('editor.links.addNew')}</h4>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label={t('editor.links.fields.type')}>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as LinkType)}
              className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-600 focus:border-brand-600 sm:text-sm"
            >
              {linkTypeOptions.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t('editor.links.fields.label')}>
            <InputField
              value={newLabel}
              onChange={setNewLabel}
              placeholder={t('editor.links.placeholders.label')}
            />
          </FormField>

          <FormField label={t('editor.links.fields.url')}>
            <InputField
              type="url"
              value={newUrl}
              onChange={handleUrlChange}
              placeholder={linkTypeOptions.find(t => t.value === selectedType)?.placeholder}
            />
          </FormField>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={addLink}
            disabled={!newLabel.trim() || !newUrl.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-700 hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('editor.links.addLink')}
          </button>
        </div>
      </div>

      {/* Links list */}
      {sortedData.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-900">{t('editor.links.emptyTitle')}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {t('editor.links.emptyDescription')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedData.map((link, index) => {
            const linkTypeInfo = linkTypeOptions.find(t => t.value === link.type);

            return (
              <div
                key={link.id}
                className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-slate-600"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d={getIconSvg(linkTypeInfo?.icon || 'globe')} />
                        </svg>
                      </div>
                    </div>

                    {/* Link details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-slate-900">{link.label}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          link.isVisible
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {link.isVisible ? t('editor.links.visible') : t('editor.links.hidden')}
                        </span>
                      </div>

                      <p className="text-sm text-brand-700 hover:text-brand-900 mt-1">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate block"
                        >
                          {link.url}
                        </a>
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        {t('editor.links.typePrefix')}: {linkTypeInfo?.label}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    {/* Visibility toggle */}
                    <button
                      type="button"
                      onClick={() => updateLink(link.id, { isVisible: !link.isVisible })}
                      className={`p-1 rounded ${
                        link.isVisible
                          ? 'text-green-600 hover:text-green-800'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title={link.isVisible ? t('editor.actions.hide') : t('editor.actions.show')}
                    >
                      {link.isVisible ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      )}
                    </button>

                    {/* Move up/down buttons */}
                    <div className="flex flex-col space-y-1">
                      <button
                        type="button"
                        onClick={() => moveLink(link.id, 'up')}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed p-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLink(link.id, 'down')}
                        disabled={index === sortedData.length - 1}
                        className="text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed p-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => removeLink(link.id)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FormActions />
    </FormSection>
  );
};
