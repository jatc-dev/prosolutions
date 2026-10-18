import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CountrySelect } from "../../../../../components/ui/CountrySelect";
import toast from 'react-hot-toast';
import { PersonalData, ContactItem, PhoneItem, ProfileImageStyle, ValidationErrors } from "../../../../../shared/types";
import {
  FormSection,
  FormField,
  InputField,
  TextareaField
} from "../FormSection";

interface PersonalSectionProps {
  data: PersonalData;
  onChange: (data: PersonalData) => void;
  errors?: ValidationErrors;
  isLoading?: boolean;
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const CUSTOM_LABEL_VALUE = '__custom__';
const COMBINED_VALUE_SEPARATOR = '__::__';

const resolveLabelSelection = (label: string | undefined, options: string[]) => {
  const normalized = (label || '').trim();
  if (!normalized) {
    return CUSTOM_LABEL_VALUE;
  }
  return options.includes(normalized) ? normalized : CUSTOM_LABEL_VALUE;
};

const defaultLabelForType = (labelsByType: Record<string, string[]>, type: string) => {
  const options = labelsByType[type] || [];
  return options[0] || '';
};

const createCombinedValue = (type: string, label: string) => `${type}${COMBINED_VALUE_SEPARATOR}${label}`;

const parseCombinedValue = (value: string) => {
  const separatorIndex = value.indexOf(COMBINED_VALUE_SEPARATOR);
  if (separatorIndex === -1) {
    return null;
  }

  return {
    type: value.slice(0, separatorIndex),
    label: value.slice(separatorIndex + COMBINED_VALUE_SEPARATOR.length),
  };
};

const resolveCombinedSelection = (
  type: string,
  label: string | undefined,
  labelsByType: Record<string, string[]>
) => {
  const normalizedLabel = (label || '').trim();
  if (!normalizedLabel) {
    return CUSTOM_LABEL_VALUE;
  }

  const availableLabels = labelsByType[type] || [];
  if (availableLabels.includes(normalizedLabel)) {
    return createCombinedValue(type, normalizedLabel);
  }

  return CUSTOM_LABEL_VALUE;
};

const normalizeDateInputValue = (raw?: string): string => {
  if (!raw) return '';
  const value = String(raw).trim();
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoMatch) return isoMatch[1];
  return '';
};

const calculateAge = (birthDate?: string): string => {
  const normalized = normalizeDateInputValue(birthDate);
  if (!normalized) return '';

  const [year, month, day] = normalized.split('-').map(Number);
  if (!year || !month || !day) return '';

  const today = new Date();
  let age = today.getFullYear() - year;
  const hasHadBirthdayThisYear =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age >= 0 ? String(age) : '';
};

