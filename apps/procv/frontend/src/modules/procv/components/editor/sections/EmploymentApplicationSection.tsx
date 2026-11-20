import React from "react";

type Values = Record<string, string>;

interface Props {
  data: Values;
  onChange: (data: Values) => void;
  isLoading?: boolean;
}

interface Field {
  key: string;
  label: string;
  multiline?: boolean;
  placeholder?: string;
}

/**
 * Fields that only the 1003 format asks for. Everything else (name, document,
 * contact, education, experience, skills, languages, references) comes from
 * the regular CV form, so nothing is typed twice.
 */
export const FORMAT_1003_GROUPS: Array<{ title: string; fields: Field[] }> = [
  {
    title: "Solicitud",
    fields: [
      { key: "positionRequested", label: "Cargo al que aspira" },
      { key: "vacancyCode", label: "Código de la vacante" },
      { key: "applicationDate", label: "Fecha de diligenciamiento", placeholder: "AAAA-MM-DD" },
      { key: "salaryExpectation", label: "Aspiración salarial" },
      { key: "vacancySource", label: "¿Cómo se enteró de la vacante?" },
      { key: "relocationAvailability", label: "Disponibilidad para trasladarse" },
      { key: "currentEmployment", label: "Situación laboral actual", multiline: true },
      { key: "previousCompanyRelation", label: "¿Ha trabajado antes en la empresa?", multiline: true },
      { key: "companyReferences", label: "Personas conocidas en la empresa", multiline: true },
    ],
  },
  {
    title: "Información personal",
    fields: [
      { key: "civilStatus", label: "Estado civil" },
      { key: "housingType", label: "Vivienda (propia, familiar, arrendada)" },
      { key: "documentAvailability", label: "Otros documentos (libreta militar, licencia de conducción…)", multiline: true },
      { key: "economicSectors", label: "Sectores económicos en los que ha trabajado", multiline: true },
      { key: "workAreas", label: "Áreas de desempeño", multiline: true },
      { key: "hobbies", label: "Aficiones", multiline: true },
      { key: "awards", label: "Reconocimientos", multiline: true },
    ],
  },
  {
    title: "Información familiar",
    fields: [
      { key: "partnerName", label: "Cónyuge o compañero(a)" },
      { key: "partnerOccupation", label: "Ocupación del cónyuge" },
      { key: "partnerCompany", label: "Empresa del cónyuge" },
      { key: "partnerPhone", label: "Teléfono del cónyuge" },
      { key: "dependants", label: "Personas a cargo: nombre, parentesco y edad", multiline: true },
      { key: "fatherDetails", label: "Padre: nombre, ocupación y contacto", multiline: true },
      { key: "motherDetails", label: "Madre: nombre, ocupación y contacto", multiline: true },
      { key: "siblings", label: "Hermanos", multiline: true },
      { key: "emergencyContact", label: "Contacto de emergencia: nombre, parentesco y teléfono", multiline: true },
    ],
  },
  {
    title: "Seguridad social y finanzas",
    fields: [
      { key: "healthProvider", label: "EPS" },
      { key: "pensionFund", label: "Fondo de pensiones" },
      { key: "severanceFund", label: "Fondo de cesantías" },
      { key: "additionalIncome", label: "Otros ingresos", multiline: true },
      { key: "financialObligations", label: "Obligaciones económicas", multiline: true },
    ],
  },
];

const inputClass =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

/**
 * Fields of the Colombian public-sector form (Formato Único de Hoja de Vida,
 * Función Pública / Ley 190 de 1995) that the regular CV form does not have.
 */
