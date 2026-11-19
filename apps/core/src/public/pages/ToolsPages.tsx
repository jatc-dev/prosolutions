import { useId, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AdSlot, APP_URLS } from "@prosolutions/ui";
import { TOOLS, getTool, type ToolSlug } from "../../content/tools";
import { evaluateCv } from "../../lib/cvCheck";
import { compareEmploymentVsServices } from "../../lib/payroll/ops";
import { ARL_RATES, paramsFor, type RiskClass } from "../../lib/payroll/params";
import { calculateEmployerCost, calculateNetSalary } from "../../lib/payroll/salary";
import { calculateSettlement, type ContractType, type SettlementResult, type TerminationReason } from "../../lib/payroll/settlement";
import { PublicLayout, formatDate } from "../PublicLayout";
import { headForPath, useDocumentHead } from "../seo";

const PARAMS = paramsFor();
const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const formatMoney = (value: number) => money.format(Math.round(value));
const formatPercent = (value: number) => `${(value * 100).toLocaleString("es-CO", { maximumFractionDigits: 3 })}%`;

/** Parses "4.500.000", "4,500,000" or "4500000" as pesos. */
export function parseMoney(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

const inputClass =
  "mt-1 block w-full rounded-ui-md border border-ui-border bg-ui-surface px-3 py-2 text-ui-text shadow-sm focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-focus";

function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ui-text">{label}</label>
      {children(id)}
      {hint && <p className="mt-1 text-xs text-ui-subtle">{hint}</p>}
    </div>
  );
}

function MoneyInput({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          className={inputClass}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            const amount = parseMoney(value);
            onChange(amount ? amount.toLocaleString("es-CO") : "");
          }}
        />
      )}
    </Field>
  );
}

