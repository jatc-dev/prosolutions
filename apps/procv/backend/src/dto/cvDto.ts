// DTOs for CV operations
export interface CreateCVRequest {
  title: string;
  template?: string;
  data: Record<string, unknown>;
}

export interface UpdateCVRequest {
  title?: string;
  template?: string;
  data?: Record<string, unknown>;
}

export interface CVResponse {
  id: string;
  userId: string;
  title: string;
  template: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CVVersionResponse {
  id: string;
  cvId: string;
  snapshot: Record<string, unknown>;
  createdAt: string;
}

export interface ATSAnalyzeRequest {
  jobDescription?: string;
  data?: Record<string, unknown>;
}

export interface ATSRecommendationResponse {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  section: 'general' | 'personal' | 'experience' | 'education' | 'skills' | 'keywords';
}

export interface ATSAnalyzeResponse {
  score: number;
  sections: {
    completeness: number;
    keywordMatch: number;
    impact: number;
    clarity: number;
  };
  keywordCoverage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendations: ATSRecommendationResponse[];
  highlights: string[];
}

export interface ATSTailoringExperienceResponse {
  id?: string;
  index: number;
  original: string;
  tailored: string;
}

export interface ATSTailoringResponse {
  summary: string;
  experience: ATSTailoringExperienceResponse[];
  insertedKeywords: string[];
}

export interface ATSHistoryItemResponse {
  id: string;
  cvId: string;
  jobDescription: string;
  analysis: ATSAnalyzeResponse;
  tailoring: ATSTailoringResponse;
  createdAt: string;
  scoreDeltaVsPrevious: number;
  keywordCoverageDeltaVsPrevious: number;
}

export interface ATSHistoryResponse {
  history: ATSHistoryItemResponse[];
  comparison: {
    latestId: string | null;
    previousId: string | null;
    scoreDelta: number;
    keywordCoverageDelta: number;
  };
}
