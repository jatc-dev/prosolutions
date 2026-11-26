/**
 * References: work (laboral), personal and family (familiar). Shared by the
 * editor, every template, the official forms and the Word export so they all
 * show the same fields with the same names.
 */
export type ReferenceType = "laboral" | "personal" | "familiar";

export const REFERENCE_TYPES: ReferenceType[] = ["laboral", "personal", "familiar"];

export interface ReferenceLike {
  id: string;
  isVisible?: boolean;
  hiddenFields?: string[];
  type?: string;
  name?: string;
  position?: string;
  company?: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

export const REFERENCE_TYPE_LABELS: Record<ReferenceType, { one: string; group: string; add: string }> = {
  laboral: { one: "Laboral", group: "Referencias laborales", add: "Laboral" },
  personal: { one: "Personal", group: "Referencias personales", add: "Personal" },
  familiar: { one: "Familiar", group: "Referencias familiares", add: "Familiar" },
};

/** Fields each type asks for, besides name, phone and email. */
export const REFERENCE_FIELDS: Record<ReferenceType, Array<{ key: "position" | "company" | "relationship"; label: string; placeholder: string }>> = {
  laboral: [
    { key: "position", label: "Cargo", placeholder: "Ej.: Jefe de ventas" },
    { key: "company", label: "Empresa", placeholder: "Ej.: Almacenes Éxito" },
  ],
  personal: [
    { key: "position", label: "Ocupación", placeholder: "Ej.: Contadora" },
    { key: "relationship", label: "Relación", placeholder: "Ej.: Amiga, vecina, docente" },
  ],
  familiar: [
    { key: "relationship", label: "Parentesco", placeholder: "Ej.: Tía, hermano" },
    { key: "position", label: "Ocupación", placeholder: "Ej.: Docente" },
  ],
};

export const REFERENCES_ON_REQUEST_TEXT = "Referencias laborales y personales disponibles a solicitud.";

export function normalizeReferenceType(type: unknown): ReferenceType {
  return type === "laboral" || type === "familiar" ? type : "personal";
}

const shown = (item: ReferenceLike, field: string) => !(item.hiddenFields || []).includes(field);
const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Cargo/empresa, ocupación/relación or parentesco/ocupación, as shown on the CV. */
export function referenceDetails(item: ReferenceLike): string[] {
  const type = normalizeReferenceType(item.type);
  const values = REFERENCE_FIELDS[type]
    .filter((field) => shown(item, field.key))
    .map((field) => clean(item[field.key]));
  // Older personal references stored the relationship in both fields.
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

export function referenceContact(item: ReferenceLike): string[] {
  return [shown(item, "phone") ? clean(item.phone) : "", shown(item, "email") ? clean(item.email) : ""].filter(Boolean);
}

export function referenceName(item: ReferenceLike): string {
  return shown(item, "name") ? clean(item.name) : "";
}

/** References with something to show. */
export function visibleReferences<T extends ReferenceLike>(items: T[] | undefined): T[] {
  return (items || []).filter(
    (item) => item && item.isVisible !== false && Boolean(referenceName(item) || referenceDetails(item).length || referenceContact(item).length),
  );
}

/** Visible references by type, in the order laboral, personal, familiar. */
export function groupReferences<T extends ReferenceLike>(items: T[] | undefined): Array<{ type: ReferenceType; label: string; items: T[] }> {
  const visible = visibleReferences(items);
  return REFERENCE_TYPES.map((type) => ({
    type,
    label: REFERENCE_TYPE_LABELS[type].group,
    items: visible.filter((item) => normalizeReferenceType(item.type) === type),
  })).filter((group) => group.items.length > 0);
}
