import type { CVData } from "../types";
import { api } from "./api";

export type AISection = "summary" | "experience" | "skills" | "valueProposition" | "coverLetter";

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
  if (section === "valueProposition") return cv.personal?.valueProposition ?? "";
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

/**
 * Whether the server has the AI assistant configured (it needs a signed-in
 * user to be used). Several fields ask at once, so the answer is shared for a
 * few minutes; a failed check is retried on the next call.
 */
let availability: { at: number; value: Promise<boolean> } | null = null;
const AVAILABILITY_TTL_MS = 5 * 60 * 1000;
export function isAiAvailable(): Promise<boolean> {
  if (availability && Date.now() - availability.at < AVAILABILITY_TTL_MS) return availability.value;
  const value = api
    .get("/ai/status")
    .then(({ data }) => Boolean(data?.available))
    .catch(() => {
      availability = null;
      return false;
    });
  availability = { at: Date.now(), value };
  return value;
}

/** Test hook. */
export function resetAiAvailabilityForTests(): void {
  availability = null;
}

/** Improves one piece of CV text (a field), with the saved CV as context. */
export async function improveText(request: { section: AISection; text: string; instruction: string; cvId?: string }): Promise<AIGenerationResponse> {
  try {
    const { data } = await api.post("/ai/improve", {
      section: request.section,
      instruction: request.instruction,
      text: request.text,
      ...(request.cvId ? { cvId: request.cvId } : {}),
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

/** Ask the ProCV AI assistant (server-side) to improve a whole CV section. */
export function generateCVContent(request: AIGenerationRequest): Promise<AIGenerationResponse> {
  return improveText({
    section: request.section,
    instruction: request.prompt,
    text: sectionText(request.currentCV, request.section),
    cvId: request.currentCV.id,
  });
}
