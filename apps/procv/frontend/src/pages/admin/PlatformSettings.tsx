import { useEffect, useState } from "react";
import { BarChart3, FileText, Folder, Mail, Palette, Settings, ShieldCheck, Users, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";

interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  category: string;
  description?: string;
  isPublic: boolean;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export function PlatformSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingSetting, setEditingSetting] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  // Default settings templates
  const generalSettings = [
    {
      key: "platform_name",
      value: "ProCV Platform",
      type: "string",
      category: "general",
      description: "Nombre de la plataforma que se muestra en la interfaz"
    },
    {
      key: "platform_description",
      value: "Creador profesional de CVs",
      type: "string",
      category: "general",
      description: "Descripción corta de la plataforma"
    },
    {
      key: "contact_email",
      value: "admin@procvplatform.com",
      type: "string",
      category: "general",
      description: "Email de contacto para soporte"
    },
    {
      key: "contact_phone",
      value: "",
      type: "string",
      category: "general",
      description: "Teléfono de contacto (opcional)"
    },
    {
      key: "allow_registration",
      value: "true",
      type: "boolean",
      category: "general",
      description: "Permitir registro de nuevos usuarios"
    },
    {
      key: "require_email_verification",
      value: "false",
      type: "boolean",
      category: "general",
      description: "Requerir verificación de email para nuevos usuarios"
    },
    {
      key: "maintenance_mode",
      value: "false",
      type: "boolean",
      category: "general",
      description: "Activar modo mantenimiento"
    },
    {
      key: "maintenance_message",
      value: "La plataforma está en mantenimiento. Volveremos pronto.",
      type: "string",
      category: "general",
      description: "Mensaje a mostrar en modo mantenimiento"
    }
  ];

  // UI/Branding settings
  const brandingSettings = [
    {
      key: "primary_color",
      value: "#3B82F6",
      type: "string",
      category: "branding",
      description: "Color primario del tema (brand-500)"
    },
    {
      key: "secondary_color",
      value: "#64748B",
      type: "string",
      category: "branding",
      description: "Color secundario del tema"
    },
    {
      key: "accent_color",
      value: "#10B981",
      type: "string",
      category: "branding",
      description: "Color de acento para elementos destacados"
    },
    {
      key: "custom_logo_url",
      value: "",
      type: "string",
      category: "branding",
      description: "URL del logo personalizado (dejar vacío para usar el logo por defecto)"
    },
    {
      key: "custom_css",
      value: "",
      type: "string",
      category: "branding",
      description: "CSS personalizado para personalizar la apariencia"
    },
    {
      key: "default_language",
      value: "es",
      type: "string",
      category: "branding",
      description: "Idioma por defecto de la plataforma"
    }
  ];

  // Security settings
  const securitySettings = [
    {
      key: "password_min_length",
      value: "6",
      type: "number",
      category: "security",
      description: "Longitud mínima de contraseña"
    },
    {
      key: "password_require_uppercase",
      value: "false",
      type: "boolean",
      category: "security",
      description: "Requerir al menos una letra mayúscula"
    },
    {
      key: "password_require_lowercase",
      value: "false",
      type: "boolean",
      category: "security",
      description: "Requerir al menos una letra minúscula"
    },
    {
      key: "password_require_numbers",
      value: "false",
      type: "boolean",
      category: "security",
      description: "Requerir al menos un número"
    },
    {
      key: "password_require_special_chars",
      value: "false",
      type: "boolean",
      category: "security",
      description: "Requerir caracteres especiales"
    },
    {
      key: "password_expiration_days",
      value: "90",
      type: "number",
      category: "security",
      description: "Días para expiración de contraseña (0 = nunca expira)"
    },
    {
      key: "session_timeout_minutes",
      value: "60",
      type: "number",
      category: "security",
      description: "Minutos de inactividad antes de cerrar sesión automáticamente"
    },
    {
      key: "login_max_attempts",
      value: "5",
      type: "number",
      category: "security",
      description: "Número máximo de intentos de login fallidos"
    },
    {
      key: "login_lockout_minutes",
      value: "15",
      type: "number",
      category: "security",
      description: "Minutos de bloqueo después de intentos fallidos"
    },
    {
      key: "rate_limit_requests_per_minute",
      value: "60",
      type: "number",
      category: "security",
      description: "Límite de requests por minuto por IP"
    },
    {
      key: "rate_limit_requests_per_hour",
      value: "1000",
      type: "number",
      category: "security",
      description: "Límite de requests por hora por IP"
    },
    {
      key: "two_factor_auth_enabled",
      value: "false",
      type: "boolean",
      category: "security",
      description: "Habilitar autenticación de dos factores (2FA)"
    }
  ];

  // Email/SMTP settings
  const emailSettings = [
    {
      key: "smtp_host",
      value: "smtp.gmail.com",
      type: "string",
      category: "email",
      description: "Servidor SMTP para envío de emails"
    },
    {
      key: "smtp_port",
      value: "587",
      type: "number",
      category: "email",
      description: "Puerto SMTP (587 para TLS, 465 para SSL)"
    },
    {
      key: "smtp_secure",
      value: "false",
      type: "boolean",
      category: "email",
      description: "Usar conexión segura (SSL/TLS)"
    },
    {
      key: "smtp_username",
      value: "",
      type: "string",
      category: "email",
      description: "Usuario/correo para autenticación SMTP"
    },
    {
      key: "smtp_password",
      value: "",
      type: "string",
      category: "email",
      description: "Contraseña para autenticación SMTP"
    },
    {
      key: "smtp_from_email",
      value: "noreply@procvplatform.com",
      type: "string",
      category: "email",
      description: "Correo remitente por defecto"
    },
    {
      key: "smtp_from_name",
      value: "ProCV Platform",
      type: "string",
      category: "email",
      description: "Nombre del remitente por defecto"
    },
    {
      key: "email_welcome_enabled",
      value: "true",
      type: "boolean",
      category: "email",
      description: "Enviar email de bienvenida a nuevos usuarios"
    },
    {
      key: "email_password_reset_enabled",
      value: "true",
      type: "boolean",
      category: "email",
      description: "Permitir recuperación de contraseña por email"
    },
    {
      key: "email_notifications_enabled",
      value: "true",
      type: "boolean",
      category: "email",
      description: "Enviar notificaciones por email"
    },
    {
      key: "email_admin_notifications",
      value: "true",
      type: "boolean",
      category: "email",
      description: "Notificar al admin sobre eventos importantes"
    },
    {
      key: "email_rate_limit_per_hour",
      value: "100",
      type: "number",
      category: "email",
      description: "Límite máximo de emails por hora"
    },
    {
      key: "email_rate_limit_per_day",
      value: "1000",
      type: "number",
      category: "email",
      description: "Límite máximo de emails por día"
    },
    {
      key: "email_welcome_subject",
      value: "¡Bienvenido a ProCV Platform!",
      type: "string",
      category: "email",
      description: "Asunto del email de bienvenida"
    },
    {
      key: "email_welcome_template",
      value: "¡Hola {{name}}!\n\nBienvenido a ProCV Platform. Tu cuenta ha sido creada exitosamente.\n\nPuedes comenzar a crear tu CV profesional visitando: {{loginUrl}}\n\nSaludos,\nEl equipo de ProCV",
      type: "string",
      category: "email",
      description: "Plantilla del email de bienvenida (soporta variables: {{name}}, {{loginUrl}})"
    },
    {
      key: "email_password_reset_subject",
      value: "Recuperación de contraseña - ProCV Platform",
      type: "string",
      category: "email",
      description: "Asunto del email de recuperación de contraseña"
    },
    {
      key: "email_password_reset_template",
      value: "¡Hola {{name}}!\n\nHas solicitado recuperar tu contraseña.\n\nHaz clic en el siguiente enlace para crear una nueva contraseña:\n{{resetUrl}}\n\nEste enlace expirará en 1 hora por seguridad.\n\nSi no solicitaste este cambio, ignora este email.\n\nSaludos,\nEl equipo de ProCV",
      type: "string",
      category: "email",
      description: "Plantilla del email de recuperación de contraseña (soporta variables: {{name}}, {{resetUrl}})"
    }
  ];

  // File/Storage settings
  const fileSettings = [
    {
      key: "max_file_size_pdf",
      value: "10",
      type: "number",
      category: "files",
      description: "Tamaño máximo para archivos PDF en MB"
    },
    {
      key: "max_file_size_image",
      value: "5",
      type: "number",
      category: "files",
      description: "Tamaño máximo para imágenes de perfil en MB"
    },
    {
      key: "allowed_image_types",
      value: "jpg,jpeg,png,gif,webp",
      type: "string",
      category: "files",
      description: "Tipos de imagen permitidos (separados por coma)"
    },
    {
      key: "storage_limit_per_user",
      value: "100",
      type: "number",
      category: "files",
      description: "Límite de almacenamiento por usuario en MB"
    },
    {
      key: "global_storage_limit",
      value: "10000",
      type: "number",
      category: "files",
      description: "Límite de almacenamiento global en MB"
    },
    {
      key: "image_compression_enabled",
      value: "true",
      type: "boolean",
      category: "files",
      description: "Habilitar compresión automática de imágenes"
    },
    {
      key: "image_compression_quality",
      value: "80",
      type: "number",
      category: "files",
      description: "Calidad de compresión de imágenes (1-100)"
    }
  ];

  // CV/Template settings
  const cvSettings = [
    {
      key: "default_cv_template",
      value: "minimal",
      type: "string",
      category: "cv",
      description: "Plantilla por defecto para nuevos CVs"
    },
    {
      key: "max_cvs_per_user",
      value: "10",
      type: "number",
      category: "cv",
      description: "Máximo número de CVs por usuario"
    },
    {
      key: "max_cv_versions",
      value: "20",
      type: "number",
      category: "cv",
      description: "Máximo número de versiones por CV"
    },
    {
      key: "cv_auto_save_interval",
      value: "30",
      type: "number",
      category: "cv",
      description: "Intervalo de autoguardado en segundos"
    },
    {
      key: "export_pdf_enabled",
      value: "true",
      type: "boolean",
      category: "cv",
      description: "Permitir exportación a PDF"
    },
    {
      key: "export_xml_enabled",
      value: "true",
      type: "boolean",
      category: "cv",
      description: "Permitir exportación a XML"
    },
    {
      key: "export_json_enabled",
      value: "true",
      type: "boolean",
      category: "cv",
      description: "Permitir exportación a JSON"
    },
    {
      key: "pdf_export_quality",
      value: "150",
      type: "number",
      category: "cv",
      description: "DPI para exportación PDF"
    },
    {
      key: "pdf_compression_level",
      value: "medium",
      type: "string",
      category: "cv",
      description: "Nivel de compresión PDF (low/medium/high)"
    }
  ];

  // User management settings
  const userSettings = [
    {
      key: "default_user_role",
      value: "user",
      type: "string",
      category: "users",
      description: "Rol por defecto para nuevos usuarios"
    },
    {
      key: "auto_activate_accounts",
      value: "true",
      type: "boolean",
      category: "users",
      description: "Activar cuentas automáticamente al registrarse"
    },
    {
      key: "require_email_verification",
      value: "false",
      type: "boolean",
      category: "users",
      description: "Requerir verificación de email para activar cuenta"
    },
    {
      key: "bulk_operations_limit",
      value: "50",
      type: "number",
      category: "users",
      description: "Máximo de usuarios para operaciones bulk"
    },
    {
      key: "require_user_name",
      value: "true",
      type: "boolean",
      category: "users",
      description: "Campo nombre requerido en perfil"
    },
    {
      key: "require_user_phone",
      value: "false",
      type: "boolean",
      category: "users",
      description: "Campo teléfono requerido en perfil"
    },
    {
      key: "allow_profile_pictures",
      value: "true",
      type: "boolean",
      category: "users",
      description: "Permitir subir fotos de perfil"
    },
    {
      key: "max_login_attempts",
      value: "5",
      type: "number",
      category: "users",
      description: "Máximo intentos de login antes de bloqueo"
    }
  ];

  // Analytics/Reports settings
  const analyticsSettings = [
    {
      key: "analytics_retention_days",
      value: "90",
      type: "number",
      category: "analytics",
      description: "Días para mantener datos de analytics"
    },
    {
      key: "track_user_registrations",
      value: "true",
      type: "boolean",
      category: "analytics",
      description: "Rastrear registros de usuarios"
    },
    {
      key: "track_cv_creations",
      value: "true",
      type: "boolean",
      category: "analytics",
      description: "Rastrear creación de CVs"
    },
    {
      key: "track_cv_exports",
      value: "true",
      type: "boolean",
      category: "analytics",
      description: "Rastrear exportaciones de CVs"
    },
    {
      key: "track_user_logins",
      value: "true",
      type: "boolean",
      category: "analytics",
      description: "Rastrear inicios de sesión"
    },
    {
      key: "enable_data_export",
      value: "true",
      type: "boolean",
      category: "analytics",
      description: "Permitir exportación de datos de analytics"
    },
    {
      key: "analytics_export_formats",
      value: "csv,json,pdf",
      type: "string",
      category: "analytics",
      description: "Formatos disponibles para exportación de analytics"
    },
    {
      key: "dashboard_show_user_growth",
      value: "true",
      type: "boolean",
      category: "analytics",
      description: "Mostrar gráfico de crecimiento de usuarios"
    },
    {
      key: "dashboard_show_cv_stats",
      value: "true",
      type: "boolean",
      category: "analytics",
      description: "Mostrar estadísticas de CVs"
    },
    {
      key: "dashboard_show_popular_templates",
      value: "true",
      type: "boolean",
      category: "analytics",
      description: "Mostrar plantillas más populares"
    }
  ];

  // Backup/Maintenance settings
  const backupSettings = [
    {
      key: "backup_enabled",
      value: "true",
      type: "boolean",
      category: "backup",
      description: "Habilitar backups automáticos"
    },
    {
      key: "backup_frequency",
      value: "daily",
      type: "string",
      category: "backup",
      description: "Frecuencia de backups (daily/weekly/monthly)"
    },
    {
      key: "backup_retention_days",
      value: "30",
      type: "number",
      category: "backup",
      description: "Días para mantener backups"
    },
    {
      key: "log_retention_days",
      value: "90",
      type: "number",
      category: "backup",
      description: "Días para mantener logs del sistema"
    },
    {
      key: "audit_log_retention_days",
      value: "365",
      type: "number",
      category: "backup",
      description: "Días para mantener logs de auditoría"
    },
    {
      key: "auto_cleanup_enabled",
      value: "true",
      type: "boolean",
      category: "backup",
      description: "Habilitar limpieza automática de datos antiguos"
    },
    {
      key: "cache_ttl_seconds",
      value: "3600",
      type: "number",
      category: "backup",
      description: "Tiempo de vida del caché en segundos"
    },
    {
      key: "cache_max_size_mb",
      value: "100",
      type: "number",
      category: "backup",
      description: "Tamaño máximo del caché en MB"
    },
    {
      key: "maintenance_window_start",
      value: "02:00",
      type: "string",
      category: "backup",
      description: "Hora de inicio de ventana de mantenimiento (HH:MM)"
    },
    {
      key: "maintenance_window_duration",
      value: "2",
      type: "number",
      category: "backup",
      description: "Duración de ventana de mantenimiento en horas"
    }
  ];

  const allDefaultSettings = [
    ...generalSettings,
    ...brandingSettings,
    ...securitySettings,
    ...emailSettings,
    ...fileSettings,
    ...cvSettings,
    ...userSettings,
    ...analyticsSettings,
    ...backupSettings
  ];

  const getLocalizedDescription = (settingKey: string, fallback: string) =>
    t(`admin.platformSettings.settingDescriptions.${settingKey}`, { defaultValue: fallback });

  const yesLabel = t("common.yes");
  const noLabel = t("common.no");
  const valuePlaceholder = t("admin.platformSettings.valuePlaceholder");
  const notConfigured = t("admin.platformSettings.notConfigured");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/settings");
      const payload = response.data;
      const nextSettings = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.settings)
          ? payload.settings
          : [];
      setSettings(nextSettings);
    } catch (err: any) {
      setError(err.response?.data?.message || t("admin.platformSettings.errors.loadSettings"));
      setSettings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleEdit = (setting: PlatformSetting) => {
    setEditingSetting(setting.key);
    setEditValue(setting.value);
  };

  const handleSave = async (key: string) => {
    try {
      setSaving(true);

      let valueToSave = editValue;

      // Handle file upload for logo
      if (key === 'custom_logo_url' && uploadedFile) {
        const formData = new FormData();
        formData.append('logo', uploadedFile);

        const uploadResponse = await api.post('/admin/upload/logo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        valueToSave = uploadResponse.data.logoUrl;
      }

      await api.put(`/admin/settings/${key}`, { value: valueToSave });
      setEditingSetting(null);
      setUploadedFile(null);
      setSuccess(t("admin.platformSettings.success.updated"));
      fetchSettings();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || t("admin.platformSettings.errors.updateSetting"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingSetting(null);
    setEditValue("");
    setUploadedFile(null);
  };

  const handleBulkSave = async () => {
    try {
      setSaving(true);
      const settingsToUpdate = allDefaultSettings.filter(defaultSetting => {
        const existing = settings.find(s => s.key === defaultSetting.key);
        return !existing || existing.value !== defaultSetting.value;
      });

      if (settingsToUpdate.length > 0) {
        await api.put("/admin/settings", { settings: settingsToUpdate });
        setSuccess(t("admin.platformSettings.success.initialized", { count: settingsToUpdate.length }));
        fetchSettings();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t("admin.platformSettings.errors.initializeSettings"));
    } finally {
      setSaving(false);
    }
  };

  // Render functions for different input types
  const renderSettingInput = (setting: PlatformSetting) => {
    if (editingSetting === setting.key) {
      if (setting.type === "boolean") {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm"
          >
            <option value="true">{yesLabel}</option>
            <option value="false">{noLabel}</option>
          </select>
        );
      } else {
        return (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm flex-1"
            placeholder={valuePlaceholder}
          />
        );
      }
    } else {
      if (setting.type === "boolean") {
        return <span className={setting.value === "true" ? "text-green-600 font-medium" : "text-red-600"}>{setting.value === "true" ? yesLabel : noLabel}</span>;
      } else {
        return <span className="text-slate-900">{setting.value || notConfigured}</span>;
      }
    }
  };

  const renderBrandingInput = (setting: PlatformSetting) => {
    if (editingSetting === setting.key) {
      if (setting.key.includes('color')) {
        return (
          <input
            type="color"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-16 h-10 border border-slate-300 rounded cursor-pointer"
          />
        );
      }

      if (setting.key === 'custom_logo_url') {
        return (
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={t("admin.platformSettings.directUrlPlaceholder")}
              className="flex-1 px-3 py-1 border border-slate-300 rounded text-sm"
            />
          </div>
        );
      }

      if (setting.key === 'custom_css') {
        return (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={t("admin.platformSettings.cssPlaceholder")}
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono"
          />
        );
      }

      if (setting.key === 'default_language') {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm"
          >
            <option value="es">{t("settings.spanish")}</option>
            <option value="en">{t("settings.english")}</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="it">Italiano</option>
            <option value="pt">Português</option>
          </select>
        );
      }

      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="px-3 py-1 border border-slate-300 rounded text-sm flex-1"
          placeholder={valuePlaceholder}
        />
      );
    } else {
      if (setting.key.includes('color')) {
        return (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 border border-slate-300 rounded"
              style={{ backgroundColor: setting.value }}
            />
            <span className="text-sm font-mono text-slate-600">{setting.value}</span>
          </div>
        );
      }

      if (setting.key === 'custom_css') {
        return (
          <div className="max-w-xs">
            <span className="text-sm text-slate-600">
              {setting.value ? t("admin.platformSettings.cssChars", { count: setting.value.length }) : t("admin.platformSettings.noCustomCss")}
            </span>
          </div>
        );
      }

      return <span className="text-slate-900">{setting.value || notConfigured}</span>;
    }
  };

  const renderSecurityInput = (setting: PlatformSetting) => {
    if (editingSetting === setting.key) {
      if (setting.type === "number") {
        return (
          <input
            type="number"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm w-24"
            placeholder="0"
          />
        );
      }

      if (setting.type === "boolean") {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm"
          >
            <option value="true">{yesLabel}</option>
            <option value="false">{noLabel}</option>
          </select>
        );
      }

      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="px-3 py-1 border border-slate-300 rounded text-sm flex-1"
          placeholder={valuePlaceholder}
        />
      );
    } else {
      if (setting.type === "boolean") {
        return <span className={setting.value === "true" ? "text-green-600 font-medium" : "text-red-600"}>{setting.value === "true" ? yesLabel : noLabel}</span>;
      } else {
        return <span className="text-slate-900">{setting.value || notConfigured}</span>;
      }
    }
  };

  const renderEmailInput = (setting: PlatformSetting) => {
    if (editingSetting === setting.key) {
      if (setting.key.includes('password')) {
        return (
          <input
            type="password"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm flex-1"
            placeholder="••••••••"
          />
        );
      }

      if (setting.type === "number") {
        return (
          <input
            type="number"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm w-24"
            placeholder="0"
          />
        );
      }

      if (setting.key.includes('template')) {
        return (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={t("admin.platformSettings.emailTemplatePlaceholder")}
            rows={6}
            className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-xs"
          />
        );
      }

      if (setting.type === "boolean") {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm"
          >
            <option value="true">{yesLabel}</option>
            <option value="false">{noLabel}</option>
          </select>
        );
      }

      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="px-3 py-1 border border-slate-300 rounded text-sm flex-1"
          placeholder={valuePlaceholder}
        />
      );
    } else {
      if (setting.key.includes('password')) {
        return <span className="text-slate-600">••••••••</span>;
      }

      if (setting.key.includes('template')) {
        const preview = setting.value.length > 50 ? `${setting.value.substring(0, 50)}...` : setting.value;
        return (
          <div className="max-w-xs">
            <span className="text-sm text-slate-600 font-mono">
              {preview || t("admin.platformSettings.noTemplateConfigured")}
            </span>
          </div>
        );
      }

      if (setting.type === "boolean") {
        return <span className={setting.value === "true" ? "text-green-600 font-medium" : "text-red-600"}>{setting.value === "true" ? yesLabel : noLabel}</span>;
      } else {
        return <span className="text-slate-900">{setting.value || notConfigured}</span>;
      }
    }
  };

  const renderFileInput = (setting: PlatformSetting) => {
    if (editingSetting === setting.key) {
      if (setting.type === "number") {
        return (
          <input
            type="number"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm w-24"
            placeholder="0"
          />
        );
      }

      if (setting.key.includes('types') || setting.key.includes('formats')) {
        return (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm flex-1"
            placeholder="jpg,png,pdf"
          />
        );
      }

      if (setting.type === "boolean") {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm"
          >
            <option value="true">{yesLabel}</option>
            <option value="false">{noLabel}</option>
          </select>
        );
      }

      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="px-3 py-1 border border-slate-300 rounded text-sm flex-1"
          placeholder={valuePlaceholder}
        />
      );
    } else {
      if (setting.type === "boolean") {
        return <span className={setting.value === "true" ? "text-green-600 font-medium" : "text-red-600"}>{setting.value === "true" ? yesLabel : noLabel}</span>;
      } else {
        return <span className="text-slate-900">{setting.value || notConfigured}</span>;
      }
    }
  };

  const renderCvInput = (setting: PlatformSetting) => {
    if (editingSetting === setting.key) {
      if (setting.type === "number") {
        return (
          <input
            type="number"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm w-24"
            placeholder="0"
          />
        );
      }

      if (setting.key === 'default_cv_template') {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm"
          >
            <option value="minimal">{t("admin.platformSettings.options.template.minimal")}</option>
            <option value="sidebar">{t("admin.platformSettings.options.template.sidebar")}</option>
            <option value="corporate">{t("admin.platformSettings.options.template.corporate")}</option>
            <option value="executive">{t("admin.platformSettings.options.template.executive")}</option>
            <option value="timeline">{t("admin.platformSettings.options.template.timeline")}</option>
            <option value="compact">{t("admin.platformSettings.options.template.compact")}</option>
            <option value="creative">{t("admin.platformSettings.options.template.creative")}</option>
          </select>
        );
      }

      if (setting.key === 'pdf_compression_level') {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm"
          >
            <option value="low">{t("admin.platformSettings.options.compression.low")}</option>
            <option value="medium">{t("admin.platformSettings.options.compression.medium")}</option>
            <option value="high">{t("admin.platformSettings.options.compression.high")}</option>
          </select>
        );
      }

      if (setting.type === "boolean") {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm"
          >
            <option value="true">{yesLabel}</option>
            <option value="false">{noLabel}</option>
          </select>
        );
      }

      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="px-3 py-1 border border-slate-300 rounded text-sm flex-1"
          placeholder={valuePlaceholder}
        />
      );
    } else {
      if (setting.type === "boolean") {
        return <span className={setting.value === "true" ? "text-green-600 font-medium" : "text-red-600"}>{setting.value === "true" ? yesLabel : noLabel}</span>;
      } else {
        return <span className="text-slate-900">{setting.value || notConfigured}</span>;
      }
    }
  };

  const renderUserInput = (setting: PlatformSetting) => {
    if (editingSetting === setting.key) {
      if (setting.type === "number") {
        return (
          <input
            type="number"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm w-24"
            placeholder="0"
          />
        );
      }

      if (setting.key === 'default_user_role') {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm"
          >
            <option value="user">{t("admin.platformSettings.options.userRole.user")}</option>
            <option value="admin">{t("admin.platformSettings.options.userRole.admin")}</option>
          </select>
        );
      }

      if (setting.type === "boolean") {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm"
          >
            <option value="true">{yesLabel}</option>
            <option value="false">{noLabel}</option>
          </select>
        );
      }

      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="px-3 py-1 border border-slate-300 rounded text-sm flex-1"
          placeholder={valuePlaceholder}
        />
      );
    } else {
      if (setting.type === "boolean") {
        return <span className={setting.value === "true" ? "text-green-600 font-medium" : "text-red-600"}>{setting.value === "true" ? yesLabel : noLabel}</span>;
      } else {
        return <span className="text-slate-900">{setting.value || notConfigured}</span>;
      }
    }
  };

  const renderAnalyticsInput = (setting: PlatformSetting) => {
    if (editingSetting === setting.key) {
      if (setting.type === "number") {
        return (
          <input
            type="number"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm w-24"
            placeholder="0"
          />
        );
      }

      if (setting.key.includes('export_formats')) {
        return (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm flex-1"
            placeholder="csv,json,pdf"
          />
        );
      }

      if (setting.type === "boolean") {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm"
          >
            <option value="true">{yesLabel}</option>
            <option value="false">{noLabel}</option>
          </select>
        );
      }

      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="px-3 py-1 border border-slate-300 rounded text-sm flex-1"
          placeholder={valuePlaceholder}
        />
      );
    } else {
      if (setting.type === "boolean") {
        return <span className={setting.value === "true" ? "text-green-600 font-medium" : "text-red-600"}>{setting.value === "true" ? yesLabel : noLabel}</span>;
      } else {
        return <span className="text-slate-900">{setting.value || notConfigured}</span>;
      }
    }
  };

  const renderBackupInput = (setting: PlatformSetting) => {
    if (editingSetting === setting.key) {
      if (setting.type === "number") {
        return (
          <input
            type="number"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm w-24"
            placeholder="0"
          />
        );
      }

      if (setting.key === 'backup_frequency') {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm"
          >
            <option value="daily">{t("admin.platformSettings.options.backupFrequency.daily")}</option>
            <option value="weekly">{t("admin.platformSettings.options.backupFrequency.weekly")}</option>
            <option value="monthly">{t("admin.platformSettings.options.backupFrequency.monthly")}</option>
          </select>
        );
      }

      if (setting.key === 'maintenance_window_start') {
        return (
          <input
            type="time"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm"
          />
        );
      }

      if (setting.type === "boolean") {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded text-sm"
          >
            <option value="true">{yesLabel}</option>
            <option value="false">{noLabel}</option>
          </select>
        );
      }

      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="px-3 py-1 border border-slate-300 rounded text-sm flex-1"
          placeholder={valuePlaceholder}
        />
      );
    } else {
      if (setting.type === "boolean") {
        return <span className={setting.value === "true" ? "text-green-600 font-medium" : "text-red-600"}>{setting.value === "true" ? yesLabel : noLabel}</span>;
      } else {
        return <span className="text-slate-900">{setting.value || notConfigured}</span>;
      }
    }
  };

  // Define tabs configuration
  const tabs = [
    {
      id: "general",
      label: t("admin.platformSettings.tabsShort.general"),
      title: t("admin.platformSettings.tabs.general"),
      icon: Settings,
      settings: generalSettings,
      renderFunction: renderSettingInput
    },
    {
      id: "branding",
      label: t("admin.platformSettings.tabsShort.branding"),
      title: t("admin.platformSettings.tabs.branding"),
      icon: Palette,
      settings: brandingSettings,
      renderFunction: renderBrandingInput
    },
    {
      id: "security",
      label: t("admin.platformSettings.tabsShort.security"),
      title: t("admin.platformSettings.tabs.security"),
      icon: ShieldCheck,
      settings: securitySettings,
      renderFunction: renderSecurityInput
    },
    {
      id: "email",
      label: t("admin.platformSettings.tabsShort.email"),
      title: t("admin.platformSettings.tabs.email"),
      icon: Mail,
      settings: emailSettings,
      renderFunction: renderEmailInput
    },
    {
      id: "files",
      label: t("admin.platformSettings.tabsShort.files"),
      title: t("admin.platformSettings.tabs.files"),
      icon: Folder,
      settings: fileSettings,
      renderFunction: renderFileInput
    },
    {
      id: "cv",
      label: t("admin.platformSettings.tabsShort.cv"),
      title: t("admin.platformSettings.tabs.cv"),
      icon: FileText,
      settings: cvSettings,
      renderFunction: renderCvInput
    },
    {
      id: "users",
      label: t("admin.platformSettings.tabsShort.users"),
      title: t("admin.platformSettings.tabs.users"),
      icon: Users,
      settings: userSettings,
      renderFunction: renderUserInput
    },
    {
      id: "analytics",
      label: t("admin.platformSettings.tabsShort.analytics"),
      title: t("admin.platformSettings.tabs.analytics"),
      icon: BarChart3,
      settings: analyticsSettings,
      renderFunction: renderAnalyticsInput
    },
    {
      id: "backup",
      label: t("admin.platformSettings.tabsShort.backup"),
      title: t("admin.platformSettings.tabs.backup"),
      icon: Wrench,
      settings: backupSettings,
      renderFunction: renderBackupInput
    }
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  if (loading) {
    return (
      <div className="ui-card flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        <p className="ml-3 text-sm text-slate-500">{t("admin.platformSettings.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{t("admin.platformSettings.title")}</h1>
        <p className="text-slate-600 mt-2">{t("admin.platformSettings.subtitle")}</p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="ui-error-state" role="alert" aria-live="assertive">
          <p className="text-rose-800">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-2 text-sm text-rose-600 hover:underline"
          >
            {t("common.close")}
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800" role="status" aria-live="polite">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="ui-surface overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex overflow-x-auto" role="tablist" aria-label={t("admin.platformSettings.tabsAriaLabel", { defaultValue: "Platform settings categories" })}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                title={tab.title}
                id={`platform-settings-tab-${tab.id}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`platform-settings-panel-${tab.id}`}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-brand-500 text-brand-600 bg-brand-50"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <tab.icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div
          className="p-6"
          role="tabpanel"
          id={`platform-settings-panel-${activeTab}`}
          aria-labelledby={`platform-settings-tab-${activeTab}`}
        >
          {/* Initialize Default Settings */}
          {settings.length === 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 mb-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">{t("admin.platformSettings.initialConfig.title")}</h3>
              <p className="text-blue-700 mb-4">
                {t("admin.platformSettings.initialConfig.description")}
              </p>
              <button
                type="button"
                onClick={handleBulkSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? t("admin.platformSettings.initialConfig.initializing") : t("admin.platformSettings.initialConfig.initialize")}
              </button>
            </div>
          )}

          {/* Settings for Active Tab */}
          {activeTabData && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <activeTabData.icon className="h-6 w-6 text-slate-600" strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{activeTabData.title}</h2>
                  <p className="text-slate-600 text-sm">
                    {activeTabData.id === "general" && t("admin.platformSettings.tabDescriptions.general")}
                    {activeTabData.id === "branding" && t("admin.platformSettings.tabDescriptions.branding")}
                    {activeTabData.id === "security" && t("admin.platformSettings.tabDescriptions.security")}
                    {activeTabData.id === "email" && t("admin.platformSettings.tabDescriptions.email")}
                    {activeTabData.id === "files" && t("admin.platformSettings.tabDescriptions.files")}
                    {activeTabData.id === "cv" && t("admin.platformSettings.tabDescriptions.cv")}
                    {activeTabData.id === "users" && t("admin.platformSettings.tabDescriptions.users")}
                    {activeTabData.id === "analytics" && t("admin.platformSettings.tabDescriptions.analytics")}
                    {activeTabData.id === "backup" && t("admin.platformSettings.tabDescriptions.backup")}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {activeTabData.settings.map((defaultSetting) => {
                  const existingSetting = settings.find(s => s.key === defaultSetting.key);
                  const displaySetting: PlatformSetting = existingSetting ? existingSetting : {
                    ...defaultSetting,
                    id: `default-${defaultSetting.key}`,
                    isPublic: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };

                  return (
                    <div key={defaultSetting.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-slate-900">
                            {defaultSetting.key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">{getLocalizedDescription(defaultSetting.key, defaultSetting.description || "")}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <div className="min-w-0 flex-1 max-w-md">
                            {activeTabData.renderFunction(displaySetting)}
                          </div>
                          <div className="flex gap-2">
                            {editingSetting === defaultSetting.key ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSave(defaultSetting.key)}
                                  disabled={saving}
                                  className="px-3 py-1 bg-green-700 text-white rounded text-sm hover:bg-green-800 disabled:opacity-50"
                                >
                                  {saving ? "..." : t("common.save")}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancel}
                                  className="px-3 py-1 bg-slate-500 text-white rounded text-sm hover:bg-slate-600"
                                >
                                  {t("common.cancel")}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleEdit(displaySetting)}
                                className="px-3 py-1 bg-brand-600 text-white rounded text-sm hover:bg-brand-700"
                              >
                                {t("common.edit")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}