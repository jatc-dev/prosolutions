/**
 * Worked example and frequent questions of each payroll calculator page.
 * Examples are computed with the same functions and yearly parameters as the
 * calculators, so the figures always match them and update with the params.
 */
import { calculateSeverance, calculateVacation } from "../lib/payroll/benefits";
import { compareEmploymentVsServices } from "../lib/payroll/ops";
import { paramsFor } from "../lib/payroll/params";
import { calculatePrima } from "../lib/payroll/prima";
import { calculateEmployerCost, calculateNetSalary } from "../lib/payroll/salary";
import { calculateSettlement } from "../lib/payroll/settlement";
import type { FaqItem } from "./formats";
import type { ToolSlug } from "./tools";

export interface ToolGuide {
  example: { intro: string; rows: Array<[string, string]>; result: [string, string]; note?: string };
  faq: FaqItem[];
  related: ToolSlug[];
}

const money = (value: number) => `$${Math.round(value).toLocaleString("es-CO")}`;
const P = paramsFor();
const Y = P.year;

function primaGuide(): ToolGuide {
  const r = calculatePrima({ year: Y, semester: 1, monthlySalary: P.smmlv });
  return {
    example: {
      intro: `Una persona que gana el salario mínimo de ${Y} y trabajó todo el primer semestre.`,
      rows: [
        ["Salario mínimo", money(r.base.salary)],
        ["Auxilio de transporte (gana hasta 2 salarios mínimos)", money(r.base.transportAllowance)],
        ["Base de liquidación", money(r.base.total)],
        ["Días trabajados en el semestre", `${r.daysWorked}`],
      ],
      result: [`Prima de junio ${Y} = ${money(r.base.total)} × ${r.daysWorked} ÷ 360`, money(r.amount)],
    },
    faq: [
      { q: `¿Cuánto es la prima de junio de ${Y} con el salario mínimo?`, a: `Si trabajaste todo el semestre, ${money(r.amount)}: medio mes de salario más medio mes de auxilio de transporte (${money(r.base.total)} ÷ 2). Si entraste después del 1 de enero, es proporcional a los días trabajados.` },
      { q: "¿Hasta cuándo deben pagar la prima?", a: "La primera cuota, a más tardar el 30 de junio; la segunda, a más tardar el 20 de diciembre (artículo 306 del Código Sustantivo del Trabajo). Si terminas el contrato antes, la prima proporcional se paga con la liquidación." },
      { q: "¿A la prima le descuentan salud y pensión?", a: "No. La prima de servicios no es salario ni base de aportes (artículo 307 del Código Sustantivo del Trabajo), así que no se le descuentan salud ni pensión. Si tus ingresos son altos, puede aplicarse retención en la fuente." },
      { q: "¿Tengo prima si trabajo por prestación de servicios?", a: "No. La prima es una prestación social de los contratos laborales. Con un contrato de prestación de servicios recibes honorarios, sin prima, cesantías ni vacaciones." },
      { q: "¿Las vacaciones y las incapacidades cuentan para la prima?", a: "Sí, cuentan como tiempo trabajado. Los días de licencia no remunerada o de suspensión del contrato, en cambio, se descuentan." },
    ],
    related: ["cesantias", "liquidacion", "salario-neto"],
  };
}

function severanceGuide(): ToolGuide {
  const r = calculateSeverance({ year: Y, monthlySalary: P.smmlv });
  return {
    example: {
      intro: `Una persona que gana el salario mínimo de ${Y} y trabajó el año completo.`,
      rows: [
        ["Salario mínimo", money(r.base.salary)],
        ["Auxilio de transporte", money(r.base.transportAllowance)],
        ["Base de liquidación", money(r.base.total)],
        ["Días trabajados", `${r.daysWorked}`],
        [`Cesantías = ${money(r.base.total)} × ${r.daysWorked} ÷ 360`, money(r.severance)],
        [`Intereses = cesantías × 12 %`, money(r.interest)],
      ],
      result: ["Total cesantías + intereses", money(r.severance + r.interest)],
      note: "Las cesantías se consignan en tu fondo; los intereses te los paga directamente el empleador.",
    },
    faq: [
      { q: "¿Cuándo deben consignar las cesantías?", a: "A más tardar el 14 de febrero del año siguiente, en el fondo de cesantías que elegiste (artículo 99 de la Ley 50 de 1990). Si el contrato termina, se pagan directamente con la liquidación." },
      { q: "¿Cuándo pagan los intereses a las cesantías?", a: "A más tardar el 31 de enero, directamente al trabajador. Son el 12 % anual sobre las cesantías, proporcional al tiempo trabajado en el año (Ley 52 de 1975)." },
      { q: "¿Qué pasa si no consignan las cesantías a tiempo?", a: "El empleador debe pagar una sanción de un día de salario por cada día de retraso (artículo 99 de la Ley 50 de 1990)." },
      { q: "¿Para qué puedo retirar las cesantías?", a: "Al terminar el contrato y, mientras trabajas, para comprar, construir o mejorar vivienda, o para pagar estudios de educación superior propios, del cónyuge o de los hijos. Tu fondo te indica los soportes." },
      { q: "¿Hay cesantías con salario integral?", a: "No. El salario integral ya incluye el valor de las prestaciones sociales, así que no se pagan cesantías ni intereses aparte." },
    ],
    related: ["prima", "liquidacion", "vacaciones"],
  };
}

