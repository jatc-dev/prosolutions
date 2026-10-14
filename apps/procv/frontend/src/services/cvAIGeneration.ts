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
    summary: "Profesional con más de 5 años de experiencia en desarrollo de software, especializado en tecnologías JavaScript/TypeScript y arquitecturas cloud. Lideré equipos de desarrollo y optimicé aplicaciones para mejorar el rendimiento.",
    experience: "Desarrollé y mantuve aplicaciones web utilizando React, Node.js y bases de datos SQL/NoSQL. Implementé APIs RESTful y trabajé en equipos ágiles.",
    skills: "JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, Docker, AWS, CI/CD, Leadership, Agile",
  };

  const section = request.section || 'summary';
  return {
    suggestion: responses[section] || responses.summary,
    section,
  };
}