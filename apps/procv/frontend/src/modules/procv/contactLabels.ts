/**
 * How emails and phones are introduced in the CV templates.
 *   label: "Correo personal: ana@…"   icon: ✉ ana@…   none: ana@…
 */
export type ContactLabelStyle = "label" | "icon" | "none";
export type ContactKind = "email" | "phone";

export const CONTACT_LABEL_STYLES: Array<{ value: ContactLabelStyle; label: string; hint: string }> = [
  { value: "label", label: "Con etiqueta", hint: "Correo personal: ana@correo.com" },
  { value: "icon", label: "Con icono", hint: "Un icono de sobre o teléfono antes del dato" },
  { value: "none", label: "Solo el dato", hint: "ana@correo.com" },
];

const EMAIL_LABELS: Record<string, string> = {
  personal: "Correo personal",
  work: "Correo laboral",
  education: "Correo institucional",
  other: "Correo",
};

const PHONE_LABELS: Record<string, string> = {
  personal: "Teléfono personal",
  office: "Teléfono de oficina",
  home: "Teléfono fijo",
  whatsapp: "WhatsApp",
  other: "Teléfono",
};

/** Descriptive label for an email or phone type ("Correo laboral", "WhatsApp"…). */
export function contactLabel(kind: ContactKind, type?: string): string {
  const labels = kind === "email" ? EMAIL_LABELS : PHONE_LABELS;
  return labels[String(type || "other")] ?? labels.other!;
}

export function normalizeContactLabelStyle(value?: string): ContactLabelStyle {
  return value === "icon" || value === "none" ? value : "label";
}
