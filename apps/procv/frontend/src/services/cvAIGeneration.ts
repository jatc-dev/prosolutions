export interface AIGenerationRequest {
  prompt: string;
  section?: string;
  currentCV?: any;
}

export interface AIGenerationResponse {
  suggestion: string;
  section: string;
}

export async function generateCVContent(request: AIGenerationRequest): Promise<AIGenerationResponse> {
  // Simulated AI response - in production this would call an LLM API
  const responses: Record<string, string> = {
    summary: "Profesional con más de 5 años de experiencia en atención al cliente, coordinación de equipos y mejora de procesos. Me enfoco en cumplir metas, comunicar con claridad y ofrecer un servicio de calidad.",
    experience: "Coordiné las operaciones diarias del área, atendí a clientes y proveedores, y propuse mejoras que redujeron los tiempos de respuesta. Trabajé con equipos de distintas áreas para cumplir los objetivos.",
    skills: "Atención al cliente, Comunicación, Trabajo en equipo, Microsoft Excel, Gestión del tiempo, Negociación, Liderazgo, Resolución de problemas",
  };

  const section = request.section || 'summary';
  return {
    suggestion: responses[section] || responses.summary,
    section,
  };
}