import type { JobDetail } from "../../server/src/contracts";

/**
 * schema.org JobPosting for Google for Jobs.
 * Emitted only for open jobs (published and not past their closing date):
 * expired postings must not keep structured data.
 */
const EMPLOYMENT_TYPE: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
  temporary: "TEMPORARY",
};

const SALARY_UNIT: Record<string, string> = { year: "YEAR", month: "MONTH", hour: "HOUR" };

/** Default validity when the employer did not set a closing date. */
const DEFAULT_VALIDITY_DAYS = 60;

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function list(title: string, items: string[]): string {
  return items.length ? `<p><strong>${escapeHtml(title)}</strong></p><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";
}

export function isJobOpen(job: Pick<JobDetail, "status" | "closesAt">, now = new Date()): boolean {
  return job.status === "published" && (!job.closesAt || new Date(job.closesAt) > now);
}

export function buildJobPostingJsonLd(job: JobDetail, webUrl: string, now = new Date()): Record<string, unknown> | null {
  if (!isJobOpen(job, now) || !job.publishedAt) return null;
  const posted = new Date(job.publishedAt);
  const validThrough = job.closesAt
    ? new Date(job.closesAt)
    : new Date(posted.getTime() + DEFAULT_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
  if (validThrough <= now) return null;

  const description = [
    `<p>${escapeHtml(job.description).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>")}</p>`,
    list("Responsabilidades", job.responsibilities),
    list("Requisitos", job.requirements),
    list("Beneficios", job.benefits),
  ].join("");

  const posting: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description,
    identifier: { "@type": "PropertyValue", name: job.company.name, value: job.id },
    datePosted: posted.toISOString(),
    validThrough: validThrough.toISOString(),
    employmentType: EMPLOYMENT_TYPE[job.employmentType] ?? "OTHER",
    hiringOrganization: {
      "@type": "Organization",
      name: job.company.name,
      ...(job.companyProfile.website ? { sameAs: job.companyProfile.website } : {}),
      ...(job.company.logoUrl ? { logo: job.company.logoUrl } : {}),
    },
    directApply: true,
    url: `${webUrl.replace(/\/+$/, "")}/empleos/${encodeURIComponent(job.slug)}`,
  };

  const address = {
    "@type": "PostalAddress",
    ...(job.location.city ? { addressLocality: job.location.city } : {}),
    ...(job.location.country ? { addressCountry: job.location.country } : {}),
  };
  if (job.workplace === "remote") {
    posting.jobLocationType = "TELECOMMUTE";
    if (job.location.country) {
      posting.applicantLocationRequirements = { "@type": "Country", name: job.location.country };
    }
  } else {
    posting.jobLocation = { "@type": "Place", address };
  }

  if (job.salary && (job.salary.min != null || job.salary.max != null)) {
    posting.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salary.currency.toUpperCase(),
      value: {
        "@type": "QuantitativeValue",
        ...(job.salary.min != null ? { minValue: job.salary.min } : {}),
        ...(job.salary.max != null ? { maxValue: job.salary.max } : {}),
        unitText: SALARY_UNIT[job.salary.period] ?? "MONTH",
      },
    };
  }
  return posting;
}

const SCRIPT_ID = "jobposting-jsonld";

/** Inject (or remove) the JobPosting script, canonical URL and meta description. */
export function applyJobSeo(job: JobDetail | null, webUrl: string): () => void {
  document.getElementById(SCRIPT_ID)?.remove();
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const previousCanonical = canonical?.href ?? null;
  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  const previousDescription = description?.content ?? null;

  if (job) {
    const data = buildJobPostingJsonLd(job, webUrl);
    if (data) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = SCRIPT_ID;
      // JSON.stringify output is safe inside a script element once "<" is escaped.
      script.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
      document.head.appendChild(script);
    }
    const url = `${webUrl.replace(/\/+$/, "")}/empleos/${encodeURIComponent(job.slug)}`;
    if (canonical) canonical.href = url;
    else {
      const link = document.createElement("link");
      link.rel = "canonical";
      link.href = url;
      link.dataset.jobSeo = "true";
      document.head.appendChild(link);
    }
    if (description) description.content = (job.summary || job.description).slice(0, 160);
  }

  return () => {
    document.getElementById(SCRIPT_ID)?.remove();
    document.querySelector('link[data-job-seo="true"]')?.remove();
    if (canonical && previousCanonical) canonical.href = previousCanonical;
    if (description && previousDescription != null) description.content = previousDescription;
  };
}