function vacationGuide(): ToolGuide {
  const salary = 2_500_000;
  const r = calculateVacation({ startDate: `${Y - 1}-01-01`, cutoffDate: `${Y - 1}-12-30`, monthlySalary: salary });
  return {
    example: {
      intro: `Una persona que gana ${money(salary)} al mes, trabajó un año completo y no ha tomado vacaciones.`,
      rows: [
        ["Días trabajados", `${r.daysWorked}`],
        ["Días de vacaciones ganados (15 por año)", `${r.daysEarned}`],
        ["Salario diario (sin auxilio de transporte)", money(r.dailySalary)],
      ],
      result: [`Valor de las vacaciones = ${money(r.dailySalary)} × ${r.daysPending} días`, money(r.value)],
    },
    faq: [
      { q: "¿Cuántos días de vacaciones me corresponden?", a: "15 días hábiles consecutivos de descanso remunerado por cada año trabajado (artículo 186 del Código Sustantivo del Trabajo), y la parte proporcional si llevas menos de un año." },
      { q: "¿Me pueden pagar las vacaciones en dinero?", a: "Mientras trabajas, el empleador y tú pueden acordar por escrito pagar en dinero hasta la mitad de las vacaciones. Cuando termina el contrato, todas las vacaciones pendientes se pagan en dinero con la liquidación." },
      { q: "¿Las vacaciones incluyen el auxilio de transporte?", a: "No. Las vacaciones se liquidan con el salario ordinario, sin auxilio de transporte ni horas extra." },
      { q: "¿Qué pasa si no salgo a vacaciones?", a: "Siguen acumulándose como días pendientes y debes tomarlas o recibirlas en la liquidación. Esta calculadora te muestra cuántas tienes pendientes y su valor." },
    ],
    related: ["liquidacion", "prima", "cesantias"],
  };
}

function netSalaryGuide(): ToolGuide {
  const salary = 3_000_000;
  const r = calculateNetSalary({ year: Y, monthlySalary: salary });
  const cost = calculateEmployerCost({ year: Y, monthlySalary: P.smmlv, riskClass: "I", exempt114_1: true });
  return {
    example: {
      intro: `Una persona con salario de ${money(salary)} al mes en ${Y}.`,
      rows: [
        ["Salario", money(r.grossSalary)],
        ...(r.transportAllowance > 0 ? [["Auxilio de transporte", money(r.transportAllowance)] as [string, string]] : []),
        ["Salud (4 %)", `−${money(r.health)}`],
        ["Pensión (4 %)", `−${money(r.pension)}`],
        ...(r.solidarityFund > 0 ? [["Fondo de Solidaridad Pensional", `−${money(r.solidarityFund)}`] as [string, string]] : []),
        ...(r.withholding.withholding > 0 ? [["Retención en la fuente", `−${money(r.withholding.withholding)}`] as [string, string]] : []),
      ],
      result: ["Salario neto mensual", money(r.netPay)],
      note: `Para el empleador, un trabajador con salario mínimo cuesta cerca de ${money(cost.totalMonthlyCost)} al mes con aportes y prestaciones (riesgo ARL I y empresa exonerada de salud, SENA e ICBF por el artículo 114-1 del Estatuto Tributario).`,
    },
    faq: [
      { q: "¿Cuánto me descuentan de salud y pensión?", a: "4 % para salud y 4 % para pensión sobre tu salario; el empleador aporta el resto. El auxilio de transporte no tiene descuentos." },
      { q: "¿Qué es el Fondo de Solidaridad Pensional?", a: "Un aporte adicional a pensión para quienes ganan 4 salarios mínimos o más: el 1 %, y un poco más a partir de 16 salarios mínimos." },
      { q: "¿Desde cuánto se cobra retención en la fuente?", a: "Cuando tu ingreso laboral, después de restar aportes obligatorios y deducciones y aplicar la renta exenta, supera 95 UVT al mes. La calculadora hace una estimación con la tabla del artículo 383 del Estatuto Tributario." },
      { q: "¿Cuánto le cuesta un trabajador a la empresa?", a: "Además del salario, el empleador paga aportes a pensión, ARL y caja de compensación (y salud, SENA e ICBF si no está exonerado), y provisiona prima, cesantías, intereses y vacaciones. La calculadora lo estima mes a mes." },
    ],
    related: ["contrato-vs-prestacion", "prima", "cesantias"],
  };
}

