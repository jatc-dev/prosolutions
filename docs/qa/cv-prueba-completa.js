/*
 * Hoja de vida ficticia con TODOS los campos llenos, para pruebas en ProCV.
 *
 * Uso (modo invitado, sin sesión iniciada):
 *   1. Abre el editor: https://procv-qa.prosolutions.page/editor (o http://localhost:5173/editor).
 *   2. Abre la consola del navegador (F12 → Consola). La primera vez, Chrome pide
 *      escribir «allow pasting» (o «permitir pegar») antes de dejarte pegar.
 *   3. Pega TODO este archivo y pulsa Enter. La página se recarga con los datos.
 *
 * Reemplaza el borrador de invitado que tengas en ese navegador. Con sesión
 * iniciada no se usa (el editor carga los CV de tu cuenta). La plantilla queda
 * en «Función Pública»; cámbiala en el editor para probar las demás.
 *
 * Todos los datos son inventados: documento, teléfonos y correos no existen
 * (los correos usan el dominio reservado example.com).
 */
(() => {
  const photo =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">' +
        '<rect width="600" height="600" fill="#cbd5e1"/>' +
        '<circle cx="300" cy="235" r="120" fill="#64748b"/>' +
        '<ellipse cx="300" cy="560" rx="210" ry="170" fill="#64748b"/>' +
        "</svg>",
    );

  const cv = {
    title: "Hoja de vida de prueba (todos los campos)",
    template: "dafp",
    settings: {},
    personal: {
      firstName: "Andrea Carolina",
      lastName: "Rojas de la Torre",
      fullName: "Andrea Carolina Rojas de la Torre",
      professionalTitle: "Profesional en Administración Pública",
      profileImage: photo,
      profileImageStyle: "round",
      profileImageSize: "md",
      showProfileImage: true,
      documentType: "CC",
      documentNumber: "1.020.456.789",
      showDocumentType: true,
      showDocumentNumber: true,
      showDocumentIdentity: true,
      professionalCardNumber: "25202-987654",
      professionalCardIssuer: "Consejo Profesional de Administración de Empresas",
      professionalCardDate: "2016-08",
      showProfessionalCard: true,
      showProfessionalCardIssuer: true,
      showProfessionalCardDate: true,
      showFullName: true,
      showProfessionalTitle: true,
      showNationality: true,
      nationality: "CO",
      birthDate: "1991-04-17",
      showBirthDate: true,
      showAge: true,
      emails: [
        { id: "e1", type: "personal", label: "Personal", value: "andrea.rojas@example.com", isPrimary: true, isVisible: true },
        { id: "e2", type: "work", label: "Trabajo", value: "a.rojas.trabajo@example.com", isPrimary: false, isVisible: true },
      ],
      phones: [
        { id: "p1", type: "personal", number: "300 000 1234", label: "Celular", isPrimary: true, isVisible: true },
        { id: "p2", type: "whatsapp", number: "310 000 5678", label: "WhatsApp", isPrimary: false, isVisible: true },
      ],
      address: "Carrera 43A # 1-50, apto 802",
      city: "Medellín",
      country: "CO",
      showAddress: true,
      showCity: true,
      showCountry: true,
      website: "https://example.com/andrea-rojas",
      linkedin: "https://www.linkedin.com/in/andrea-rojas-ejemplo",
      valueProposition: "Hago que los procesos públicos funcionen: menos trámites, respuestas a tiempo y presupuesto bien ejecutado.",
      showValuePropositionTitle: true,
      showValuePropositionContent: true,
      summary:
        "Administradora pública con más de 8 años de experiencia en gestión administrativa, contratación estatal y atención al ciudadano en entidades públicas y empresas privadas. He liderado la mejora de procesos de correspondencia y PQRS, la ejecución presupuestal y la supervisión de contratos de prestación de servicios. Manejo SECOP II, SIGEP II, Excel avanzado y Power BI.",
      showSummaryTitle: true,
      showSummaryContent: true,
      contactLabelStyle: "label",
      sidebarIntroMode: "summary",
      showReferences: true,
      referencesAvailableOnRequest: true,
      references: [
        { id: "r1", type: "laboral", name: "Carlos Andrés Ruiz Mejía", position: "Secretario de Hacienda", company: "Alcaldía de Ejemplo", phone: "604 000 1111", email: "carlos.ruiz@example.com", isVisible: true },
        { id: "r2", type: "laboral", name: "Marcela Ospina Duarte", position: "Gerente administrativa", company: "Comercializadora Andina S.A.S.", phone: "601 000 2222", email: "marcela.ospina@example.com", isVisible: true },
        { id: "r3", type: "personal", name: "Juliana Restrepo Gil", relationship: "Amiga", position: "Abogada", phone: "315 000 3333", email: "juliana.restrepo@example.com", isVisible: true },
        { id: "r4", type: "familiar", name: "Luis Fernando Rojas", relationship: "Padre", position: "Docente pensionado", phone: "312 000 4444", isVisible: true },
      ],
    },
    experience: [
      {
        id: "x1",
        isVisible: true,
        position: "Profesional universitario — Contratación",
        company: "Alcaldía de Ejemplo",
        location: "Medellín, Colombia",
        employmentType: "full-time",
        startDate: "2022-02-01",
        endDate: "",
        isCurrentPosition: true,
        description: "Estructuro y acompaño los procesos de contratación de la Secretaría de Hacienda y superviso contratos de prestación de servicios.",
        achievements: [
          "Reduje de 25 a 12 días el tiempo promedio de los procesos de mínima cuantía.",
          "Publiqué el 100 % de los procesos en SECOP II dentro de los términos de ley.",
        ],
        technologies: ["SECOP II", "SIGEP II", "Excel avanzado", "Power BI"],
        order: 0,
        dafpSector: "public",
        dafpDependency: "Secretaría de Hacienda — Unidad de Contratación",
        dafpDepartment: "Antioquia",
        dafpAddress: "Calle 44 # 00-00, piso 5",
        dafpPhone: "604 000 5555 ext. 120",
        dafpEmail: "contratacion@example.com",
      },
      {
        id: "x2",
        isVisible: true,
        position: "Coordinadora administrativa",
        company: "Comercializadora Andina S.A.S.",
        location: "Bogotá, Colombia",
        employmentType: "full-time",
        startDate: "2018-03-01",
        endDate: "2022-01-31",
        isCurrentPosition: false,
        description: "Coordiné compras, inventarios, correspondencia y el equipo de servicio al cliente (6 personas).",
        achievements: [
          "Bajé en 18 % los costos de compras con un nuevo proceso de cotización.",
          "Implementé el sistema de PQRS con respuesta en menos de 5 días hábiles.",
        ],
        technologies: ["Siigo", "Excel", "Google Workspace"],
        order: 1,
        dafpSector: "private",
        dafpDependency: "Gerencia administrativa",
        dafpDepartment: "Cundinamarca",
        dafpAddress: "Avenida Calle 26 # 00-00",
        dafpPhone: "601 000 6666",
        dafpEmail: "talento@example.com",
      },
      {
        id: "x3",
        isVisible: true,
        position: "Consultora independiente en procesos administrativos",
        company: "Trabajo independiente",
        location: "Bogotá, Colombia",
        employmentType: "freelance",
        // Se cruza con el empleo anterior: ese periodo cuenta una sola vez en el total.
        startDate: "2020-06-01",
        endDate: "2021-05-31",
        isCurrentPosition: false,
        description: "Asesoré a pequeñas empresas en organización documental y en sus procesos de compras.",
        achievements: ["Organicé el archivo de 4 empresas según la Ley 594 de 2000."],
        technologies: ["Gestión documental"],
        order: 2,
        dafpSector: "independent",
        dafpDependency: "",
        dafpDepartment: "Cundinamarca",
        dafpAddress: "",
        dafpPhone: "300 000 1234",
        dafpEmail: "andrea.rojas@example.com",
      },
      {
        id: "x4",
        isVisible: true,
        position: "Practicante de administración",
        company: "Gobernación de Ejemplo",
        location: "Medellín, Colombia",
        employmentType: "internship",
        startDate: "2015-01-15",
        endDate: "2015-07-15",
        isCurrentPosition: false,
        description: "Apoyo a la Secretaría de Planeación en el seguimiento del plan de desarrollo.",
        achievements: ["Consolidé los informes trimestrales de 12 proyectos."],
        technologies: ["Excel"],
        order: 3,
        dafpSector: "public",
        dafpDependency: "Secretaría de Planeación",
        dafpDepartment: "Antioquia",
        dafpAddress: "Calle 42B # 00-00",
        dafpPhone: "604 000 7777",
        dafpEmail: "planeacion@example.com",
      },
    ],
    education: [
      {
        id: "d1", isVisible: true, degree: "master", fieldOfStudy: "Maestría en Gestión Pública", institution: "Universidad de Ejemplo",
        location: "Medellín, Colombia", startDate: "2022-07", endDate: "", isCurrentlyStudying: true, gpa: "",
        dafpModality: "MG", dafpSemesters: "2", dafpGraduated: "no",
        activities: ["Semillero de investigación en transparencia"], achievements: [], order: 0,
      },
      {
        id: "d2", isVisible: true, degree: "other", fieldOfStudy: "Especialización en Contratación Estatal", institution: "Universidad Pontificia de Ejemplo",
        location: "Medellín, Colombia", startDate: "2019-02", endDate: "2019-12", isCurrentlyStudying: false, gpa: "4,5",
        dafpModality: "ES", dafpSemesters: "2", dafpGraduated: "yes",
        activities: [], achievements: ["Grado con mención meritoria"], order: 1,
      },
      {
        id: "d3", isVisible: true, degree: "bachelor", fieldOfStudy: "Administración Pública", institution: "Escuela Superior de Administración Pública (ejemplo)",
        location: "Medellín, Colombia", startDate: "2010-02", endDate: "2015-12", isCurrentlyStudying: false, gpa: "4,2",
        dafpModality: "UN", dafpSemesters: "10", dafpGraduated: "yes",
        activities: ["Representante estudiantil"], achievements: ["Mejor trabajo de grado de la cohorte"], order: 2,
      },
      {
        id: "d4", isVisible: true, degree: "high-school", fieldOfStudy: "Bachiller académico", institution: "Colegio de Ejemplo",
        location: "Medellín, Colombia", startDate: "2004-01", endDate: "2009-11", isCurrentlyStudying: false, gpa: "",
        activities: [], achievements: [], order: 3,
      },
    ],
    skills: [
      { id: "s1", isVisible: true, name: "Contratación estatal (SECOP II)", category: "technical", level: "expert", yearsOfExperience: 6, isCertified: false, order: 0 },
      { id: "s2", isVisible: true, name: "Excel avanzado", category: "technical", level: "advanced", yearsOfExperience: 8, isCertified: true, certificationName: "Microsoft Office Specialist", order: 1 },
      { id: "s3", isVisible: true, name: "Power BI", category: "technical", level: "intermediate", yearsOfExperience: 2, isCertified: false, order: 2 },
      { id: "s4", isVisible: true, name: "Gestión documental", category: "technical", level: "advanced", yearsOfExperience: 5, isCertified: false, order: 3 },
      { id: "s5", isVisible: true, name: "Liderazgo de equipos", category: "soft", level: "advanced", isCertified: false, order: 4 },
      { id: "s6", isVisible: true, name: "Atención al ciudadano", category: "soft", level: "expert", isCertified: false, order: 5 },
    ],
    languages: [
      { id: "l1", isVisible: true, language: "Inglés", listeningLevel: "B2", readingLevel: "C1", speakingLevel: "B2", writingLevel: "B2", certification: "IELTS 6.5", yearsOfStudy: 6, order: 0 },
      { id: "l2", isVisible: true, language: "Portugués", listeningLevel: "A2", readingLevel: "B1", speakingLevel: "A2", writingLevel: "A2", certification: "", yearsOfStudy: 1, order: 1 },
    ],
    certificates: [
      { id: "c1", isVisible: true, title: "Diplomado en Supervisión de Contratos", issuingOrganization: "Escuela de Ejemplo", issueDate: "2023-05", expiryDate: "", credentialId: "DSC-2023-0457", verificationUrl: "https://example.com/certificados/DSC-2023-0457", description: "120 horas.", order: 0 },
      { id: "c2", isVisible: true, title: "Curso de Integridad, Transparencia y Lucha contra la Corrupción", issuingOrganization: "Función Pública (ejemplo)", issueDate: "2022-09", expiryDate: "", credentialId: "", verificationUrl: "", description: "Curso virtual.", order: 1 },
    ],
    links: [
      { id: "k1", label: "LinkedIn", url: "https://www.linkedin.com/in/andrea-rojas-ejemplo", type: "linkedin", isVisible: true, order: 0 },
      { id: "k2", label: "Portafolio", url: "https://example.com/andrea-rojas", type: "portfolio", isVisible: true, order: 1 },
    ],
    application: {
      // Función Pública (DAFP)
      dafpSex: "F",
      dafpBirthPlace: "Medellín, Antioquia, Colombia",
      dafpMilitaryCard: "",
      dafpLastGrade: "11",
      dafpSchoolTitle: "Bachiller académico",
      dafpSchoolDate: "Noviembre de 2009",
      dafpProfessionalCard: "",
      // Vacíos a propósito: el tiempo total se calcula con las fechas.
      dafpTimePublic: "",
      dafpTimePrivate: "",
      dafpTimeIndependent: "",
      dafpIneligible: "No",
      dafpSignPlace: "Medellín",
      dafpSignDate: new Date().toISOString().slice(0, 10),
      // Formato 1003
      positionRequested: "Profesional especializado en contratación",
      vacancyCode: "PE-222-05",
      applicationDate: new Date().toISOString().slice(0, 10),
      salaryExpectation: "$ 6.500.000",
      vacancySource: "Portal de empleo",
      relocationAvailability: "Sí, dentro de Antioquia",
      currentEmployment: "Empleada en la Alcaldía de Ejemplo",
      previousCompanyRelation: "No",
      companyReferences: "Ninguna",
      civilStatus: "Soltera",
      housingType: "Arrendada",
      documentAvailability: "Licencia de conducción B1",
      economicSectors: "Sector público, comercio",
      workAreas: "Contratación, gestión administrativa, atención al ciudadano",
      hobbies: "Ciclismo, lectura",
      awards: "Empleada del año 2023 (Alcaldía de Ejemplo)",
      partnerName: "",
      partnerOccupation: "",
      partnerCompany: "",
      partnerPhone: "",
      dependants: "Ninguna",
      fatherDetails: "Luis Fernando Rojas, docente pensionado, 312 000 4444",
      motherDetails: "Gloria Inés de la Torre, comerciante, 314 000 5555",
      siblings: "Felipe Rojas de la Torre, ingeniero",
      emergencyContact: "Gloria Inés de la Torre (madre), 314 000 5555",
      healthProvider: "EPS de Ejemplo",
      pensionFund: "Fondo de Pensiones de Ejemplo",
      severanceFund: "Fondo de Cesantías de Ejemplo",
      additionalIncome: "No",
      financialObligations: "Crédito de vehículo",
    },
    coverLetter: {
      recipientName: "Sandra Milena Gómez",
      recipientTitle: "Jefe de Talento Humano",
      company: "Gobernación de Ejemplo",
      companyAddress: "Calle 42B # 00-00, Medellín",
      position: "Profesional especializado en contratación",
      city: "Medellín",
      date: new Date().toISOString().slice(0, 10),
      greeting: "Estimada Sandra:",
      body:
        "Me permito presentar mi candidatura al cargo de Profesional especializado en contratación (código PE-222-05).\n\n" +
        "Durante los últimos cuatro años he estructurado y supervisado procesos de contratación en la Alcaldía de Ejemplo, donde reduje a la mitad el tiempo de los procesos de mínima cuantía y mantuve el 100 % de las publicaciones en SECOP II dentro de los términos de ley.\n\n" +
        "Quedo atenta a una entrevista para ampliar esta información.",
      closing: "Cordialmente,",
    },
  };

  try {
    localStorage.removeItem("cv-editor-storage");
    localStorage.setItem("procv_guest_resume", JSON.stringify({ savedAt: Date.now(), title: cv.title, template: cv.template, data: cv }));
  } catch (error) {
    console.error("No se pudo guardar la hoja de vida de prueba:", error);
    return;
  }
  console.log("Hoja de vida de prueba cargada. Recargando el editor…");
  location.href = "/editor";
})();