export const FORMAT_DAFP_GROUPS: Array<{ title: string; fields: Field[] }> = [
  {
    title: "Datos personales",
    fields: [
      { key: "dafpFirstSurname", label: "Primer apellido" },
      { key: "dafpSecondSurname", label: "Segundo apellido" },
      { key: "dafpGivenNames", label: "Nombres" },
      { key: "dafpSex", label: "Sexo (F/M)", placeholder: "F o M" },
      { key: "dafpBirthPlace", label: "Lugar de nacimiento (municipio, departamento, país)" },
      { key: "dafpMilitaryCard", label: "Libreta militar: clase, número y distrito (si aplica)" },
    ],
  },
  {
    title: "Educación básica y media",
    fields: [
      { key: "dafpLastGrade", label: "Último grado aprobado (1 a 11)" },
      { key: "dafpSchoolTitle", label: "Título obtenido" },
      { key: "dafpSchoolDate", label: "Fecha de grado (mes y año)" },
      { key: "dafpProfessionalCard", label: "Número de tarjeta o matrícula profesional (si aplica)" },
    ],
  },
  {
    title: "Tiempo total de experiencia",
    fields: [
      { key: "dafpTimePublic", label: "Como servidor público (años y meses)" },
      { key: "dafpTimePrivate", label: "En el sector privado (años y meses)" },
      { key: "dafpTimeIndependent", label: "Como trabajador independiente (años y meses)" },
    ],
  },
  {
    title: "Declaración y firma",
    fields: [
      { key: "dafpIneligible", label: "¿Está incurso en causales de inhabilidad o incompatibilidad? (Sí/No)", placeholder: "No" },
      { key: "dafpSignPlace", label: "Lugar de diligenciamiento" },
      { key: "dafpSignDate", label: "Fecha de diligenciamiento", placeholder: "AAAA-MM-DD" },
    ],
  },
];

interface ExtraFieldsProps extends Props {
  id: string;
  title: string;
  intro: string;
  groups: Array<{ title: string; fields: Field[] }>;
}

/** Template-specific fields shown inside "Datos personales" while that template is active. */
export const TemplateExtraFields: React.FC<ExtraFieldsProps> = ({ id, title, intro, groups, data, onChange, isLoading = false }) => {
  const update = (key: string, value: string) => onChange({ ...data, [key]: value });
  return (
    <section aria-labelledby={id} className="mt-8 rounded-xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-900 dark:bg-brand-950/20">
      <h3 id={id} className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{intro}</p>
      {groups.map((group, index) => (
        <details key={group.title} open={index === 0} className="group mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-100">{group.title}</summary>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            {group.fields.map((field) => (
              <label key={field.key} className={`block text-sm font-medium text-slate-700 dark:text-slate-200 ${field.multiline ? "md:col-span-2" : ""}`}>
                <span>{field.label}</span>
                {field.multiline ? (
                  <textarea value={data[field.key] || ""} disabled={isLoading} rows={2} onChange={(e) => update(field.key, e.target.value)} className={inputClass} placeholder="Opcional" />
                ) : (
                  <input value={data[field.key] || ""} disabled={isLoading} onChange={(e) => update(field.key, e.target.value)} className={inputClass} placeholder={field.placeholder || "Opcional"} />
                )}
              </label>
            ))}
          </div>
        </details>
      ))}
    </section>
  );
};

/** Extra fields of the 1003 template, shown inside "Datos personales" only while that template is active. */
export const Format1003Fields: React.FC<Props> = (props) => (
  <TemplateExtraFields
    {...props}
    id="formato-1003"
    title="Datos del formato 1003"
    intro="Tus datos personales, educación, experiencia y referencias ya se toman del resto del formulario. Aquí solo van los datos propios de este formato. Todos son opcionales."
    groups={FORMAT_1003_GROUPS}
  />
);

/** Extra fields of the Función Pública (DAFP) template. */
export const FormatDafpFields: React.FC<Props> = (props) => (
  <TemplateExtraFields
    {...props}
    id="formato-dafp"
    title="Datos del formato de Función Pública"
    intro="Tu educación superior, idiomas y experiencia laboral se toman del resto del formulario. Aquí van los datos que exige el Formato Único de Hoja de Vida y que el formulario normal no tiene. Si no llenas los apellidos por separado, se usa tu nombre completo."
    groups={FORMAT_DAFP_GROUPS}
  />
);
