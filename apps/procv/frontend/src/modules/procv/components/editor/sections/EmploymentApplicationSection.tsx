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

/** Extra fields of the 1003 template, shown inside "Datos personales" only while that template is active. */
export const Format1003Fields: React.FC<Props> = ({ data, onChange, isLoading = false }) => {
  const update = (key: string, value: string) => onChange({ ...data, [key]: value });
  return (
    <section aria-labelledby="formato-1003" className="mt-8 rounded-xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-900 dark:bg-brand-950/20">
      <h3 id="formato-1003" className="text-base font-semibold text-slate-900 dark:text-slate-100">Datos del formato 1003</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Tus datos personales, educación, experiencia y referencias ya se toman del resto del formulario. Aquí solo van los datos propios de este formato. Todos son opcionales.
      </p>
      {FORMAT_1003_GROUPS.map((group) => (
        <details key={group.title} open={group.title === "Solicitud"} className="group mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
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
