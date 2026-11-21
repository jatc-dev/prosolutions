import React, { useState, useRef, useEffect } from 'react';
import { CONTACT_LABEL_STYLES, normalizeContactLabelStyle } from '../../../contactLabels';
import { useTranslation } from 'react-i18next';
import { CountrySelect } from "../../../../../components/ui/CountrySelect";
import toast from 'react-hot-toast';
import { PersonalData, ContactItem, PhoneItem, ProfileImageSize, ProfileImageStyle, ValidationErrors } from "../../../../../shared/types";
import {
  FormSection,
  FormField,
  InputField,
  TextareaField
} from "../FormSection";
import { PhraseSuggestions } from "../components/PhraseSuggestions";
import { appendPhrase } from "../../../phrases";

interface PersonalSectionProps {
  data: PersonalData;
  onChange: (data: PersonalData) => void;
  onValidateField?: (field: string, value: unknown) => void;
  errors?: ValidationErrors;
  isLoading?: boolean;
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const VisibilityToggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; label?: string }> = ({ checked, onChange, label = 'Incluir en la hoja de vida' }) => (
  <label className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-slate-600">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="rounded border-brand-300 text-brand-800 focus:ring-brand-700" />
    {label}
  </label>
);

const CUSTOM_LABEL_VALUE = '__custom__';
const COMBINED_VALUE_SEPARATOR = '__::__';
const PHOTO_SIZE_OPTIONS: Array<{ value: ProfileImageSize; label: string }> = [
  { value: 'sm', label: 'Pequeña' },
  { value: 'md', label: 'Mediana' },
  { value: 'lg', label: 'Grande' },
  { value: 'xl', label: 'Muy grande' },
];

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
  onValidateField,
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
      onValidateField?.(`personal.${field}`, value);
    } catch (err) {
      toast.error(t('editor.personal.alerts.updateError', 'Error actualizando el campo'));
    }
  };

  const toggleReferenceField = (index: number, field: string, visible: boolean) => {
    const references = [...(data.references || [])];
    const reference = references[index];
    if (!reference) return;
    const hiddenFields = reference.hiddenFields || [];
    references[index] = {
      ...reference,
      hiddenFields: visible
        ? hiddenFields.filter((item) => item !== field)
        : [...hiddenFields.filter((item) => item !== field), field],
    };
    updateField('references', references);
  };

  // Photo framing (0–100 %, 50 = centred) and border, shared with the templates.
  const photoX = typeof data.profileImagePositionX === 'number' ? data.profileImagePositionX : 50;
  const photoY = typeof data.profileImagePositionY === 'number' ? data.profileImagePositionY : 50;
  const clampPct = (value: number) => Math.round(Math.min(100, Math.max(0, value)));
  const setPhotoPosition = (x: number, y: number) => onChange({ ...data, profileImagePositionX: clampPct(x), profileImagePositionY: clampPct(y) });
  const dragRef = useRef<{ startX: number; startY: number; x: number; y: number; width: number; height: number } | null>(null);
  const onPhotoPointerDown = (event: React.PointerEvent<HTMLImageElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    dragRef.current = { startX: event.clientX, startY: event.clientY, x: photoX, y: photoY, width: box.width, height: box.height };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPhotoPointerMove = (event: React.PointerEvent<HTMLImageElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    // Dragging the photo right reveals more of its left side (lower object-position).
    setPhotoPosition(drag.x - ((event.clientX - drag.startX) / drag.width) * 150, drag.y - ((event.clientY - drag.startY) / drag.height) * 150);
  };
  const onPhotoPointerUp = () => { dragRef.current = null; };

  const imageStyle = (data.profileImageStyle || 'round') as ProfileImageStyle;
  const imagePreviewClass =
    imageStyle === 'portrait'
      ? 'w-20 h-28 rounded-xl'
      : imageStyle === 'oval'
        ? 'w-20 h-28 rounded-[50%]'
        : imageStyle === 'arch'
          ? 'w-20 h-28 rounded-t-full rounded-b-md'
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
    const emailIndex = data.emails.findIndex((email) => email.id === id);
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
    if (updates.value !== undefined) onValidateField?.(`personal.emails.${emailIndex}.value`, updates.value);
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
    const phoneIndex = data.phones.findIndex((phone) => phone.id === id);
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
    if (updates.number !== undefined && phoneIndex >= 0) {
      onValidateField?.(`personal.phones.${phoneIndex}.number`, updates.number);
    }
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
                  title="Arrastra para encuadrar la foto"
                  draggable={false}
                  onPointerDown={onPhotoPointerDown}
                  onPointerMove={onPhotoPointerMove}
                  onPointerUp={onPhotoPointerUp}
                  onPointerCancel={onPhotoPointerUp}
                  style={{ objectPosition: `${photoX}% ${photoY}%`, touchAction: 'none' }}
                  className={`${imagePreviewClass} cursor-move select-none object-cover ${data.profileImageBorder === false ? '' : 'border-2 border-slate-200'}`}
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
              <div className={`${imagePreviewClass} bg-slate-200 flex items-center justify-center border-2 border-slate-300`}>
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {imagePreview ? t('editor.personal.changePhoto') : t('editor.personal.uploadPhoto')}
            </label>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={data.showProfileImage !== false}
            onChange={(e) => updateField('showProfileImage', e.target.checked)}
            className="rounded border-brand-300 text-brand-800 focus:ring-brand-700"
          />
          {t('editor.personal.showProfileImage')}
        </label>

        <FormField label={t('editor.personal.fields.profileImageStyle')}>
          <select
            value={imageStyle}
            onChange={(e) => updateField('profileImageStyle', e.target.value as ProfileImageStyle)}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-700 focus:border-brand-700 sm:text-sm"
          >
            <option value="round">{t('editor.personal.profileImageStyles.round')}</option>
            <option value="square">{t('editor.personal.profileImageStyles.square')}</option>
            <option value="portrait">{t('editor.personal.profileImageStyles.portrait')}</option>
            <option value="oval">{t('editor.personal.profileImageStyles.oval', 'Ovalada')}</option>
            <option value="arch">{t('editor.personal.profileImageStyles.arch', 'Arco')}</option>
          </select>
        </FormField>

        <FormField label="Tamaño de la foto" help="Ajusta el tamaño con el que aparece en la plantilla.">
          <div role="radiogroup" aria-label="Tamaño de la foto" className="grid grid-cols-4 gap-2">
            {PHOTO_SIZE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={(data.profileImageSize || 'md') === option.value}
                onClick={() => updateField('profileImageSize', option.value)}
                className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${(data.profileImageSize || 'md') === option.value ? 'border-brand-700 bg-brand-50 font-semibold text-slate-900' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </FormField>

        {imagePreview ? (
          <FormField label="Encuadre de la foto" help="Arrastra la foto en la miniatura o usa los controles si quedó descentrada.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,1fr,auto] sm:items-end">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Horizontal
                <input type="range" min={0} max={100} value={photoX} onChange={(e) => setPhotoPosition(Number(e.target.value), photoY)} className="mt-1 w-full accent-brand-700" aria-label="Encuadre horizontal de la foto" />
              </label>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Vertical
                <input type="range" min={0} max={100} value={photoY} onChange={(e) => setPhotoPosition(photoX, Number(e.target.value))} className="mt-1 w-full accent-brand-700" aria-label="Encuadre vertical de la foto" />
              </label>
              <button type="button" onClick={() => setPhotoPosition(50, 50)} disabled={photoX === 50 && photoY === 50} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                Centrar
              </button>
            </div>
          </FormField>
        ) : null}

        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={data.profileImageBorder !== false}
            onChange={(e) => updateField('profileImageBorder', e.target.checked)}
            className="rounded border-brand-300 text-brand-800 focus:ring-brand-700"
          />
          Mostrar borde en la foto
        </label>
        </div>
      </FormField>


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
        <VisibilityToggle checked={data.showFullName !== false} onChange={(value) => updateField('showFullName', value)} label="Mostrar nombre" />
        <VisibilityToggle checked={data.showProfessionalTitle !== false} onChange={(value) => updateField('showProfessionalTitle', value)} label="Mostrar título profesional" />
      </div>

      <FormField
        label={t('editor.personal.fields.nationality')}
        help={t('editor.personal.help.nationality')}
      >
        <CountrySelect
          value={data.nationality || ''}
          onChange={(countryCode) => updateField('nationality', countryCode)}
          locale={i18n.language || 'es'}
          placeholder={t('editor.personal.placeholders.nationality')}
          aria-label={t('editor.personal.fields.nationality')}
        />
      </FormField>
      <VisibilityToggle checked={data.showNationality !== false} onChange={(value) => updateField('showNationality', value)} label="Mostrar nacionalidad" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Tipo de documento de identidad">
          <select value={data.documentType || ''} onChange={(e) => updateField('documentType', e.target.value)} className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
            <option value="">Seleccionar</option><option value="CC">Cédula de ciudadanía</option><option value="CE">Cédula de extranjería</option><option value="Pasaporte">Pasaporte</option><option value="PEP">Permiso especial de permanencia</option><option value="PPT">Permiso por protección temporal</option><option value="Otro">Otro</option>
          </select>
        </FormField>
        <VisibilityToggle checked={data.showDocumentType !== false} onChange={(value) => updateField('showDocumentType', value)} label="Mostrar tipo de documento" />
        <FormField label="Número de documento"><InputField value={data.documentNumber || ''} onChange={(value) => updateField('documentNumber', value)} placeholder="Número de identificación" /></FormField>
        <VisibilityToggle checked={data.showDocumentNumber !== false} onChange={(value) => updateField('showDocumentNumber', value)} label="Mostrar número de documento" />
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={Boolean(data.showDocumentIdentity)} onChange={(e) => updateField('showDocumentIdentity', e.target.checked)} className="rounded border-brand-300 text-brand-800 focus:ring-brand-700" />Mostrar documento de identidad en la hoja de vida</label>

      {/* Birth Date */}
      <FormField
        label={t('editor.personal.fields.birthDate')}
        error={errors.birthDate?.[0]}
        help={t('editor.personal.help.birthDate')}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">{t('editor.personal.fields.date')}</label>
              <input
                type="date"
                value={birthDateValue}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  setBirthDateValue(selectedDate);
                  updateField('birthDate', selectedDate);
                }}
                className="block w-full px-3 py-2 border border-brand-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-700 focus:border-brand-700 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1">{t('editor.personal.fields.calculatedAge')}</label>
              <input
                type="text"
                value={ageValue ? t('editor.personal.ageValue', { age: ageValue }) : ''}
                readOnly
                placeholder={t('editor.personal.agePlaceholder')}
                className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm bg-slate-50 text-slate-700 sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(data.showBirthDate)}
                onChange={(e) => updateField('showBirthDate', e.target.checked)}
                className="rounded border-brand-300 text-brand-800 focus:ring-brand-700"
              />
              {t('editor.personal.showBirthDate')}
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(data.showAge)}
                onChange={(e) => updateField('showAge', e.target.checked)}
                className="rounded border-brand-300 text-brand-800 focus:ring-brand-700"
              />
              {t('editor.personal.showAge')}
            </label>
          </div>
        </div>
      </FormField>

      {/* Contact Information */}
      <div className="space-y-6">
        <h4 className="text-md font-medium text-slate-900 border-b border-slate-200 pb-2">
          {t('editor.personal.contactInfo')}
        </h4>

        <FormField label="Cómo mostrar correos y teléfonos" help={CONTACT_LABEL_STYLES.find((option) => option.value === normalizeContactLabelStyle(data.contactLabelStyle))?.hint}>
          <div role="radiogroup" aria-label="Cómo mostrar correos y teléfonos" className="grid grid-cols-3 gap-2">
            {CONTACT_LABEL_STYLES.map((option) => {
              const selected = normalizeContactLabelStyle(data.contactLabelStyle) === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => updateField('contactLabelStyle', option.value)}
                  className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${selected ? 'border-brand-700 bg-brand-50 font-semibold text-slate-900' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </FormField>

        {/* Emails */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-medium text-slate-700">{t('editor.personal.emailsTitle')}</h5>
            <button
              type="button"
              onClick={addEmail}
              className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('editor.personal.addEmail')}
            </button>
          </div>

          {data.emails.map((email) => (
            <div key={email.id} className="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex-1 space-y-3">
                {(() => {
                  const isCustomEmailType = email.type === 'other';

                  return (
                    <>
                <div className="flex items-center space-x-2">
                  <VisibilityToggle checked={email.isVisible !== false} onChange={(value) => updateEmail(email.id, { isVisible: value })} label="Mostrar este correo" />
                </div>

                <FormField label={t('editor.personal.fields.type')}>
                  <select
                    value={email.type}
                    onChange={(e) => updateEmailType(email.id, e.target.value as ContactItem['type'])}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-600 focus:border-brand-600 sm:text-sm"
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
            <h5 className="text-sm font-medium text-slate-700">{t('editor.personal.phonesTitle')}</h5>
            <button
              type="button"
              onClick={addPhone}
              className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('editor.personal.addPhone')}
            </button>
          </div>

          {data.phones.map((phone) => (
            <div key={phone.id} className="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex-1 space-y-3">
                {(() => {
                  const isCustomPhoneType = phone.type === 'other';

                  return (
                    <>
                <div className="flex items-center space-x-2">
                  <VisibilityToggle checked={phone.isVisible !== false} onChange={(value) => updatePhone(phone.id, { isVisible: value })} label="Mostrar este teléfono" />
                </div>

                <FormField label={t('editor.personal.fields.type')}>
                  <select
                    value={phone.type}
                    onChange={(e) => updatePhoneType(phone.id, e.target.value as PhoneItem['type'])}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-600 focus:border-brand-600 sm:text-sm"
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
            <CountrySelect
              value={data.country || ''}
              onChange={(countryCode) => updateField('country', countryCode)}
              locale={i18n.language || 'es'}
              placeholder={t('editor.personal.placeholders.country')}
              aria-label={t('editor.personal.fields.country')}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={data.showAddress !== false}
              onChange={(e) => updateField('showAddress', e.target.checked)}
              className="rounded border-brand-300 text-brand-800 focus:ring-brand-700"
            />
            {t('editor.personal.showAddress')}
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={data.showCity !== false}
              onChange={(e) => updateField('showCity', e.target.checked)}
              className="rounded border-brand-300 text-brand-800 focus:ring-brand-700"
            />
            {t('editor.personal.showCity')}
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={data.showCountry !== false}
              onChange={(e) => updateField('showCountry', e.target.checked)}
              className="rounded border-brand-300 text-brand-800 focus:ring-brand-700"
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

          <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={data.showValuePropositionTitle !== false} onChange={(e) => updateField('showValuePropositionTitle', e.target.checked)} className="rounded border-brand-300 text-brand-800 focus:ring-brand-700" />
              Mostrar etiqueta «Propuesta de valor»
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={data.showValuePropositionContent !== false} onChange={(e) => updateField('showValuePropositionContent', e.target.checked)} className="rounded border-brand-300 text-brand-800 focus:ring-brand-700" />
              Mostrar contenido
            </label>
          </div>
        </div>
      </FormField>

      <FormField
        label={t('editor.personal.fields.summary')}
        error={errors.summary?.[0]}
        help={t('editor.personal.help.summary')}
      >
        <div className="space-y-3">
          <TextareaField
            value={data.summary}
            onChange={(value) => updateField('summary', value)}
            placeholder={t('editor.personal.placeholders.summary')}
            rows={6}
          />
          <PhraseSuggestions
            title={data.professionalTitle}
            kind="summaries"
            onPick={(phrase) => updateField('summary', appendPhrase(data.summary, phrase))}
            isUsed={(phrase) => String(data.summary || '').includes(phrase)}
          />
          <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={data.showSummaryTitle !== false} onChange={(e) => updateField('showSummaryTitle', e.target.checked)} className="rounded border-brand-300 text-brand-800 focus:ring-brand-700" />
              Mostrar etiqueta «Perfil profesional»
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={data.showSummaryContent !== false} onChange={(e) => updateField('showSummaryContent', e.target.checked)} className="rounded border-brand-300 text-brand-800 focus:ring-brand-700" />
              Mostrar contenido
            </label>
          </div>
        </div>
      </FormField>
      <section className="space-y-4 border-t border-slate-200 pt-5">
        <div><h4 className="text-sm font-semibold text-slate-900">Referencias</h4><p className="text-xs text-slate-500">Se mostrarán al final del contenido principal de la hoja de vida.</p></div>
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={data.showReferences !== false} onChange={(e) => updateField('showReferences', e.target.checked)} className="rounded border-brand-300 text-brand-800 focus:ring-brand-700" />Incluir referencias directas</label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={Boolean(data.referencesAvailableOnRequest)} onChange={(e) => updateField('referencesAvailableOnRequest', e.target.checked)} className="rounded border-brand-300 text-brand-800 focus:ring-brand-700" />Mostrar «Referencias laborales y personales: Disponibles a solicitud.»</label>
        </div>
        {data.showReferences !== false ? <>
          <div className="flex justify-end"><button type="button" onClick={() => updateField('references', [...(data.references || []), { id: generateId(), type: 'laboral', isVisible: true, name: '', position: '', company: '', relationship: '', phone: '', email: '' }])} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Agregar referencia</button></div>
          {(data.references || []).map((reference, index) => <div key={reference.id} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><VisibilityToggle checked={reference.isVisible !== false} onChange={(value) => updateField('references', (data.references || []).map((item, i) => i === index ? { ...item, isVisible: value } : item))} label="Mostrar esta referencia" /></div><FormField label="Tipo de referencia"><select value={reference.type} onChange={(e) => updateField('references', (data.references || []).map((item, i) => i === index ? { ...item, type: e.target.value as 'personal' | 'laboral' } : item))} className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option value="laboral">Laboral</option><option value="personal">Familiar / personal</option></select></FormField>
            <FormField label="Nombre y apellido"><InputField value={reference.name} onChange={(value) => updateField('references', (data.references || []).map((item, i) => i === index ? { ...item, name: value } : item))} /></FormField><VisibilityToggle checked={!(reference.hiddenFields || []).includes('name')} onChange={(value) => toggleReferenceField(index, 'name', value)} label="Mostrar nombre" />
            {reference.type === 'laboral' ? <><FormField label="Cargo actual"><InputField value={reference.position || ''} onChange={(value) => updateField('references', (data.references || []).map((item, i) => i === index ? { ...item, position: value } : item))} /></FormField><VisibilityToggle checked={!(reference.hiddenFields || []).includes('position')} onChange={(value) => toggleReferenceField(index, 'position', value)} label="Mostrar cargo" /><FormField label="Empresa"><InputField value={reference.company || ''} onChange={(value) => updateField('references', (data.references || []).map((item, i) => i === index ? { ...item, company: value } : item))} /></FormField><VisibilityToggle checked={!(reference.hiddenFields || []).includes('company')} onChange={(value) => toggleReferenceField(index, 'company', value)} label="Mostrar empresa" /></> : <><FormField label="Parentesco"><InputField value={reference.relationship || reference.position || ''} onChange={(value) => updateField('references', (data.references || []).map((item, i) => i === index ? { ...item, relationship: value, position: value } : item))} /></FormField><VisibilityToggle checked={!(reference.hiddenFields || []).includes('relationship')} onChange={(value) => toggleReferenceField(index, 'relationship', value)} label="Mostrar parentesco" /></>}
            <FormField label="Teléfono de contacto"><InputField type="tel" value={reference.phone || ''} onChange={(value) => updateField('references', (data.references || []).map((item, i) => i === index ? { ...item, phone: value } : item))} /></FormField><VisibilityToggle checked={!(reference.hiddenFields || []).includes('phone')} onChange={(value) => toggleReferenceField(index, 'phone', value)} label="Mostrar teléfono" />
            <FormField label="Correo electrónico"><InputField type="email" value={reference.email || ''} onChange={(value) => updateField('references', (data.references || []).map((item, i) => i === index ? { ...item, email: value } : item))} /></FormField><VisibilityToggle checked={!(reference.hiddenFields || []).includes('email')} onChange={(value) => toggleReferenceField(index, 'email', value)} label="Mostrar correo" />
            <div className="sm:col-span-2 flex justify-end"><button type="button" onClick={() => updateField('references', (data.references || []).filter((_, i) => i !== index))} className="text-xs font-medium text-red-600 hover:text-red-700">Eliminar referencia</button></div>
          </div>)}
        </> : null}
      </section>

    </FormSection>
  );
};
