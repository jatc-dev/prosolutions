import { withUserContext } from '../dbContext';
import { ATSAnalysisResult, ATSService, ATSTailoringResult } from './atsService';
import { randomUUID } from 'crypto';

export interface CVAtsHistoryItem {
  id: string;
  cvId: string;
  jobDescription: string;
  analysis: ATSAnalysisResult;
  tailoring: ATSTailoringResult;
  createdAt: string;
  scoreDeltaVsPrevious: number;
  keywordCoverageDeltaVsPrevious: number;
}

export interface CVAtsHistoryResponse {
  history: CVAtsHistoryItem[];
  comparison: {
    latestId: string | null;
    previousId: string | null;
    scoreDelta: number;
    keywordCoverageDelta: number;
  };
}

function parseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapHistoryItem(raw: any, previous?: any): CVAtsHistoryItem {
  const analysis = parseJSON<ATSAnalysisResult>(raw.analysis, {
    score: 0,
    sections: { completeness: 0, keywordMatch: 0, impact: 0, clarity: 0 },
    keywordCoverage: 0,
    matchedKeywords: [],
    missingKeywords: [],
    recommendations: [],
    highlights: [],
  });

  const tailoring = parseJSON<ATSTailoringResult>(raw.tailoring, {
    summary: '',
    experience: [],
    insertedKeywords: [],
  });

  const prevAnalysis = previous
    ? parseJSON<ATSAnalysisResult>(previous.analysis, {
        score: 0,
        sections: { completeness: 0, keywordMatch: 0, impact: 0, clarity: 0 },
        keywordCoverage: 0,
        matchedKeywords: [],
        missingKeywords: [],
        recommendations: [],
        highlights: [],
      })
    : null;

  return {
    id: raw.id,
    cvId: raw.cvId,
    jobDescription: raw.jobDescription || '',
    analysis,
    tailoring,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : String(raw.createdAt),
    scoreDeltaVsPrevious: prevAnalysis ? analysis.score - prevAnalysis.score : 0,
    keywordCoverageDeltaVsPrevious: prevAnalysis
      ? analysis.keywordCoverage - prevAnalysis.keywordCoverage
      : 0,
  };
}

export class CVAtsService {
  static async analyzeAndPersist(
    cvId: string,
    userId: string,
    data: unknown,
    jobDescription: string,
  ) {
    const savedResult = await withUserContext(userId, async tx => {
      const cv = await tx.cV.findFirst({ where: { id: cvId, userId } });
      if (!cv) {
        throw new Error('CV not found');
      }

      const sourceData =
        data && typeof data === 'object' ? data : parseJSON<Record<string, unknown>>(cv.data, {});
      const analysis = ATSService.analyzeCV(sourceData, jobDescription);
      const tailoring = ATSService.tailorCV(sourceData, jobDescription);
      const generatedId = randomUUID();

      const rows = await tx.$queryRaw<Array<{ id: string; createdAt: Date }>>`
        INSERT INTO "CVAtsAnalysis" ("id", "cvId", "jobDescription", "analysis", "tailoring", "cvSnapshot", "createdAt")
        VALUES (${generatedId}, ${cvId}, ${jobDescription}, ${JSON.stringify(analysis)}, ${JSON.stringify(tailoring)}, ${JSON.stringify(sourceData || {})}, NOW())
        RETURNING "id", "createdAt"
      `;
      return { saved: rows[0], analysis, tailoring };
    });
    const { saved, analysis, tailoring } = savedResult;

    if (!saved) {
      throw new Error('Failed to persist ATS analysis');
    }

    return {
      id: saved.id,
      analysis,
      tailoring,
      createdAt: saved.createdAt.toISOString(),
    };
  }

  static async getHistory(
    cvId: string,
    userId: string,
    limit: number = 12,
  ): Promise<CVAtsHistoryResponse> {
    const rows = await withUserContext(userId, async tx => {
      const cv = await tx.cV.findFirst({ where: { id: cvId, userId }, select: { id: true } });
      if (!cv) {
        throw new Error('CV not found');
      }

      return tx.$queryRaw<Array<{
        id: string;
        cvId: string;
        jobDescription: string;
        analysis: string;
        tailoring: string;
        createdAt: Date;
      }>>`
        SELECT "id", "cvId", "jobDescription", "analysis", "tailoring", "createdAt"
        FROM "CVAtsAnalysis"
        WHERE "cvId" = ${cvId}
        ORDER BY "createdAt" DESC
        LIMIT ${Math.max(1, Math.min(limit, 30))}
      `;
    });

    const history = rows.map((row: any, index: number) => mapHistoryItem(row, rows[index + 1]));

    const latest = history[0];
    const previous = history[1];

    return {
      history,
      comparison: {
        latestId: latest?.id || null,
        previousId: previous?.id || null,
        scoreDelta: latest ? latest.scoreDeltaVsPrevious : 0,
        keywordCoverageDelta: latest ? latest.keywordCoverageDeltaVsPrevious : 0,
      },
    };
  }
}