export const PersonalSection: React.FC<PersonalSectionProps> = ({
  data,
  onChange,
  errors = {},
  isLoading = false,
}) => {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(data.profileImage || null);
  const [birthDateValue, setBirthDateValue] = useState<string>(normalizeDateInputValue(data.birthDate));
  const ageValue = calculateAge(birthDateValue);

  const emailLabelsByType: Record<ContactItem['type'], string[]> = {
    personal: [
      t('editor.contacts.emailLabels.personalPrimary'),
      t('editor.contacts.emailLabels.personalSecondary'),
    ],
    work: [
      t('editor.contacts.emailLabels.workPrimary'),
      t('editor.contacts.emailLabels.workCorporate'),
      t('editor.contacts.emailLabels.workRecruiting'),
    ],
    education: [
      t('editor.contacts.emailLabels.educationPrimary'),
      t('editor.contacts.emailLabels.educationInstitutional'),
    ],
    other: [t('editor.contacts.emailLabels.other')],
  };

  const phoneLabelsByType: Record<PhoneItem['type'], string[]> = {
    personal: [
      t('editor.contacts.phoneLabels.personalPrimary'),
      t('editor.contacts.phoneLabels.personalMobile'),
    ],
    office: [
      t('editor.contacts.phoneLabels.officePrimary'),
      t('editor.contacts.phoneLabels.officeSwitchboard'),
      t('editor.contacts.phoneLabels.officeReception'),
    ],
    home: [t('editor.contacts.phoneLabels.home')],
    whatsapp: [t('editor.contacts.phoneLabels.whatsapp')],
    other: [t('editor.contacts.phoneLabels.other')],
  };

  useEffect(() => {
    setImagePreview(data.profileImage || null);
  }, [data.profileImage]);

  useEffect(() => {
    setBirthDateValue(normalizeDateInputValue(data.birthDate));
  }, [data.birthDate]);

  const updateField = (field: keyof PersonalData, value: any) => {
    try {
      onChange({ ...data, [field]: value });
    } catch (err) {
      toast.error(t('editor.personal.alerts.updateError', 'Error actualizando el campo'));
    }
  };

  const imageStyle = (data.profileImageStyle || 'round') as ProfileImageStyle;
  const imagePreviewClass =
    imageStyle === 'portrait'
      ? 'w-20 h-28 rounded-xl'
      : imageStyle === 'square'
        ? 'w-24 h-24 rounded-xl'
        : 'w-24 h-24 rounded-full';

  const addEmail = () => {
    const newEmail: ContactItem = {
      id: generateId(),
      type: 'personal',
      label: t('editor.contacts.emailLabels.personalPrimary'),
      value: '',
      isPrimary: data.emails.length === 0,
    };
    updateField('emails', [...data.emails, newEmail]);
  };

  const updateEmail = (id: string, updates: Partial<ContactItem>) => {
    const updatedEmails = data.emails.map((email) => {
      if (email.id !== id) {
        if (updates.isPrimary) {
          return { ...email, isPrimary: false };
        }
        return email;
      }

      return { ...email, ...updates };
    });
    updateField('emails', updatedEmails);
  };

  const updateEmailType = (id: string, type: ContactItem['type']) => {
    updateEmail(id, {
      type,
      label: defaultLabelForType(emailLabelsByType, type),
    });
  };

  const removeEmail = (id: string) => {
    const updatedEmails = data.emails.filter(email => email.id !== id);
    // If we removed the primary email, make the first remaining one primary
    if (updatedEmails.length > 0 && !updatedEmails.some(e => e.isPrimary)) {
      updatedEmails[0].isPrimary = true;
    }
    updateField('emails', updatedEmails);
  };

  const addPhone = () => {
    const newPhone: PhoneItem = {
      id: generateId(),
      type: 'personal',
      number: '',
      label: t('editor.contacts.phoneLabels.personalPrimary'),
      isPrimary: data.phones.length === 0,
    };
    updateField('phones', [...data.phones, newPhone]);
  };

  const updatePhone = (id: string, updates: Partial<PhoneItem>) => {
    const updatedPhones = data.phones.map((phone) => {
      if (phone.id !== id) {
        if (updates.isPrimary) {
          return { ...phone, isPrimary: false };
        }
        return phone;
      }

      return { ...phone, ...updates };
    });
    updateField('phones', updatedPhones);
  };

  const updatePhoneType = (id: string, type: PhoneItem['type']) => {
    updatePhone(id, {
      type,
      label: defaultLabelForType(phoneLabelsByType, type),
    });
  };

  const removePhone = (id: string) => {
    const updatedPhones = data.phones.filter(phone => phone.id !== id);
    // If we removed the primary phone, make the first remaining one primary
    if (updatedPhones.length > 0 && !updatedPhones.some(p => p.isPrimary)) {
      updatedPhones[0].isPrimary = true;
    }
    updateField('phones', updatedPhones);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast.error(t('editor.personal.alerts.invalidImage'));
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error(t('editor.personal.alerts.imageTooLarge'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        updateField('profileImage', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    updateField('profileImage', undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <FormSection
      title={t('editor.personal.title')}
      description={t('editor.personal.description')}
      errors={errors}
      isLoading={isLoading}
    >
      {/* Basic Information */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FormField
          label={t('editor.personal.fields.fullName')}
          required
          error={errors.fullName?.[0]}
        >
          <InputField
            value={data.fullName}
            onChange={(value) => updateField('fullName', value)}
            placeholder={t('editor.personal.placeholders.fullName')}
            required
          />
        </FormField>

        <FormField
          label={t('editor.personal.fields.professionalTitle')}
          error={errors.professionalTitle?.[0]}
          help={t('editor.personal.help.professionalTitle')}
        >
          <InputField
            value={data.professionalTitle}
            onChange={(value) => updateField('professionalTitle', value)}
            placeholder={t('editor.personal.placeholders.professionalTitle')}
          />
        </FormField>
      </div>

      {/* Profile Image */}
      <FormField
        label={t('editor.personal.fields.profileImage')}
        error={errors.profileImage?.[0]}
        help={t('editor.personal.help.profileImage')}
      >
        <div className="space-y-3">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt={t('editor.personal.profileImageAlt')}
                  className={`${imagePreviewClass} object-cover border-2 border-gray-200`}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className={`${imagePreviewClass} bg-gray-200 flex items-center justify-center border-2 border-gray-300`}>
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="profile-image"
            />
            <label
              htmlFor="profile-image"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {imagePreview ? t('editor.personal.changePhoto') : t('editor.personal.uploadPhoto')}
            </label>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={data.showProfileImage !== false}
            onChange={(e) => updateField('showProfileImage', e.target.checked)}
            className="rounded border-brand-300 text-brand-600 focus:ring-brand-500"
          />
          {t('editor.personal.showProfileImage')}
        </label>

        <FormField label={t('editor.personal.fields.profileImageStyle')}>
          <select
            value={imageStyle}
            onChange={(e) => updateField('profileImageStyle', e.target.value as ProfileImageStyle)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
          >
            <option value="round">{t('editor.personal.profileImageStyles.round')}</option>
            <option value="square">{t('editor.personal.profileImageStyles.square')}</option>
            <option value="portrait">{t('editor.personal.profileImageStyles.portrait')}</option>
          </select>
        </FormField>
        </div>
      </FormField>

      {/* Birth Date */}
      <FormField
        label={t('editor.personal.fields.birthDate')}
        error={errors.birthDate?.[0]}
        help={t('editor.personal.help.birthDate')}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('editor.personal.fields.date')}</label>
              <input
                type="date"
                value={birthDateValue}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  setBirthDateValue(selectedDate);
                  updateField('birthDate', selectedDate);
                }}
                className="block w-full px-3 py-2 border border-brand-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('editor.personal.fields.calculatedAge')}</label>
              <input
                type="text"
                value={ageValue ? t('editor.personal.ageValue', { age: ageValue }) : ''}
                readOnly
                placeholder={t('editor.personal.agePlaceholder')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-700 sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(data.showBirthDate)}
                onChange={(e) => updateField('showBirthDate', e.target.checked)}
                className="rounded border-brand-300 text-brand-600 focus:ring-brand-500"
              />
              {t('editor.personal.showBirthDate')}
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(data.showAge)}
                onChange={(e) => updateField('showAge', e.target.checked)}
                className="rounded border-brand-300 text-brand-600 focus:ring-brand-500"
              />
              {t('editor.personal.showAge')}
            </label>
          </div>
        </div>
      </FormField>

      {/* Contact Information */}
      <div className="space-y-6">
        <h4 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">
          {t('editor.personal.contactInfo')}
        </h4>

        {/* Emails */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-medium text-gray-700">{t('editor.personal.emailsTitle')}</h5>
            <button
              type="button"
              onClick={addEmail}
              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('editor.personal.addEmail')}
            </button>
          </div>

          {data.emails.map((email) => (
            <div key={email.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex-1 space-y-3">
                {(() => {
                  const isCustomEmailType = email.type === 'other';

                  return (
                    <>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={email.isPrimary || false}
                    onChange={(e) => updateEmail(email.id, { isPrimary: e.target.checked })}
                    className="rounded border-brand-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">{t('editor.personal.primaryEmail')}</span>
                </div>

                <FormField label={t('editor.personal.fields.type')}>
                  <select
                    value={email.type}
                    onChange={(e) => updateEmailType(email.id, e.target.value as ContactItem['type'])}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="personal">{t('editor.contacts.emailTypes.personal')}</option>
                    <option value="work">{t('editor.contacts.emailTypes.work')}</option>
                    <option value="education">{t('editor.contacts.emailTypes.education')}</option>
                    <option value="other">{t('editor.contacts.emailTypes.other')}</option>
                  </select>
                </FormField>

                {isCustomEmailType && (
                  <FormField label={t('editor.personal.fields.label')}>
                    <InputField
                      value={email.label}
                      onChange={(value) => updateEmail(email.id, { label: value })}
                      placeholder={t('editor.contacts.customEmailPlaceholder')}
                    />
                  </FormField>
                )}

                <FormField label={t('cv.email')} required>
                  <InputField
                    type="email"
                    value={email.value}
                    onChange={(value) => updateEmail(email.id, { value })}
                    placeholder={t('editor.personal.placeholders.email')}
                    required
                  />
                </FormField>
                    </>
                  );
                })()}
              </div>

              <button
                type="button"
                onClick={() => removeEmail(email.id)}
                className="text-red-500 hover:text-red-700 p-1"
                disabled={data.emails.length === 1}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Phones */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-medium text-gray-700">{t('editor.personal.phonesTitle')}</h5>
            <button
              type="button"
              onClick={addPhone}
              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('editor.personal.addPhone')}
            </button>
          </div>

          {data.phones.map((phone) => (
            <div key={phone.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex-1 space-y-3">
                {(() => {
                  const isCustomPhoneType = phone.type === 'other';

                  return (
                    <>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={phone.isPrimary || false}
                    onChange={(e) => updatePhone(phone.id, { isPrimary: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{t('editor.personal.primaryPhone')}</span>
                </div>

                <FormField label={t('editor.personal.fields.type')}>
                  <select
                    value={phone.type}
                    onChange={(e) => updatePhoneType(phone.id, e.target.value as PhoneItem['type'])}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="personal">{t('editor.contacts.phoneTypes.personal')}</option>
                    <option value="office">{t('editor.contacts.phoneTypes.office')}</option>
                    <option value="home">{t('editor.contacts.phoneTypes.home')}</option>
                    <option value="whatsapp">{t('editor.contacts.phoneTypes.whatsapp')}</option>
                    <option value="other">{t('editor.contacts.phoneTypes.other')}</option>
                  </select>
                </FormField>

                {isCustomPhoneType && (
                  <FormField label={t('editor.personal.fields.label')}>
                    <InputField
                      value={phone.label || ''}
                      onChange={(value) => updatePhone(phone.id, { label: value })}
                      placeholder={t('editor.contacts.customPhonePlaceholder')}
                    />
                  </FormField>
                )}

                <FormField label={t('editor.personal.fields.phoneNumber')} required>
                  <InputField
                    type="tel"
                    value={phone.number}
                    onChange={(value) => updatePhone(phone.id, { number: value })}
                    placeholder={t('editor.personal.placeholders.phone')}
                    required
                  />
                </FormField>
                    </>
                  );
                })()}
              </div>

              <button
                type="button"
                onClick={() => removePhone(phone.id)}
                className="text-red-500 hover:text-red-700 p-1"
                disabled={data.phones.length === 1}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            label={t('editor.personal.fields.address')}
            error={errors.address?.[0]}
            help={t('editor.personal.help.address')}
          >
            <InputField
              value={data.address || ''}
              onChange={(value) => updateField('address', value)}
              placeholder={t('editor.personal.placeholders.address')}
            />
          </FormField>

          <FormField
            label={t('editor.personal.fields.city')}
            error={errors.city?.[0]}
          >
            <InputField
              value={data.city || ''}
              onChange={(value) => updateField('city', value)}
              placeholder={t('editor.personal.placeholders.city')}
            />
          </FormField>

          <FormField
            label={t('editor.personal.fields.country')}
            error={errors.country?.[0]}
          >
            <InputField
              value={data.country || ''}
              onChange={(value) => updateField('country', value)}
              placeholder={t('editor.personal.placeholders.country')}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={data.showAddress !== false}
              onChange={(e) => updateField('showAddress', e.target.checked)}
              className="rounded border-brand-300 text-brand-600 focus:ring-brand-500"
            />
            {t('editor.personal.showAddress')}
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={data.showCity !== false}
              onChange={(e) => updateField('showCity', e.target.checked)}
              className="rounded border-brand-300 text-brand-600 focus:ring-brand-500"
            />
            {t('editor.personal.showCity')}
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={data.showCountry !== false}
              onChange={(e) => updateField('showCountry', e.target.checked)}
              className="rounded border-brand-300 text-brand-600 focus:ring-brand-500"
            />
            {t('editor.personal.showCountry')}
          </label>
        </div>

      </div>

      {/* Professional Summary */}
      <FormField
        label={t('editor.personal.fields.valueProposition')}
        error={errors.valueProposition?.[0]}
        help={t('editor.personal.help.valueProposition')}
      >
        <div className="space-y-3">
          <TextareaField
            value={data.valueProposition || ''}
            onChange={(value) => {
              // Igual que summary: propaga el objeto completo actualizado
              onChange({ ...data, valueProposition: value });
            }}
            placeholder={t('editor.personal.placeholders.valueProposition')}
            rows={4}
          />

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={data.showValuePropositionTitle !== false}
              onChange={(e) => onChange({ ...data, showValuePropositionTitle: e.target.checked })}
              className="rounded border-brand-300 text-brand-600 focus:ring-brand-500"
            />
            {t('editor.personal.showValuePropositionTitle')}
          </label>
        </div>
      </FormField>

      <FormField
        label={t('editor.personal.fields.summary')}
        error={errors.summary?.[0]}
        help={t('editor.personal.help.summary')}
      >
        <TextareaField
          value={data.summary}
          onChange={(value) => updateField('summary', value)}
          placeholder={t('editor.personal.placeholders.summary')}
          rows={6}
        />
      </FormField>
    </FormSection>
  );
};
