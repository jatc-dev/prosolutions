import type { CandidateProfile, CvOption } from '../contracts.js';
import { normalizeSkills } from '../domain/skills.js';
import { HttpError, badGateway, notFound } from '../http/errors.js';

/**
 * Read-only client for ProCV. ProJobs never stores ProCV credentials: it calls
 * ProCV on behalf of the signed-in candidate with that candidate's own bearer
 * token, so ProCV's authorization and RLS remain the single source of truth.
 */
export interface ProCvClient {
  listCvs(token: string): Promise<CvOption[]>;
  getProfile(token: string, cvId: string): Promise<CandidateProfile>;
}

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);
const list = (value: unknown): Json[] => (Array.isArray(value) ? value.filter(isRecord) : []);
const visible = (item: Json) => item.isVisible !== false;

/** Map ProCV's CV document (`cv.data`) to the immutable application snapshot. */
export function toCandidateProfile(data: unknown): CandidateProfile {
  const cv = isRecord(data) ? data : {};
  const personal = isRecord(cv.personal) ? cv.personal : {};
  const primaryFirst = (items: Json[]) =>
    items.filter(visible).sort((a, b) => Number(b.isPrimary === true) - Number(a.isPrimary === true));
  const emails = primaryFirst(list(personal.emails));
  const phones = primaryFirst(list(personal.phones));
  const experience = list(cv.experience).filter(visible);

  const skills = normalizeSkills([
    ...list(cv.skills).filter(visible).map((skill) => String(skill.name ?? '')),
    ...experience.flatMap((item) => (Array.isArray(item.technologies) ? item.technologies.map(String) : [])),
  ], 60);

  const location = [str(personal.city), str(personal.country)].filter(Boolean).join(', ') || null;
  const candidates: Array<{ label: string; url: string | null }> = [
    ...(['linkedin', 'github', 'website'] as const).map((key) => ({ label: key, url: str(personal[key]) })),
    ...list(cv.links).filter(visible).map((link) => ({ label: str(link.label) ?? 'link', url: str(link.url) })),
  ];
  const links: CandidateProfile['links'] = candidates
    .filter((link): link is { label: string; url: string } => !!link.url && /^https?:\/\//i.test(link.url))
    .slice(0, 8);

  return {
    fullName: str(personal.fullName) ?? 'Candidato',
    email: str(emails[0]?.value),
    phone: str(phones[0]?.number),
    headline: str(personal.professionalTitle),
    summary: str(personal.summary)?.slice(0, 2000) ?? null,
    location,
    skills,
    experience: experience.slice(0, 10).map((item) => ({
      position: str(item.position) ?? '',
      company: str(item.company) ?? '',
      startDate: str(item.startDate),
      endDate: str(item.endDate),
      current: item.isCurrentPosition === true,
    })),
    education: list(cv.education)
      .filter(visible)
      .slice(0, 6)
      .map((item) => ({ degree: str(item.degree) ?? '', institution: str(item.institution) ?? '', endDate: str(item.endDate) })),
    links,
  };
}

export function createProCvClient(options: { baseUrl: string; timeoutMs: number; fetchImpl?: typeof fetch }): ProCvClient {
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request(path: string, token: string): Promise<Json> {
    let response: Response;
    try {
      response = await fetchImpl(`${options.baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(options.timeoutMs),
      });
    } catch {
      throw badGateway('ProCV is unavailable, try again shortly', 'procv_unavailable');
    }
    if (response.status === 404) throw notFound('CV not found in ProCV');
    if (response.status === 401 || response.status === 403) {
      throw new HttpError(403, 'procv_access_required', 'Your account has no access to ProCV');
    }
    if (!response.ok) throw badGateway(`ProCV responded ${response.status}`, 'procv_error');
    const body: unknown = await response.json().catch(() => null);
    if (!isRecord(body)) throw badGateway('ProCV returned an invalid payload', 'procv_error');
    return body;
  }

  return {
    async listCvs(token) {
      const body = await request('/api/cvs?limit=50', token);
      return list(body.cvs)
        .map((cv): CvOption | null => {
          const id = str(cv.id);
          if (!id) return null;
          const data = isRecord(cv.data) ? cv.data : {};
          const profile = toCandidateProfile(data);
          return {
            id,
            title: str(cv.title) ?? 'CV sin título',
            updatedAt: str(cv.updatedAt) ?? new Date(0).toISOString(),
            headline: profile.headline,
            skillCount: profile.skills.length,
          };
        })
        .filter((cv): cv is CvOption => cv !== null)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async getProfile(token, cvId) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(cvId)) throw notFound('CV not found in ProCV');
      const body = await request(`/api/cvs/${encodeURIComponent(cvId)}`, token);
      const cv = isRecord(body.cv) ? body.cv : body;
      return toCandidateProfile(cv.data);
    },
  };
}
