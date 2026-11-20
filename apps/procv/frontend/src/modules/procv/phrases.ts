/**
 * Suggested CV phrases by job family, for every sector. Duties use the
 * nominal style common in Colombian CVs; achievements are first person with a
 * bracketed figure the candidate must fill in ("[X] %"). Matching is local and
 * keyword-based: nothing is sent anywhere.
 */
export interface PhraseFamily {
  id: string;
  label: string;
  /** Lower-case, accent-free fragments matched against the job title. */
  keywords: string[];
  duties: string[];
  achievements: string[];
  summaries: string[];
}

export const PHRASE_FAMILIES: PhraseFamily[] = [
  {
    id: "administrativo",
    label: "Administrativo y oficina",
    keywords: ["administrativ", "asistente", "secretari", "recepcion", "auxiliar de oficina", "archiv", "gestor documental"],
    duties: [
      "Gestión de agenda, correspondencia y archivo físico y digital del área.",
      "Elaboración de informes, actas y presentaciones para la gerencia.",
      "Atención telefónica y presencial a clientes, proveedores y visitantes.",
      "Control de caja menor, solicitudes de compra y suministros de oficina.",
      "Seguimiento a trámites internos y a los compromisos de las reuniones.",
      "Digitación y actualización de bases de datos y sistemas de información.",
    ],
    achievements: [
      "Organicé y digitalicé [X] expedientes, reduciendo el tiempo de búsqueda de documentos en [X] %.",
      "Implementé un control de suministros que redujo los gastos de oficina en [X] % al año.",
      "Atendí en promedio [X] solicitudes semanales con un nivel de satisfacción del [X] %.",
      "Coordiné la logística de [X] eventos y reuniones corporativas sin retrasos.",
    ],
    summaries: [
      "Profesional administrativo(a) con experiencia en gestión documental, atención al cliente y apoyo a la gerencia, organizado(a) y con manejo avanzado de herramientas ofimáticas.",
      "Asistente con capacidad para coordinar agendas, procesos y proveedores, orientado(a) al detalle y al cumplimiento de plazos.",
    ],
  },
  {
    id: "contabilidad",
    label: "Contabilidad y finanzas",
    keywords: ["contab", "contador", "contable", "financier", "tesorer", "cartera", "factura", "nomina", "auditor", "costos", "impuest", "revisor fiscal"],
    duties: [
      "Causación de facturas, cuentas por pagar y cuentas por cobrar.",
      "Elaboración de conciliaciones bancarias y de cuentas contables.",
      "Preparación y presentación de declaraciones tributarias (IVA, retención en la fuente, ICA).",
      "Liquidación de nómina, seguridad social y prestaciones sociales.",
      "Apoyo en el cierre contable mensual y en la elaboración de estados financieros bajo NIIF.",
      "Gestión de cartera y seguimiento a clientes morosos.",
    ],
    achievements: [
      "Reduje el tiempo de cierre contable mensual de [X] a [X] días.",
      "Recuperé [X] millones de pesos en cartera vencida en [X] meses.",
      "Detecté inconsistencias contables por [X] millones de pesos y corregí su registro.",
      "Automaticé conciliaciones en Excel, ahorrando [X] horas de trabajo al mes.",
    ],
    summaries: [
      "Contador(a) con experiencia en causación, conciliaciones, impuestos y cierres contables bajo NIIF, con manejo de software contable y Excel avanzado.",
      "Profesional del área financiera, analítico(a) y riguroso(a), con experiencia en tesorería, cartera y reportes para la toma de decisiones.",
    ],
  },
  {
    id: "ventas",
    label: "Ventas y comercial",
    keywords: ["venta", "vendedor", "comercial", "asesor comercial", "ejecutivo de cuenta", "key account", "impulsador", "mercaderista", "promotor", "televent"],
    duties: [
      "Prospección y captación de nuevos clientes en la zona asignada.",
      "Asesoría y presentación de productos y servicios según las necesidades del cliente.",
      "Elaboración de cotizaciones, negociación y cierre de ventas.",
      "Seguimiento postventa y fidelización de la cartera de clientes.",
      "Registro de oportunidades y actividades en el CRM.",
      "Cumplimiento de metas de ventas y de recaudo mensuales.",
    ],
    achievements: [
      "Superé la meta de ventas en un [X] % durante [X] meses consecutivos.",
      "Abrí [X] clientes nuevos en [X] meses en la zona asignada.",
      "Aumenté el ticket promedio en un [X] % con estrategias de venta cruzada.",
      "Recuperé [X] clientes inactivos con un plan de seguimiento personalizado.",
    ],
    summaries: [
      "Asesor(a) comercial con experiencia en prospección, negociación y cierre, orientado(a) a resultados y al cumplimiento de metas.",
      "Profesional de ventas con habilidades de comunicación y relacionamiento, con experiencia en manejo de clientes y uso de CRM.",
    ],
  },
  {
    id: "servicio",
    label: "Servicio al cliente y call center",
    keywords: ["servicio al cliente", "atencion al cliente", "call center", "contact center", "agente", "asesor de servicio", "cajer", "pqr", "soporte al cliente"],
    duties: [
      "Atención de clientes por teléfono, chat, correo y de forma presencial.",
      "Gestión y solución de peticiones, quejas y reclamos (PQR) dentro de los tiempos establecidos.",
      "Registro de casos e interacciones en el sistema de gestión.",
      "Venta cruzada de productos y servicios durante la atención.",
      "Manejo de caja, recaudos y cuadre diario.",
    ],
    achievements: [
      "Mantuve un nivel de satisfacción del cliente del [X] % durante [X] meses.",
      "Reduje el tiempo promedio de atención en un [X] % sin afectar la calidad.",
      "Resolví el [X] % de los casos en el primer contacto.",
      "Fui reconocido(a) como mejor asesor(a) del mes [X] veces.",
    ],
    summaries: [
      "Asesor(a) de servicio al cliente con experiencia multicanal, empatía y capacidad para resolver casos en el primer contacto.",
      "Profesional orientado(a) al cliente, con buena comunicación, manejo de PQR y cumplimiento de indicadores de calidad.",
    ],
  },
  {
    id: "logistica",
    label: "Logística, bodega y transporte",
    keywords: ["logistic", "bodega", "almacen", "inventario", "despacho", "conductor", "transport", "montacarg", "operador logistic", "picking", "compras", "abastecimiento"],
    duties: [
      "Recepción, almacenamiento y despacho de mercancía.",
      "Control de inventarios y conteos cíclicos.",
      "Alistamiento de pedidos (picking y packing) según las órdenes de despacho.",
      "Manejo de montacargas y equipos de cargue y descargue.",
      "Registro de movimientos en el sistema de inventarios (WMS/ERP).",
      "Planeación de rutas y entrega oportuna de pedidos a clientes.",
    ],
    achievements: [
      "Reduje las diferencias de inventario al [X] % con conteos cíclicos semanales.",
      "Aumenté en un [X] % los pedidos despachados por turno.",
      "Mantuve [X] meses sin accidentes ni daños en la mercancía.",
      "Optimicé las rutas de entrega y reduje los costos de transporte en un [X] %.",
    ],
    summaries: [
      "Profesional de logística con experiencia en almacenamiento, inventarios y despachos, comprometido(a) con la seguridad y la exactitud.",
      "Auxiliar de bodega responsable y ágil, con manejo de montacargas y sistemas de inventario.",
    ],
  },
  {
    id: "produccion",
    label: "Producción, operarios y mantenimiento",
    keywords: ["operari", "produccion", "planta", "manufactur", "ensambl", "mantenimiento", "tecnico electric", "electricista", "mecanic", "soldador", "calidad", "supervisor de produccion"],
    duties: [
      "Operación de máquinas y líneas de producción según los estándares de calidad.",
      "Mantenimiento preventivo y correctivo de equipos.",
      "Control de calidad del producto en proceso y terminado.",
      "Diligenciamiento de formatos de producción y reportes de novedades.",
      "Cumplimiento de normas de seguridad y salud en el trabajo y de las BPM.",
    ],
    achievements: [
      "Aumenté la productividad de la línea en un [X] % con mejoras en el alistamiento.",
      "Reduje el desperdicio de material en un [X] %.",
      "Disminuí las paradas no programadas de equipos en un [X] % con mantenimiento preventivo.",
      "Cumplí [X] meses sin incidentes de seguridad en el área.",
    ],
    summaries: [
      "Operario(a) con experiencia en líneas de producción, control de calidad y buenas prácticas de manufactura.",
      "Técnico(a) de mantenimiento con conocimientos en sistemas eléctricos y mecánicos, enfocado(a) en la prevención de fallas.",
    ],
  },
  {
    id: "salud",
    label: "Salud",
    keywords: ["enfermer", "medic", "salud", "farmac", "regente", "odontolog", "fisioterap", "bacteriolog", "terapeuta", "auxiliar de enfermeria", "psicolog clinic", "nutricion"],
    duties: [
      "Atención y cuidado integral de pacientes según los protocolos institucionales.",
      "Administración de medicamentos y registro en la historia clínica.",
      "Toma de signos vitales y apoyo en procedimientos.",
      "Educación a pacientes y familias sobre cuidados y tratamientos.",
      "Manejo de inventario de insumos y medicamentos.",
    ],
    achievements: [
      "Atendí en promedio [X] pacientes por turno cumpliendo los protocolos de seguridad.",
      "Participé en la implementación de [X] protocolos que redujeron los eventos adversos en un [X] %.",
      "Mantuve el inventario de medicamentos sin faltantes durante [X] meses.",
      "Recibí reconocimiento por calidad en la atención en [X] evaluaciones.",
    ],
    summaries: [
      "Profesional de la salud con vocación de servicio, experiencia en atención de pacientes y manejo de historia clínica.",
      "Auxiliar de enfermería con experiencia en hospitalización y urgencias, responsable y con trato humanizado.",
    ],
  },
  {
    id: "educacion",
    label: "Educación",
    keywords: ["docente", "profesor", "maestr", "tutor", "educador", "coordinador academic", "pedagog", "instructor", "formador"],
    duties: [
      "Planeación y desarrollo de clases según el plan de estudios.",
      "Diseño de material didáctico y actividades de evaluación.",
      "Seguimiento académico y acompañamiento a estudiantes.",
      "Comunicación con padres de familia y participación en comités.",
      "Uso de plataformas virtuales de aprendizaje.",
    ],
    achievements: [
      "Mejoré los resultados de mis grupos en las pruebas en un [X] %.",
      "Diseñé [X] cursos o módulos que se siguen usando en la institución.",
      "Reduje la deserción de mis cursos en un [X] % con acompañamiento personalizado.",
      "Formé a más de [X] estudiantes en [tema].",
    ],
    summaries: [
      "Docente con experiencia en planeación curricular, evaluación por competencias y acompañamiento a estudiantes.",
      "Educador(a) creativo(a) y comprometido(a), con manejo de herramientas digitales para el aprendizaje.",
    ],
  },
  {
    id: "tecnologia",
    label: "Tecnología y sistemas",
    keywords: ["desarroll", "programador", "software", "sistemas", "soporte tecnic", "mesa de ayuda", "devops", "datos", "analista de sistemas", "ingeniero de sistemas", "frontend", "backend", "full stack", "qa", "tester", "redes"],
    duties: [
      "Desarrollo y mantenimiento de aplicaciones según los requerimientos del negocio.",
      "Soporte técnico a usuarios y gestión de incidentes en la mesa de ayuda.",
      "Pruebas, documentación y despliegue de nuevas funcionalidades.",
      "Administración de bases de datos, servidores y redes.",
      "Levantamiento de requerimientos con las áreas usuarias.",
    ],
    achievements: [
      "Reduje el tiempo de respuesta de la aplicación en un [X] %.",
      "Automaticé [proceso], ahorrando [X] horas de trabajo al mes.",
      "Resolví el [X] % de los incidentes dentro del tiempo acordado (SLA).",
      "Lideré la migración de [sistema] sin interrupciones del servicio.",
    ],
    summaries: [
      "Profesional de tecnología con experiencia en desarrollo y soporte de aplicaciones, orientado(a) a la calidad y al trabajo en equipo.",
      "Técnico(a) de soporte con experiencia en mesa de ayuda, redes y atención a usuarios.",
    ],
  },
  {
    id: "talento",
    label: "Recursos humanos",
    keywords: ["recursos humanos", "talento humano", "gestion humana", "seleccion", "reclut", "bienestar", "seguridad y salud", "sst", "psicolog organizacional"],
    duties: [
      "Reclutamiento y selección de personal: publicación de vacantes, entrevistas y pruebas.",
      "Procesos de contratación, afiliaciones y vinculación de personal.",
      "Programas de bienestar, capacitación y clima laboral.",
      "Apoyo en el Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST).",
      "Manejo de novedades de nómina e indicadores del área.",
    ],
    achievements: [
      "Reduje el tiempo promedio de contratación de [X] a [X] días.",
      "Cubrí [X] vacantes en [X] meses con una retención del [X] % al primer año.",
      "Disminuí la rotación de personal en un [X] %.",
      "Implementé un plan de capacitación para [X] colaboradores.",
    ],
    summaries: [
      "Profesional de talento humano con experiencia en selección, contratación y bienestar, con enfoque en las personas y en los resultados.",
    ],
  },
  {
    id: "mercadeo",
    label: "Mercadeo y comunicaciones",
    keywords: ["mercadeo", "marketing", "comunicacion", "community", "redes sociales", "publicidad", "contenido", "diseñador", "disenador", "periodist", "marca"],
    duties: [
      "Planeación y ejecución de campañas de mercadeo en medios digitales y tradicionales.",
      "Creación de contenido y gestión de redes sociales de la marca.",
      "Análisis de métricas y elaboración de informes de resultados.",
      "Coordinación con agencias, proveedores y equipos comerciales.",
    ],
    achievements: [
      "Aumenté los seguidores de la marca en un [X] % en [X] meses.",
      "Generé [X] clientes potenciales al mes con campañas digitales.",
      "Reduje el costo por adquisición en un [X] %.",
      "Lancé [X] campañas que incrementaron las ventas en un [X] %.",
    ],
    summaries: [
      "Profesional de mercadeo con experiencia en campañas digitales, contenido y análisis de resultados.",
    ],
  },
  {
    id: "construccion",
    label: "Construcción e ingeniería",
    keywords: ["construc", "obra", "ingeniero civil", "residente", "arquitect", "topograf", "maestro de obra", "interventor", "ingenier"],
    duties: [
      "Supervisión de obra y control del avance según el cronograma.",
      "Control de cantidades, presupuestos y materiales.",
      "Coordinación de cuadrillas, contratistas y proveedores.",
      "Verificación del cumplimiento de normas técnicas y de seguridad en obra.",
      "Elaboración de informes de avance para la interventoría y el cliente.",
    ],
    achievements: [
      "Entregué [X] proyectos dentro del plazo y del presupuesto aprobado.",
      "Reduje los costos de materiales en un [X] % con un mejor control de cantidades.",
      "Mantuve [X] meses sin accidentes en obra.",
      "Coordiné equipos de hasta [X] personas.",
    ],
    summaries: [
      "Profesional de la construcción con experiencia en supervisión de obra, presupuestos y seguridad.",
    ],
  },
  {
    id: "hoteleria",
    label: "Hotelería, restaurantes y turismo",
    keywords: ["mesero", "cociner", "chef", "barista", "bartender", "hotel", "turism", "auxiliar de cocina", "camarer", "recepcionista de hotel", "restaurante", "domicili"],
    duties: [
      "Atención a huéspedes y comensales con estándares de servicio.",
      "Preparación de alimentos y bebidas según recetas estándar.",
      "Cumplimiento de normas de higiene y manipulación de alimentos.",
      "Montaje y alistamiento de áreas de servicio.",
      "Manejo de caja, comandas y reservas.",
    ],
    achievements: [
      "Mantuve calificaciones de servicio de [X] sobre 5 en las evaluaciones de clientes.",
      "Reduje el desperdicio de alimentos en un [X] %.",
      "Atendí en promedio [X] mesas o clientes por turno.",
      "Capacité a [X] compañeros nuevos en los procesos del área.",
    ],
    summaries: [
      "Profesional de servicio con experiencia en hotelería y restaurantes, amable, ágil y con certificado de manipulación de alimentos.",
    ],
  },
  {
    id: "general",
    label: "Frases generales",
    keywords: [],
    duties: [
      "Cumplimiento de los procesos y procedimientos del área.",
      "Elaboración de reportes e informes de gestión.",
      "Atención y solución de requerimientos de clientes internos y externos.",
      "Trabajo en equipo con otras áreas para el logro de los objetivos.",
    ],
    achievements: [
      "Mejoré [proceso] y reduje su tiempo en un [X] %.",
      "Cumplí el [X] % de las metas asignadas durante [periodo].",
      "Propuse [iniciativa] que generó un ahorro de [X] al año.",
      "Fui reconocido(a) por [motivo] en [año].",
    ],
    summaries: [
      "Profesional responsable y proactivo(a), con capacidad de aprendizaje, trabajo en equipo y orientación a resultados.",
    ],
  },
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Best family for a job title (the one with the longest matching keyword), or "general". */
export function familyForTitle(title: string | undefined): PhraseFamily {
  const text = normalize(title || "");
  let best: { family: PhraseFamily; length: number } | null = null;
  if (text) {
    for (const family of PHRASE_FAMILIES) {
      for (const keyword of family.keywords) {
        const key = normalize(keyword);
        if (text.includes(key) && (!best || key.length > best.length)) best = { family, length: key.length };
      }
    }
  }
  return best?.family ?? PHRASE_FAMILIES.find((family) => family.id === "general")!;
}

export function getFamily(id: string): PhraseFamily {
  return PHRASE_FAMILIES.find((family) => family.id === id) ?? familyForTitle("");
}

/** Appends a phrase as a new line, skipping it when the text already contains it. */
export function appendPhrase(text: string | undefined, phrase: string): string {
  const current = String(text || "").trimEnd();
  if (normalize(current).includes(normalize(phrase))) return current;
  return current ? `${current}\n${phrase}` : phrase;
}