function RiskSelect({ value, onChange }: { value: RiskClass; onChange: (value: RiskClass) => void }) {
  return (
    <Field label="Clase de riesgo ARL" hint="Clase I: oficinas. Clase V: actividades de alto riesgo.">
      {(id) => (
        <select id={id} className={inputClass} value={value} onChange={(event) => onChange(event.target.value as RiskClass)}>
          {(Object.keys(ARL_RATES) as RiskClass[]).map((risk) => (
            <option key={risk} value={risk}>
              Clase {risk} ({formatPercent(ARL_RATES[risk])})
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

function Rows({ rows, total }: { rows: Array<[string, number, string?]>; total?: [string, number] }) {
  return (
    <dl className="divide-y divide-ui-border text-sm">
      {rows.map(([label, value, note]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 py-2">
          <dt className="text-ui-muted">
            {label}
            {note && <span className="block text-xs text-ui-subtle">{note}</span>}
          </dt>
          <dd className="tabular-nums text-ui-text">{formatMoney(value)}</dd>
        </div>
      ))}
      {total && (
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="font-semibold text-ui-text">{total[0]}</dt>
          <dd className="text-lg font-bold tabular-nums text-ui-text">{formatMoney(total[1])}</dd>
        </div>
      )}
    </dl>
  );
}

function ResultCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-ui-lg border border-ui-border bg-ui-surface p-5 shadow-card">
      <h2 className="text-base font-semibold text-ui-text">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

interface ToolShellProps {
  slug: ToolSlug;
  form: ReactNode;
  results: ReactNode | null;
  formula: ReactNode;
  disclaimer?: ReactNode;
}

/**
 * Common frame for every calculator: title, normative update date, the form,
 * results, one ad unit after the results (never next to inputs or buttons),
 * the formula explanation and the legal disclaimer.
 */
function ToolShell({ slug, form, results, formula, disclaimer }: ToolShellProps) {
  const tool = getTool(slug)!;
  useDocumentHead(headForPath(`/tools/${slug}`));
  return (
    <PublicLayout breadcrumbs={[{ name: "Herramientas", path: "/tools" }, { name: tool.shortTitle, path: `/tools/${slug}` }]}>
      <div className="mx-auto max-w-5xl px-4 pb-12 pt-8 sm:px-6">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold text-ui-accent">ProTools · Gratis y sin registro</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ui-text sm:text-4xl">{tool.title}</h1>
          <p className="mt-3 text-lg leading-8 text-ui-muted">{tool.description}</p>
          <p className="mt-3 inline-flex rounded-full border border-ui-border bg-ui-soft px-3 py-1 text-xs text-ui-muted">
            Actualización normativa: <time dateTime={tool.updatedAt} className="ml-1 font-medium text-ui-text">{formatDate(tool.updatedAt)}</time>
          </p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <form className="space-y-4 self-start rounded-ui-lg border border-ui-border bg-ui-surface p-5 shadow-card" onSubmit={(event) => event.preventDefault()} noValidate>
            {form}
          </form>
          <div aria-live="polite" className="space-y-4">
            {results ?? (
              <p className="rounded-ui-lg border border-dashed border-ui-border p-6 text-sm text-ui-muted">
                Completa los datos para ver el resultado. El cálculo se hace en tu navegador: no guardamos lo que escribes.
              </p>
            )}
          </div>
        </div>

        {results && <AdSlot placement="tools-result" format="in-article" className="mt-10" />}

        <section aria-labelledby="formula" className="mt-10 max-w-3xl">
          <h2 id="formula" className="text-xl font-semibold text-ui-text">Cómo se calcula</h2>
          <div className="mt-3 space-y-3 text-[15px] leading-7 text-ui-text">{formula}</div>
        </section>

        <aside className="mt-8 max-w-3xl rounded-ui-lg border border-ui-border bg-ui-soft p-4 text-sm leading-6 text-ui-muted">
          <strong className="text-ui-text">Aviso legal.</strong>{" "}
          {disclaimer ??
            "Esta herramienta es informativa y usa los parámetros vigentes en la fecha de actualización indicada. No constituye asesoría legal, laboral, contable ni tributaria, y no reemplaza la liquidación oficial de tu empleador, tu fondo o un profesional. Verifica tu caso concreto antes de tomar decisiones."}{" "}
          Consulta los <Link to="/legal/terminos/" className="underline">términos de uso</Link>.
        </aside>
      </div>
    </PublicLayout>
  );
}

const paramsNote = (
  <p className="text-sm text-ui-muted">
    Parámetros {PARAMS.year}: salario mínimo {formatMoney(PARAMS.smmlv)}, auxilio de transporte {formatMoney(PARAMS.transportAllowance)} y UVT{" "}
    {formatMoney(PARAMS.uvt)}. Fuentes: {PARAMS.sources.join("; ")}.
  </p>
);

export function NetSalaryToolPage() {
  const [salary, setSalary] = useState("");
  const [other, setOther] = useState("");
  const [integral, setIntegral] = useState(false);
  const [risk, setRisk] = useState<RiskClass>("I");
  const [exempt, setExempt] = useState(true);
  const amount = parseMoney(salary);
  const otherAmount = parseMoney(other);

  const result = useMemo(() => {
    if (amount <= 0) return null;
    return {
      net: calculateNetSalary({ monthlySalary: amount, otherSalaryIncome: otherAmount, integralSalary: integral }),
      employer: calculateEmployerCost({ monthlySalary: amount + otherAmount, riskClass: risk, exempt114_1: exempt, integralSalary: integral }),
    };
  }, [amount, otherAmount, integral, risk, exempt]);

  const integralTooLow = integral && amount > 0 && amount < 13 * PARAMS.smmlv;

  return (
    <ToolShell
      slug="salario-neto"
      form={
        <>
          <MoneyInput label="Salario básico mensual (COP)" hint="Ejemplo: 3.500.000" value={salary} onChange={setSalary} />
          <MoneyInput label="Otros pagos salariales mensuales (opcional)" hint="Comisiones, horas extra o recargos habituales." value={other} onChange={setOther} />
          <label className="flex items-start gap-2 text-sm text-ui-text">
            <input type="checkbox" className="mt-1" checked={integral} onChange={(event) => setIntegral(event.target.checked)} />
            Salario integral (mínimo 13 salarios mínimos)
          </label>
          {integralTooLow && <p className="text-xs text-ui-warning">El salario integral debe ser de al menos {formatMoney(13 * PARAMS.smmlv)}.</p>}
          <fieldset className="space-y-3 border-t border-ui-border pt-4">
            <legend className="pt-2 text-sm font-semibold text-ui-text">Para el costo del empleador</legend>
            <RiskSelect value={risk} onChange={setRisk} />
            <label className="flex items-start gap-2 text-sm text-ui-text">
              <input type="checkbox" className="mt-1" checked={exempt} onChange={(event) => setExempt(event.target.checked)} />
              El empleador está exonerado de salud, SENA e ICBF (art. 114-1 E.T.; aplica a personas jurídicas y salarios menores a 10 SMMLV)
            </label>
          </fieldset>
        </>
      }
      results={
        result && (
          <>
            <ResultCard title="Lo que recibe el trabajador cada mes">
              <Rows
                rows={[
                  ["Salario y pagos salariales", result.net.grossSalary],
                  ...(result.net.transportAllowance > 0 ? [["Auxilio de transporte", result.net.transportAllowance] as [string, number]] : []),
                  ["Salud (4%)", -result.net.health],
                  ["Pensión (4%)", -result.net.pension],
                  ...(result.net.solidarityFund > 0
                    ? [[`Fondo de Solidaridad Pensional (${formatPercent(result.net.solidarityFundRate)})`, -result.net.solidarityFund] as [string, number]]
                    : []),
                  ["Retención en la fuente estimada", -result.net.withholding.withholding, "Procedimiento 1, sin deducciones adicionales"],
                ]}
                total={["Neto a recibir", result.net.netPay]}
              />
            </ResultCard>
            <ResultCard title="Lo que le cuesta al empleador cada mes">
              <Rows
                rows={[
                  ["Salario", result.employer.salary],
                  ...(result.employer.transportAllowance > 0 ? [["Auxilio de transporte", result.employer.transportAllowance] as [string, number]] : []),
                  ["Salud (8,5%)", result.employer.contributions.health, exempt && result.employer.contributions.health === 0 ? "Exonerado" : undefined],
                  ["Pensión (12%)", result.employer.contributions.pension],
                  [`ARL clase ${risk}`, result.employer.contributions.arl],
                  ["Caja de compensación (4%)", result.employer.contributions.compensationFund],
                  ["ICBF (3%) y SENA (2%)", result.employer.contributions.icbf + result.employer.contributions.sena],
                  ["Provisión de prima", result.employer.provisions.prima],
                  ["Provisión de cesantías", result.employer.provisions.severance],
                  ["Provisión de intereses a las cesantías", result.employer.provisions.severanceInterest],
                  ["Provisión de vacaciones", result.employer.provisions.vacation],
                ]}
                total={["Costo total mensual", result.employer.totalMonthlyCost]}
              />
              <p className="mt-2 text-xs text-ui-subtle">Costo anual estimado: {formatMoney(result.employer.totalAnnualCost)}. No incluye dotación ni beneficios extralegales.</p>
            </ResultCard>
          </>
        )
      }
      formula={
        <>
          <p>
            <strong>Aportes del trabajador:</strong> salud 4% y pensión 4% sobre el ingreso base de cotización (IBC), que es el salario devengado (70% si es integral) y nunca menos de un salario mínimo. Si el IBC es de 4 salarios mínimos o más se suma el Fondo de Solidaridad Pensional: 1% entre 4 y 16 SMMLV, y de 1,2% a 2% por encima de 16 SMMLV (Ley 797 de 2003).
          </p>
          <p>
            <strong>Retención en la fuente:</strong> al ingreso laboral se restan los aportes obligatorios; del resultado, el 25% es renta exenta (con un tope de 790 UVT al año) y la suma de rentas exentas y deducciones no puede superar el 40% del ingreso ni 1.340 UVT anuales. La base se convierte a UVT y se aplica la tabla del artículo 383 del Estatuto Tributario. Si tienes dependientes, medicina prepagada o intereses de vivienda, tu retención real puede ser menor.
          </p>
          <p>
            <strong>Auxilio de transporte:</strong> se paga a quienes devengan hasta dos salarios mínimos; no es base de aportes, pero sí de prima y cesantías.
          </p>
          <p>
            <strong>Costo del empleador:</strong> pensión 12%, ARL según la clase de riesgo, caja de compensación 4% y, cuando no aplica la exoneración del artículo 114-1 del Estatuto Tributario, salud 8,5%, ICBF 3% y SENA 2%. Se suman las provisiones mensuales de prima (8,33%), cesantías (8,33%), intereses (1% mensual sobre las cesantías) y vacaciones (4,17% del salario).
          </p>
          {paramsNote}
        </>
      }
    />
  );
}

const CONTRACT_LABELS: Record<ContractType, string> = { indefinido: "Término indefinido", fijo: "Término fijo", obra: "Obra o labor" };
const REASON_LABELS: Record<TerminationReason, string> = {
  renuncia: "Renuncia del trabajador",
  "justa-causa": "Despido con justa causa",
  "sin-justa-causa": "Despido sin justa causa",
  "fin-contrato": "Terminación por vencimiento del plazo o fin de la obra",
};

export function SettlementToolPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [salary, setSalary] = useState("");
  const [variable, setVariable] = useState("");
  const [contractType, setContractType] = useState<ContractType>("indefinido");
  const [reason, setReason] = useState<TerminationReason>("renuncia");
  const [vacationTaken, setVacationTaken] = useState("");
  const [agreedEnd, setAgreedEnd] = useState("");
  const [severancePaidUntil, setSeverancePaidUntil] = useState("");

  const { result, error } = useMemo((): { result: SettlementResult | null; error: string | null } => {
    const amount = parseMoney(salary);
    if (!startDate || !endDate || amount <= 0) return { result: null, error: null };
    try {
      return {
        result: calculateSettlement({
          startDate,
          endDate,
          monthlySalary: amount,
          variableMonthly: parseMoney(variable),
          contractType,
          reason,
          vacationDaysTaken: Number(vacationTaken) || 0,
          agreedEndDate: contractType !== "indefinido" && agreedEnd ? agreedEnd : undefined,
          severancePaidUntil: severancePaidUntil || undefined,
        }),
        error: null,
      };
    } catch (caught) {
      return { result: null, error: caught instanceof Error ? caught.message : "Revisa los datos ingresados." };
    }
  }, [startDate, endDate, salary, variable, contractType, reason, vacationTaken, agreedEnd, severancePaidUntil]);

  return (
    <ToolShell
      slug="liquidacion"
      form={
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha de ingreso">{(id) => <input id={id} type="date" className={inputClass} value={startDate} onChange={(event) => setStartDate(event.target.value)} />}</Field>
            <Field label="Fecha de retiro">{(id) => <input id={id} type="date" className={inputClass} value={endDate} onChange={(event) => setEndDate(event.target.value)} />}</Field>
          </div>
          <MoneyInput label="Salario básico mensual (COP)" value={salary} onChange={setSalary} />
          <MoneyInput label="Promedio mensual de pagos variables (opcional)" hint="Comisiones u horas extra habituales." value={variable} onChange={setVariable} />
          <Field label="Tipo de contrato">
            {(id) => (
              <select id={id} className={inputClass} value={contractType} onChange={(event) => setContractType(event.target.value as ContractType)}>
                {(Object.keys(CONTRACT_LABELS) as ContractType[]).map((key) => (
                  <option key={key} value={key}>{CONTRACT_LABELS[key]}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Motivo de terminación">
            {(id) => (
              <select id={id} className={inputClass} value={reason} onChange={(event) => setReason(event.target.value as TerminationReason)}>
                {(Object.keys(REASON_LABELS) as TerminationReason[]).map((key) => (
                  <option key={key} value={key}>{REASON_LABELS[key]}</option>
                ))}
              </select>
            )}
          </Field>
          {contractType !== "indefinido" && reason === "sin-justa-causa" && (
            <Field label="Fecha de terminación pactada" hint="Fin del plazo del contrato fijo o fecha estimada de terminación de la obra.">
              {(id) => <input id={id} type="date" className={inputClass} value={agreedEnd} onChange={(event) => setAgreedEnd(event.target.value)} />}
            </Field>
          )}
          <Field label="Días de vacaciones ya disfrutados" hint="Días hábiles tomados durante toda la relación laboral.">
            {(id) => <input id={id} type="number" min={0} className={inputClass} value={vacationTaken} onChange={(event) => setVacationTaken(event.target.value)} />}
          </Field>
          <Field label="Cesantías consignadas hasta (opcional)" hint="Si lo dejas vacío, se asume que están pagadas hasta el 31 de diciembre del año anterior.">
            {(id) => <input id={id} type="date" className={inputClass} value={severancePaidUntil} onChange={(event) => setSeverancePaidUntil(event.target.value)} />}
          </Field>
        </>
      }
      results={
        error ? (
          <p role="alert" className="rounded-ui-lg border border-ui-danger p-4 text-sm text-ui-danger">{error}</p>
        ) : (
          result && (
            <ResultCard title="Liquidación estimada">
              <Rows
                rows={[
                  ["Cesantías", result.severance.amount, `${result.severance.days} días`],
                  ["Intereses a las cesantías (12% anual)", result.severanceInterest.amount],
                  ["Prima de servicios", result.prima.amount, `${result.prima.days} días del semestre`],
                  ["Vacaciones no disfrutadas", result.vacation.amount, `${result.vacation.daysOwed.toLocaleString("es-CO")} días pendientes`],
                  ...(result.indemnity.applies ? [["Indemnización", result.indemnity.amount, result.indemnity.explanation] as [string, number, string]] : []),
                ]}
                total={["Total estimado", result.total]}
              />
              <p className="mt-2 text-xs text-ui-subtle">
                Tiempo de servicio: {result.daysWorked.toLocaleString("es-CO")} días (calendario comercial de 360 días). Base de prestaciones: {formatMoney(result.base.prestacionesBase)}
                {result.base.transportAllowance > 0 ? " (incluye auxilio de transporte)" : ""}.
              </p>
              {!result.indemnity.applies && <p className="mt-2 text-xs text-ui-subtle">{result.indemnity.explanation}</p>}
            </ResultCard>
          )
        )
      }
      formula={
        <>
          <p>
            <strong>Cesantías:</strong> (salario + auxilio de transporte) × días trabajados ÷ 360, solo por el periodo aún no consignado al fondo. <strong>Intereses:</strong> cesantías × días × 12% ÷ 360.
          </p>
          <p>
            <strong>Prima:</strong> (salario + auxilio de transporte) × días trabajados en el semestre ÷ 360. Se paga por semestres (enero–junio y julio–diciembre).
          </p>
          <p>
            <strong>Vacaciones:</strong> 15 días hábiles por cada año de servicio, proporcionales al tiempo trabajado, menos los días ya disfrutados, pagados con el salario sin auxilio de transporte.
          </p>
          <p>
            <strong>Indemnización (art. 64 CST)</strong>, solo si el empleador termina sin justa causa: en contrato indefinido, 30 días de salario por el primer año y 20 por cada año adicional (20 y 15 días si el salario es de 10 SMMLV o más); en contrato fijo, los salarios del tiempo que faltaba para el vencimiento; en obra o labor, el tiempo faltante con un mínimo de 15 días.
          </p>
          <p>El cálculo usa el calendario comercial de 360 días y no incluye salarios pendientes del último periodo, sanciones por mora ni descuentos autorizados.</p>
          {paramsNote}
        </>
      }
    />
  );
}

export function OpsToolPage() {
  const [salary, setSalary] = useState("");
  const [fee, setFee] = useState("");
  const [risk, setRisk] = useState<RiskClass>("I");
  const salaryAmount = parseMoney(salary);
  const feeAmount = parseMoney(fee);

  const result = useMemo(() => {
    if (salaryAmount <= 0) return null;
    return compareEmploymentVsServices({ salary: salaryAmount, fee: feeAmount || salaryAmount, riskClass: risk });
  }, [salaryAmount, feeAmount, risk]);

  return (
    <ToolShell
      slug="contrato-vs-prestacion"
      form={
        <>
          <MoneyInput label="Salario mensual con contrato laboral (COP)" value={salary} onChange={setSalary} />
          <MoneyInput label="Honorarios mensuales en prestación de servicios (COP)" hint="Si lo dejas vacío, se usa el mismo valor del salario." value={fee} onChange={setFee} />
          <RiskSelect value={risk} onChange={setRisk} />
        </>
      }
      results={
        result && (
          <>
            <ResultCard title="Contrato laboral: valor mensual para el trabajador">
              <Rows
                rows={[
                  ["Salario neto (después de aportes y retención)", result.employment.netMonthly],
                  ["Prima, cesantías e intereses (promedio mensual)", result.employment.prestacionesMonthly],
                  ["Vacaciones pagadas (promedio mensual)", result.employment.vacationMonthly],
                ]}
                total={["Valor total mensual", result.employment.totalMonthlyValue]}
              />
            </ResultCard>
            <ResultCard title="Prestación de servicios: lo que te queda cada mes">
              <Rows
                rows={[
                  ["Honorarios", feeAmount || salaryAmount],
                  ["Salud (12,5% del IBC)", -result.services.health, `IBC: ${formatMoney(result.services.contributionBase)} (40% de los honorarios)`],
                  ["Pensión (16% del IBC)", -result.services.pension],
                  ...(result.services.solidarityFund > 0 ? [["Fondo de Solidaridad Pensional", -result.services.solidarityFund] as [string, number]] : []),
                  [`ARL clase ${risk}`, -result.services.arl],
                  ["Retención en la fuente estimada", -result.services.withholding],
                ]}
                total={["Neto mensual", result.services.netMonthly]}
              />
            </ResultCard>
            <ResultCard title="Comparación">
              <p className="text-sm leading-6 text-ui-text">
                {result.difference >= 0
                  ? `Con estos honorarios recibirías ${formatMoney(result.difference)} más al mes que con el contrato laboral.`
                  : `Con estos honorarios recibirías ${formatMoney(-result.difference)} menos al mes que con el contrato laboral.`}{" "}
                Para igualar el contrato laboral necesitarías honorarios de aproximadamente <strong>{formatMoney(result.equivalentFee)}</strong> al mes.
              </p>
              <p className="mt-2 text-xs text-ui-subtle">La prestación de servicios no incluye vacaciones pagadas, estabilidad ni indemnización por despido.</p>
            </ResultCard>
          </>
        )
      }
      formula={
        <>
          <p>
            <strong>Contrato laboral:</strong> salario neto (después de salud 4%, pensión 4%, Fondo de Solidaridad si aplica y retención estimada) más el promedio mensual de prima (8,33%), cesantías (8,33%), intereses sobre cesantías y vacaciones (4,17%).
          </p>
          <p>
            <strong>Prestación de servicios:</strong> el contratista cotiza sobre un ingreso base de cotización (IBC) del 40% de sus honorarios mensuales, nunca inferior a un salario mínimo: 12,5% en salud, 16% en pensión, Fondo de Solidaridad si el IBC supera 4 SMMLV y ARL según el riesgo. La retención se estima con la tabla del artículo 383 del Estatuto Tributario aplicable a rentas de trabajo; tu pagador puede usar otra tarifa según tu situación.
          </p>
          <p>
            <strong>Honorarios equivalentes:</strong> buscamos el valor de honorarios cuyo neto mensual iguala el valor total mensual del contrato laboral.
          </p>
          <p>
            Si en la práctica cumples horario, recibes órdenes y usas los medios de la empresa, podría tratarse de una relación laboral encubierta. Lee más en{" "}
            <Link to="/academy/salarios-prestaciones-contratos-colombia/" className="underline">nuestra guía sobre contratos</Link>.
          </p>
          {paramsNote}
        </>
      }
    />
  );
}

export function CvCheckToolPage() {
  const [text, setText] = useState("");
  const [keywords, setKeywords] = useState("");
  const result = useMemo(() => (text.trim().split(/\s+/).length >= 30 ? evaluateCv(text, keywords) : null), [text, keywords]);
  const levelLabel = { bajo: "Necesita trabajo", medio: "Buen punto de partida", alto: "Muy bien" } as const;

  return (
    <ToolShell
      slug="evaluador-cv"
      disclaimer="El evaluador aplica una lista de verificación general y se ejecuta completamente en tu navegador: el texto no se envía ni se guarda. La puntuación es orientativa y no predice el resultado de un proceso de selección ni el comportamiento de un ATS específico."
      form={
        <>
          <Field label="Texto de tu hoja de vida" hint="Copia y pega el contenido completo (mínimo 30 palabras).">
            {(id) => <textarea id={id} rows={12} className={inputClass} value={text} onChange={(event) => setText(event.target.value)} />}
          </Field>
          <Field label="Palabras clave de la vacante (opcional)" hint="Sepáralas con comas. Ejemplo: Excel, inventarios, servicio al cliente">
            {(id) => <input id={id} className={inputClass} value={keywords} onChange={(event) => setKeywords(event.target.value)} />}
          </Field>
        </>
      }
      results={
        result && (
          <>
            <ResultCard title="Resultado">
              <p className="text-4xl font-bold tabular-nums text-ui-text">
                {result.score}
                <span className="text-lg font-medium text-ui-muted">/100</span>
              </p>
              <p className="mt-1 text-sm text-ui-muted">
                {levelLabel[result.level]} · {result.words.toLocaleString("es-CO")} palabras
              </p>
              <ul className="mt-4 space-y-3">
                {result.items.map((item) => (
                  <li key={item.id} className="flex gap-3 text-sm">
                    <span aria-hidden="true" className={item.passed ? "text-ui-success" : "text-ui-warning"}>{item.passed ? "✓" : "!"}</span>
                    <span>
                      <span className="font-medium text-ui-text">
                        {item.label} ({item.points}/{item.maxPoints})
                      </span>
                      {!item.passed && <span className="block text-ui-muted">{item.tip}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {result.missingKeywords.length > 0 && (
                <p className="mt-4 text-sm text-ui-muted">
                  Palabras clave que no encontramos: <span className="text-ui-text">{result.missingKeywords.join(", ")}</span>
                </p>
              )}
            </ResultCard>
            <ResultCard title="Siguiente paso">
              <p className="text-sm leading-6 text-ui-muted">
                Crea una versión limpia y compatible con ATS de tu hoja de vida en ProCV, con plantillas gratuitas y exportación en PDF.
              </p>
              <a href={APP_URLS.procv} className="mt-3 inline-flex rounded-ui-md bg-ui-accent px-4 py-2 text-sm font-semibold text-ui-on-accent hover:bg-ui-accent-hover">
                Abrir ProCV
              </a>
            </ResultCard>
          </>
        )
      }
      formula={
        <>
          <p>La puntuación suma seis criterios que los reclutadores y los sistemas ATS valoran:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li><strong>Extensión</strong> (15 puntos): entre 300 y 900 palabras suele equivaler a una o dos páginas.</li>
            <li><strong>Secciones estándar</strong> (25): datos de contacto, perfil, experiencia, educación y habilidades con títulos reconocibles.</li>
            <li><strong>Verbos de acción</strong> (20): lideré, implementé, reduje, aumenté…</li>
            <li><strong>Logros medibles</strong> (20): cifras, porcentajes y montos.</li>
            <li><strong>Formato legible</strong> (10): sin símbolos decorativos ni tablas dibujadas, sin datos personales innecesarios (edad, estado civil) ni frases de relleno.</li>
            <li><strong>Palabras clave</strong> (10): coincidencia con los términos de la vacante que escribas.</li>
          </ul>
          <p>
            Profundiza en <Link to="/academy/hoja-de-vida-ats-2026/" className="underline">cómo hacer una hoja de vida ATS</Link> y en los{" "}
            <Link to="/academy/errores-que-descartan-un-cv/" className="underline">errores que descartan un CV</Link>.
          </p>
        </>
      }
    />
  );
}

export function ToolsIndexPage() {
  useDocumentHead(headForPath("/tools"));
  return (
    <PublicLayout breadcrumbs={[{ name: "Herramientas", path: "/tools" }]}>
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6">
        <p className="text-sm font-semibold text-ui-accent">ProTools</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-ui-text sm:text-4xl">Calculadoras laborales gratuitas para Colombia</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ui-muted">
          Sin registro y sin guardar tus datos: todos los cálculos se hacen en tu navegador con los parámetros vigentes de {PARAMS.year}.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <article key={tool.slug} className="flex flex-col rounded-ui-lg border border-ui-border bg-ui-surface p-5 shadow-card">
              <h2 className="text-lg font-semibold text-ui-text">
                <Link to={`/tools/${tool.slug}/`} className="hover:underline">{tool.shortTitle}</Link>
              </h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-ui-muted">{tool.description}</p>
              <p className="mt-4 text-xs text-ui-subtle">
                Actualizado el <time dateTime={tool.updatedAt}>{formatDate(tool.updatedAt)}</time>
              </p>
            </article>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