function settlementGuide(): ToolGuide {
  const salary = 2_000_000;
  const r = calculateSettlement({
    year: Y,
    startDate: `${Y - 2}-02-01`,
    endDate: `${Y}-05-31`,
    monthlySalary: salary,
    contractType: "indefinido",
    reason: "sin-justa-causa",
    vacationDaysTaken: 15,
    severancePaidUntil: `${Y - 1}-12-31`,
  });
  return {
    example: {
      intro: `Una persona con contrato indefinido y salario de ${money(salary)}, que trabajó del 1 de febrero de ${Y - 2} al 31 de mayo de ${Y}, tomó 15 días de vacaciones y fue despedida sin justa causa.`,
      rows: [
        ["Cesantías del año", money(r.severance.amount)],
        ["Intereses a las cesantías", money(r.severanceInterest.amount)],
        ["Prima proporcional", money(r.prima.amount)],
        [`Vacaciones pendientes (${r.vacation.daysOwed.toLocaleString("es-CO", { maximumFractionDigits: 1 })} días)`, money(r.vacation.amount)],
        ...(r.indemnity.applies ? [["Indemnización por despido sin justa causa", money(r.indemnity.amount)] as [string, string]] : []),
      ],
      result: ["Total estimado de la liquidación", money(r.total)],
    },
    faq: [
      { q: "¿Qué incluye la liquidación laboral?", a: "Los salarios pendientes, las cesantías y sus intereses del año, la prima proporcional, las vacaciones pendientes y, si te despiden sin justa causa, la indemnización del artículo 64 del Código Sustantivo del Trabajo." },
      { q: "¿Si renuncio tengo derecho a liquidación?", a: "Sí, a las prestaciones sociales y las vacaciones pendientes. La indemnización solo aplica cuando el empleador termina el contrato sin justa causa." },
      { q: "¿Cuánto es la indemnización por despido sin justa causa?", a: "Depende del tipo de contrato, del salario y de la antigüedad (artículo 64 del CST). En un contrato a término fijo equivale a los salarios del tiempo que faltaba para terminar; en uno indefinido se calcula en días de salario por año trabajado. La calculadora la estima." },
      { q: "¿Qué pasa si no me pagan la liquidación a tiempo?", a: "Si al terminar el contrato el empleador no paga salarios y prestaciones sin una razón válida, puede deber la indemnización moratoria del artículo 65 del Código Sustantivo del Trabajo." },
    ],
    related: ["cesantias", "prima", "vacaciones"],
  };
}

function servicesGuide(): ToolGuide {
  const salary = 3_000_000;
  const fee = 3_500_000;
  const r = compareEmploymentVsServices({ year: Y, salary, fee, riskClass: "I" });
  return {
    example: {
      intro: `Una oferta laboral de ${money(salary)} al mes frente a una de prestación de servicios de ${money(fee)} en honorarios.`,
      rows: [
        ["Contrato laboral: valor mensual con prestaciones y vacaciones", money(r.employment.totalMonthlyValue)],
        ["Prestación de servicios: neto después de aportes", money(r.services.netMonthly)],
        ["Honorarios necesarios para quedar igual", money(r.equivalentFee)],
      ],
      // difference = services net − employment total (ops.ts).
      result: [r.difference > 0 ? "Los honorarios valen más cada mes" : "El contrato laboral vale más cada mes", money(Math.abs(r.difference))],
    },
    faq: [
      { q: "¿Sobre cuánto pago seguridad social con prestación de servicios?", a: "Sobre el 40 % de tus honorarios (el ingreso base de cotización), con un mínimo de un salario mínimo: 12,5 % para salud, 16 % para pensión y ARL según el riesgo." },
      { q: "¿Con prestación de servicios tengo prima, cesantías o vacaciones?", a: "No. Esas prestaciones son propias del contrato laboral. Por eso conviene comparar el valor total de cada oferta y no solo el pago mensual." },
      { q: "¿Cuándo un contrato de prestación de servicios es en realidad laboral?", a: "Cuando hay subordinación: cumples horario, recibes órdenes permanentes y trabajas como un empleado más. En ese caso puede declararse un contrato realidad, con derecho a las prestaciones." },
    ],
    related: ["salario-neto", "liquidacion", "prima"],
  };
}

const BUILDERS: Partial<Record<ToolSlug, () => ToolGuide>> = {
  prima: primaGuide,
  cesantias: severanceGuide,
  vacaciones: vacationGuide,
  "salario-neto": netSalaryGuide,
  liquidacion: settlementGuide,
  "contrato-vs-prestacion": servicesGuide,
};

export function toolGuide(slug: ToolSlug): ToolGuide | undefined {
  return BUILDERS[slug]?.();
}
