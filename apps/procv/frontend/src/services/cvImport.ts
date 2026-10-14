import { api } from "./api";

export interface ParsedCvDraft {
  personal?: {
    fullName?: string;
    professionalTitle?: string;
    valueProposition?: string;
    showValuePropositionTitle?: boolean;
    summary?: string;
    address?: string;
    website?: string;
    linkedin?: string;
    github?: string;
    emails?: Array<{ value: string; type: string; label?: string; isPrimary?: boolean }>;
    phones?: Array<{ number: string; type: string; label?: string; isPrimary?: boolean }>;
  };
  experience?: Array<Record<string, unknown>>;
  education?: Array<Record<string, unknown>>;
  skills?: Array<Record<string, unknown>>;
  languages?: Array<Record<string, unknown>>;
  certificates?: Array<Record<string, unknown>>;
  links?: Array<Record<string, unknown>>;
}

export async function importCvFromFile(file: File): Promise<{ parsedData: ParsedCvDraft }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<{ parsedData: ParsedCvDraft }>("/cvs/import/parse", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}