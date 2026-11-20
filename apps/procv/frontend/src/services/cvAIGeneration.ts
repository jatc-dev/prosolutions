import type { CVData } from "../types";
import { api } from "./api";

export type AISection = "summary" | "experience" | "skills" | "coverLetter";

export interface AIGenerationRequest {
  /** What the user wants (e.g. "hazlo más conciso"). */
  prompt: string;
  section: AISection;
  currentCV: CVData;
}

export interface AIGenerationResponse {
  suggestion: string;
  section: AISection;
  /** What the assistant improved. */
  changes: string[];
  /** Facts the user should add or confirm (the assistant never invents them). */
  needsUserInput: string[];
}

export class AIGenerationError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

/** Text of the section the assistant will improve. */
export function sectionText(cv: CVData, section: AISection): string {
  if (section === "summary") return cv.personal?.summary ?? "";
  if (section === "skills") return (cv.skills ?? []).map((skill) => skill.name).filter(Boolean).join(", ");
  if (section === "coverLetter") return cv.coverLetter?.body ?? "";
  const latest = cv.experience?.[0];
  if (!latest) return "";
  return [
    [latest.position, latest.company].filter(Boolean).join(" - "),
    latest.description,
    ...(latest.achievements ?? []).map((achievement) => `- ${achievement}`),
  ]
    .filter(Boolean)
    .join("\n");
}

/** Whether the server has the AI assistant configured (it needs a signed-in user to be used). */
export async function isAiAvailable(): Promise<boolean> {
  try {
    const { data } = await api.get("/ai/status");
    return Boolean(data?.available);
  } catch {
    return false;
  }
}

/** Ask the ProCV AI assistant (Claude, server-side) to improve a CV section. */
export async function generateCVContent(request: AIGenerationRequest): Promise<AIGenerationResponse> {
  try {
    const { data } = await api.post("/ai/improve", {
      section: request.section,
      instruction: request.prompt,
      text: sectionText(request.currentCV, request.section),
      ...(request.currentCV.id ? { cvId: request.currentCV.id } : {}),
    });
    return {
      suggestion: data.suggestion,
      section: request.section,
      changes: Array.isArray(data.changes) ? data.changes : [],
      needsUserInput: Array.isArray(data.needsUserInput) ? data.needsUserInput : [],
    };
  } catch (error) {
    const response = (error as { response?: { data?: { message?: string; code?: string } } }).response;
    throw new AIGenerationError(
      response?.data?.message || "No se pudo generar la sugerencia. Inténtalo de nuevo.",
      response?.data?.code || "ai_error",
    );
  }
}
