from datetime import datetime
import json
import os
import sys
import urllib.request
import urllib.parse
from html import escape

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# Configuración básica
# ---------------------------------------------------------------------------
SITE_URL = "https://projobs.prosolutions.page/"
SITE_TITLE = "ProJobs - Empleos Tech y Más"
SITE_DESC = "Encuentra empleo en tecnología, administración, ventas, salud, educación y más. Actualizado diariamente."

PROCV_URL = "https://procv.prosolutions.page"
CORE_URL = "/"
JATC_URL = "https://github.com/jatc-dev"

ADSENSE_CLIENT = os.environ.get("VITE_ADSENSE_CLIENT", "").strip() or "ca-pub-3956322934366702"
if ADSENSE_CLIENT.startswith("pub-"):
    ADSENSE_CLIENT = "ca-" + ADSENSE_CLIENT
ADS_EVERY = 6

ADSENSE_SCRIPT_TAG = (
    '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT + '" crossorigin="anonymous"></script>'
    if ADSENSE_CLIENT
    else ""
)


def ad_block(placement: str) -> str:
    if ADSENSE_CLIENT:
        return (
            '<ins class="adsbygoogle" '
            'style="display:block" '
            'data-ad-client="' + ADSENSE_CLIENT + '" '
            'data-ad-format="fluid" '
            'data-full-width-responsive="true" '
            'data-ad-placement="' + placement + '"></ins>'
            '<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>'
        )
    return (
        '<div class="pro-ad-slot" data-ad-placement="' + placement + '" role="complementary" aria-label="Espacio publicitario">'
        '<p class="pro-ad-label">Espacio publicitario</p>'
        '<p class="pro-ad-hint">Google AdSense &middot; ' + placement + '</p>'
        '</div>'
    )


SECTOR_TAXONOMY = {
    "tecnologia": "Tecnología y Datos",
    "finanzas": "Administración, Finanzas y Contabilidad",
    "ventas": "Ventas, Marketing y Atención al Cliente",
    "ingenieria": "Ingeniería, Industria y Mantenimiento",
    "salud": "Salud y Ciencias de la Vida",
    "educacion": "Educación y Formación",
    "logistica": "Logística, Transporte y Operaciones",
    "construccion": "Construcción y Oficios",
    "hosteleria": "Hostelería, Turismo y Restauración",
    "recursos-humanos": "Recursos Humanos y Servicios Profesionales",
    "sector-publico": "Sector Público y Organizaciones Sociales",
    "otras": "Otras Áreas y Ofertas",
}

SECTOR_MAP = {
    "software-development": "tecnologia",
    "web-development": "tecnologia",
    "data-science": "tecnologia",
    "devops": "tecnologia",
    "it": "tecnologia",
    "it-systems": "tecnologia",
    "programming": "tecnologia",
    "accounting": "finanzas",
    "finance": "finanzas",
    "administration": "administracion",
    "sales": "ventas",
    "marketing": "marketing",
    "customer-service": "atencion-cliente",
    "customer-support": "atencion-cliente",
    "engineering": "ingenieria",
    "manufacturing": "ingenieria",
    "healthcare": "salud",
    "medicine": "salud",
    "education": "educacion",
    "training": "educacion",
    "logistics": "logistica",
    "transport": "logistica",
    "supply-chain": "logistica",
    "construction": "construccion",
    "trades": "construccion",
    "hospitality": "hosteleria",
    "tourism": "hosteleria",
    "restaurant": "hosteleria",
    "human-resources": "recursos-humanos",
    "legal": "servicios-profesionales",
    "consulting": "servicios-profesionales",
    "government": "sector-publico",
    "public-sector": "sector-publico",
    "software-dev": "tecnologia",
    "devops-sysadmin": "tecnologia",
    "design-ux": "tecnologia",
    "data": "tecnologia",
    "product": "tecnologia",
    "customer-support": "atencion-cliente",
    "finance": "finanzas",
    "hr": "recursos-humanos",
    "operations": "logistica",
    "admin": "administracion",
    # Identidades: claves del SECTOR_TAXONOMY mapeadas a sí mismas
    "tecnologia": "tecnologia",
    "finanzas": "finanzas",
    "ventas": "ventas",
    "ingenieria": "ingenieria",
    "salud": "salud",
    "educacion": "educacion",
    "logistica": "logistica",
    "construccion": "construccion",
    "hosteleria": "hosteleria",
    "recursos-humanos": "recursos-humanos",
    "sector-publico": "sector-publico",
    "otras": "otras",
}

STOP_WORDS = {
    "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "o", "a", "an",
    "the", "and", "or", "of", "in", "on", "at", "to", "for", "with", "by",
    "from", "as", "is", "are", "was", "were", "be", "been", "being",
    "de", "del", "que", "en", "con", "por", "para", "porque", "como",
    "cuando", "donde", "quien", "cual", "cuales", "este", "esta", "ese",
    "esa", "estos", "estas", "ese", "esa", "esos", "esas", "mi", "tu",
    "su", "mis", "tus", "sus", "yo", "tú", "él", "ella", "nosotros",
    "nosotras", "ellos", "ellas",
}

SKILL_HINTS = [
    "javascript", "typescript", "node", "react", "angular", "vue",
    "python", "java", "c#", "c++", "sql", "postgres", "mysql",
    "mongodb", "redis", "docker", "kubernetes", "aws", "azure",
    "gcp", "git", "linux", "ci/cd", "terraform", "prisma",
    "tailwind", "express", "graphql", "rest", "api", "agile",
    "scrum", "kanban", "figma", "seo", "analytics", "tableau",
    "power bi", "excel", "salesforce", "sap", "machine learning",
    "ai", "llm",
]


def normalize_country(location: str | None) -> str:
    if not location:
        return "desconocido"
    location = location.strip()
    if "," in location:
        parts = [p.strip() for p in location.split(",")]
        if len(parts) >= 2:
            return parts[-1]
    return location


def normalize_modality(remote_value: any) -> str:
    if remote_value is True or remote_value == "remote":
        return "remoto"
    if isinstance(remote_value, str):
        return {
            "remote": "remoto",
            "on-site": "presencial",
            "hybrid": "híbrido",
            "remoto": "remoto",
            "presencial": "presencial",
            "híbrido": "híbrido",
            "hibrido": "híbrido",
        }.get(remote_value.lower(), "no-especificado")
    return "no-especificado"


def normalize_contract_type(job_type: str | None) -> str:
    if not job_type:
        return "no-especificado"
    mapping = {
        "full-time": "indefinido",
        "part-time": "parcial",
        "contract": "temporal",
        "freelance": "freelance",
        "internship": "prácticas",
        "indefinido": "indefinido",
        "temporal": "temporal",
        "prácticas": "prácticas",
        "practicas": "prácticas",
    }
    return mapping.get(job_type.lower(), job_type.lower())


def normalize_job_type(job_type: str | None) -> str:
    if not job_type:
        return "no-especificado"
    mapping = {"full-time": "completa", "part-time": "parcial",
               "completa": "completa", "parcial": "parcial"}
    return mapping.get(job_type.lower(), job_type.lower())


def normalize_experience(level: str | None) -> str:
    if not level:
        return "no-especificado"
    mapping = {
        "entry": "junior", "mid": "medio", "senior": "senior",
        "lead": "senior", "executive": "senior",
        "junior": "junior", "medio": "medio", "senior": "senior",
    }
    return mapping.get(level.lower(), "no-especificado")


def normalize_salary(salary: str | None) -> dict | None:
    if not salary:
        return None
    return {"raw": salary.strip()}


def normalize_sector(category: str | None, *extra_fields) -> str:
    for value in (category, *extra_fields):
        if not value:
            continue
        mapped = SECTOR_MAP.get(str(value).lower())
        if mapped:
            return mapped
    return "otras"


def normalize_job(job: dict, source: str) -> dict | None:
    title = job.get("title") or job.get("title_raw") or ""
    company = job.get("company_name") or job.get("company") or ""
    location = job.get("location") or job.get("candidate_required_location") or ""
    url = job.get("url") or ""

    if not title or not url:
        return None

    if not is_valid_url(url):
        return None

    country = normalize_country(location)
    sector = normalize_sector(
        job.get("category"),
        job.get("tags"),
        job.get("tags_raw"),
    )
    remote = job.get("remote", False)
    modality = normalize_modality(remote)
    contract_type = normalize_contract_type(
        job.get("job_type") or job.get("contract_type"))
    job_type = normalize_job_type(job.get("job_type"))
    experience = normalize_experience(job.get("experience_level"))
    salary = normalize_salary(job.get("salary"))

    result = {
        "title": title.strip(),
        "company": company.strip(),
        "location": location.strip(),
        "country": country,
        "url": url,
        "source": source,
        "sector": sector,
        "modality": modality,
        "contract_type": contract_type,
        "job_type": job_type,
        "experience": experience,
        "salary": salary,
        "date_published": job.get("date_published") or "",
        "description": job.get("description", "") or "",
    }

    job.update({
        "country": country,
        "source": source,
        "sector": sector,
        "modality": modality,
        "contract_type": contract_type,
        "job_type": job_type,
        "experience": experience,
        "salary": salary,
    })

    return result


def is_valid_url(url: str) -> bool:
    if not url:
        return False
    try:
        parsed = urllib.parse.urlparse(url)
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except Exception:
        return False


def canonical_url(url: str) -> str:
    try:
        parsed = urllib.parse.urlparse(url.lower())
        query = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        clean_query = {
            k: v for k, v in query.items()
            if k.lower() not in ("utm_source", "utm_medium", "utm_campaign",
                                 "utm_term", "utm_content", "fbclid",
                                 "igshid", "ref", "source")
        }
        new_query = urllib.parse.urlencode(clean_query, doseq=True)
        return urllib.parse.urlunparse(
            (parsed.scheme, parsed.netloc, parsed.path,
             parsed.params, new_query, ""))
    except Exception:
        return url.lower()


def deduplicate_jobs(jobs: list[dict]) -> list[dict]:
    seen_urls = set()
    seen_keys = set()
    result = []
    for job in jobs:
        canon = canonical_url(job["url"])
        key = (
            job["company"].lower(),
            job["title"].lower(),
            job["location"].lower(),
        )
        if canon in seen_urls or key in seen_keys:
            continue
        seen_urls.add(canon)
        seen_keys.add(key)
        result.append(job)
    return result


def fetch_json(url: str, timeout: int = 15) -> list | dict | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception:
        return None


def fetch_arbeitnow() -> list[dict]:
    try:
        data = fetch_json("https://www.arbeitnow.com/api/job-board-api")
        if not data:
            return []
        jobs = data.get("data", [])[:50]
        result = []
        for job in jobs:
            normalized = normalize_job(job, "Arbeitnow")
            if normalized:
                result.append(normalized)
        return result
    except Exception:
        return []


def fetch_remotive() -> list[dict]:
    try:
        data = fetch_json("https://remotive.com/api/remote-jobs?limit=50")
        if not data:
            return []
        jobs = data.get("jobs", [])[:50]
        result = []
        for job in jobs:
            normalized = normalize_job(job, "Remotive")
            if normalized:
                result.append(normalized)
        return result
    except Exception:
        return []


def fetch_all_jobs() -> list[dict]:
    all_jobs = []
    for fetcher in (fetch_arbeitnow, fetch_remotive):
        try:
            fetched = fetcher()
            all_jobs.extend(fetched)
        except Exception:
            continue
    all_jobs = deduplicate_jobs(all_jobs)
    all_jobs.sort(key=lambda j: (j.get("date_published") or "", j["title"]),
                  reverse=True)
    return all_jobs


def escape_html(text: str) -> str:
    return escape(str(text or ""), quote=True)


def jobs_to_json_script(jobs: list[dict]) -> str:
    jobs_json = json.dumps(jobs, ensure_ascii=False)
    jobs_json = (
        jobs_json.replace("&", "\\u0026")
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
    )
    return f'''<script id="projobs-data" type="application/json">
{jobs_json}
</script>'''


def render_job_card(job: dict) -> str:
    salary_text = ""
    if job.get("salary") and job["salary"].get("raw"):
        salary_text = "💰 " + job["salary"]["raw"]

    experience_text = ""
    if job.get("experience") and job["experience"] != "no-especificado":
        experience_text = " • " + job["experience"].title()

    return ('        <article class="job-card" data-country="' + escape_html(job['country']) + '"\n'
            '             data-sector="' + escape_html(job['sector']) + '"\n'
            '             data-modality="' + escape_html(job['modality']) + '"\n'
            '             data-contract="' + escape_html(job['contract_type']) + '"\n'
            '             data-jobtype="' + escape_html(job['job_type']) + '"\n'
            '             data-experience="' + escape_html(job['experience']) + '"\n'
            '             data-date="' + escape_html(job.get('date_published','')) + '">\n'
            '            <span class="badge">Fuente: ' + escape_html(job['source']) + '</span>\n'
            '            <h2 class="job-title">' + escape_html(job['title']) + '</h2>\n'
            '            <div class="job-info">\n'
            '                🏢 <strong>' + escape_html(job['company']) + '</strong>\n'
            '                &nbsp;|&nbsp; 📍 ' + escape_html(job['location']) + '\n'
            + (f" · {escape_html(job['country'])}" if job['country'] != job['location'] else "")
            + (f" · {salary_text}" if salary_text else "")
            + experience_text
            + '            </div>\n'
            '            <div class="job-tags">\n'
            '                <span class="badge">' + escape_html(job['modality'].title()) + '</span>\n'
            '                <span class="badge">' + escape_html(job['contract_type'].title()) + '</span>\n'
            '                <span class="badge">' + escape_html(job['sector'].title()) + '</span>\n'
            '            </div>\n'
            '            <a href="' + escape_html(job['url']) + '" class="btn" target="_blank"\n'
            '               rel="noopener sponsored">Ver Oferta Completa</a>\n'
            '        </article>\n    ')


def render_filters_html() -> str:
    sectors_options = "".join(
        f'<option value="{k}">{v}</option>'
        for k, v in SECTOR_TAXONOMY.items()
    )
    return f'''
    <div class="filters-panel">
        <div class="filters-header">
            <h3>🔍 Filtros de búsqueda</h3>
            <button type="button" id="resetFilters" class="btn-reset">
                Limpiar filtros
            </button>
            <span class="active-filters" id="activeFiltersCount">0 activos</span>
        </div>
        <div class="filters-grid">
            <div class="filter-group">
                <label for="countryFilter">País</label>
                <select id="countryFilter">
                    <option value="">Todos los países</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="sectorFilter">Sector</label>
                <select id="sectorFilter">
                    <option value="">Todos los sectores</option>
                    {sectors_options}
                </select>
            </div>
            <div class="filter-group">
                <label for="modalityFilter">Modalidad</label>
                <select id="modalityFilter">
                    <option value="">Todas</option>
                    <option value="remoto">Remoto</option>
                    <option value="presencial">Presencial</option>
                    <option value="híbrido">Híbrido</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="contractFilter">Tipo de contrato</label>
                <select id="contractFilter">
                    <option value="">Todos</option>
                    <option value="indefinido">Indefinido</option>
                    <option value="temporal">Temporal</option>
                    <option value="prácticas">Prácticas</option>
                    <option value="freelance">Freelance</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="jobTypeFilter">Jornada</label>
                <select id="jobTypeFilter">
                    <option value="">Todas</option>
                    <option value="completa">Completa</option>
                    <option value="parcial">Parcial</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="experienceFilter">Experiencia</label>
                <select id="experienceFilter">
                    <option value="">Cualquier nivel</option>
                    <option value="junior">Junior</option>
                    <option value="medio">Medio</option>
                    <option value="senior">Senior</option>
                </select>
            </div>
        </div>
    </div>
    '''


def render_jobs_html(jobs: list[dict]) -> str:
    if not jobs:
        return '''
        <div class="no-results">
            <p>No se encontraron ofertas que coincidan con tu búsqueda. 🔍</p>
        </div>
        '''
    cards = "".join(render_job_card(job) for job in jobs)
    return f'''
    <main id="jobsList">
        {cards}
    </main>
    '''


CSS_STYLES = """
        /* Reset y base */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f8fafc;
            color: #0f172a;
            line-height: 1.5;
        }
        header { text-align: center; margin-bottom: 25px; }
        h1 { color: #3f6ff5; margin-bottom: 8px; font-size: 1.8rem; }
        .subtitle { color: #64748b; font-size: 0.95rem; margin-top: 0; }

        .search-container { margin-bottom: 20px; text-align: center; }
        .search-input {
            width: 100%; max-width: 700px; padding: 14px 18px; font-size: 1rem;
            border: 2px solid #e2e8f0; border-radius: 8px; box-sizing: border-box;
            outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .search-input:focus { border-color: #3f6ff5; box-shadow: 0 0 0 3px rgba(63, 111, 245, 0.15); }

        .promo-banner {
            background: linear-gradient(135deg, #3f6ff5, #244bd9);
            color: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;
            text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .promo-banner h3 { margin: 0 0 8px 0; font-size: 1.2rem; }
        .promo-banner p { margin: 0 0 15px 0; font-size: 0.95rem; opacity: 0.9; }
        .promo-btn {
            display: inline-block; background: #2da44e; color: white;
            padding: 10px 20px; text-decoration: none; border-radius: 6px;
            font-weight: bold; font-size: 0.9rem;
        }
        .promo-btn:hover { background: #2c974b; }

        .badge {
            display: inline-block; background: #e1f5fe; color: #0288d1;
            font-size: 0.8rem; font-weight: bold; padding: 3px 8px;
            border-radius: 4px; margin-bottom: 8px;
        }
        .job-card {
            background: white;             border: 1px solid #e2e8f0; border-radius: 8px;
            padding: 20px; margin-bottom: 16px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.03); transition: transform 0.1s ease;
        }
        .job-card:hover { transform: translateY(-2px); }
        .job-title { font-size: 1.2rem; font-weight: 600; color: #3f6ff5; margin: 0 0 6px 0; }
        .job-info { color: #64748b; font-size: 0.9rem; margin-bottom: 14px; }
        .job-tags { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
        .job-tags .badge { font-size: 0.75rem; }
        .btn {
            display: inline-block; background: #10b981; color: white;
            padding: 10px 20px; text-decoration: none; border-radius: 6px;
            font-size: 0.9rem; font-weight: 600;
        }
        .btn:hover { background: #059669; }

        .no-results {
            display: none; text-align: center; color: #57606a;
            padding: 30px; font-size: 1.05rem;
        }

        .filters-panel {
            background: white;             border: 1px solid #e2e8f0; border-radius: 8px;
            padding: 16px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.03);
        }
        .filters-header {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 16px;
        }
        .filters-header h3 { margin: 0; font-size: 1rem; color: #0f172a; }
        .filters-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
        }
        .filter-group label {
            display: block; font-size: 0.85rem; font-weight: 600;
            color: #475569; margin-bottom: 6px;
        }
        .filter-group select {
            width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1;
            border-radius: 6px; background: white; font-size: 0.9rem;
            color: #1e293b;
        }
        .btn-reset {
            background: none;             border: 1px solid #e2e8f0; border-radius: 6px;
            padding: 6px 12px; font-size: 0.9rem; color: #475569;
            cursor: pointer;
        }
        .btn-reset:hover { background: #f8fafc; }
        .active-filters { font-size: 0.85rem; color: #64748b; font-weight: 600; }
        .no-results {
            display: none; text-align: center; color: #57606a;
            padding: 30px; font-size: 1.05rem;
        }

        .pro-footer { background: #ffffff; border-top: 1px solid #e2e8f0; }
        .pro-footer-inner { max-width: 80rem; margin: 0 auto; padding: 48px 16px 24px; }
        .pro-footer-grid { display: grid; gap: 32px; grid-template-columns: 1fr; }
        @media (min-width: 768px) { .pro-footer-grid { grid-template-columns: 1.4fr 1fr 1fr; } }
        .pro-footer h4 {
            font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.16em; color: #94a3b8; margin: 0 0 12px;
        }
        .pro-footer ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
        .pro-footer a { color: #475569; text-decoration: none; font-size: 14px; }
        .pro-footer a:hover { color: #4f46e5; }
        .pro-footer-about {
            font-size: 14px; color: #475569; line-height: 1.6; max-width: 24rem;
            margin: 12px 0 0;
        }
        .pro-footer-bottom {
            margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0;
            display: flex; flex-direction: column; gap: 8px;
            align-items: center; text-align: center; font-size: 12px; color: #64748b;
        }
        @media (min-width: 640px) {
            .pro-footer-bottom { flex-direction: row; justify-content: space-between; text-align: left; }
        }
        .pro-footer-bottom strong { color: #334155; }
        .pro-footer-bottom a { color: #334155; font-weight: 700; }
    """


def render_page(jobs: list[dict]) -> str:
    jobs_json = jobs_to_json_script(jobs)
    filters_html = render_filters_html()
    jobs_html = render_jobs_html(jobs)

    page = f'''<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{SITE_TITLE}</title>
    <meta name="google-site-verification" content="UYX4wV17YfoO-ToIoXuD-0JfDpUnVROQAfYOmNfyyWk" />
    <meta name="description" content="{SITE_DESC}">
    <meta name="keywords" content="empleo, trabajo, ofertas, empleos tech, trabajo remoto, ofertas de empleo">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="{SITE_URL}">
    {ADSENSE_SCRIPT_TAG}

    <meta property="og:type" content="website">
    <meta property="og:url" content="{SITE_URL}">
    <meta property="og:title" content="{SITE_TITLE}">
    <meta property="og:description" content="{SITE_DESC}">

    {CSS_STYLES}
</head>
<body>
    <nav class="pro-nav" aria-label="Navegación del ecosistema ProSolutions">
        <div class="pro-nav-inner">
            <a class="pro-brand" href="{CORE_URL}">
                <span class="pro-mark" aria-hidden="true">PS</span>
                <span>
                    <span class="pro-wordmark">Pro<em>Solutions</em></span>
                    <span class="pro-eyebrow">Ecosystem</span>
                </span>
            </a>
            <div class="pro-links">
                <a href="{CORE_URL}">Inicio</a>
                <a href="{PROCV_URL}" target="_blank" rel="noopener">ProCV</a>
                <a href="{SITE_URL}" class="active" aria-current="page">ProJobs
                    <span class="pro-pill pro-pill-active">Activo</span>
                    <span class="pro-pill pro-pill-beta">Beta</span></a>
                <a href="{CORE_URL}#planes">Planes Premium</a>
            </div>
            <a class="pro-cta" href="{PROCV_URL}" target="_blank" rel="noopener">
                Crear mi CV Gratis
            </a>
        </div>
    </nav>

    <header>
        <h1>{SITE_TITLE}</h1>
        <p class="subtitle">{SITE_DESC}</p>
        <p class="subtitle"><strong>Última actualización:</strong>
            {datetime.now().strftime('%d/%m/%Y a las %H:%M UTC')}</p>
    </header>

    <div class="search-container">
        <input type="text" id="searchInput" class="search-input"
               placeholder="🔍 Buscar por tecnología, puesto o empresa (ej. Python, React, Senior)...">
    </div>

    {filters_html}

    {jobs_html}

    {jobs_json}

    <div id="noResults" class="no-results">
        <p>No se encontraron ofertas que coincidan con tu búsqueda. 🔍</p>
        <p>Intenta ajustar los filtros o prueba con otras palabras clave.</p>
    </div>

    <footer class="pro-footer" id="terminos">
        <div class="pro-footer-inner">
            <div class="pro-footer-grid">
                <div>
                    <a class="pro-brand" href="{CORE_URL}">
                        <span class="pro-mark" aria-hidden="true">PS</span>
                        <span>
                            <span class="pro-wordmark">Pro<em>Solutions</em></span>
                            <span class="pro-eyebrow">Ecosystem</span>
                        </span>
                    </a>
                    <p class="pro-footer-about">
                        El ecosistema de herramientas profesionales tech.
                        Crea tu hoja de vida optimizada para ATS con ProCV y
                        encuentra tu próximo empleo con ProJobs.
                    </p>
                </div>
                <div>
                    <h4>Ecosistema</h4>
                    <ul>
                        <li><a href="{CORE_URL}">Inicio</a></li>
                        <li><a href="{PROCV_URL}" target="_blank" rel="noopener">ProCV</a></li>
                        <li><a href="{SITE_URL}">ProJobs</a></li>
                        <li><a href="{CORE_URL}#planes">Planes Premium</a></li>
                    </ul>
                </div>
                <div>
                    <h4>Legal</h4>
                    <ul>
                        <li><a href="privacidad.html">Privacidad</a></li>
                        <li><a href="#terminos">Términos</a></li>
                    </ul>
                </div>
            </div>
            <div class="pro-footer-bottom">
                <p>Total de ofertas cargadas hoy: <strong id="totalJobs">{len(jobs)}</strong></p>
                <p>&copy; {datetime.now().year} ProSolutions. Un producto desarrollado por
                    <a href="{JATC_URL}" target="_blank" rel="noopener">JATC.DEV</a></p>
            </div>
        </div>
    </footer>

    {JS_CODE}
</body>
</html>'''

    return page


JS_CODE = f'''<script>
function escapeHtml(text) {{
    if (text == null) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}}

        const allJobs = JSON.parse(document.getElementById('projobs-data').textContent);
        let filteredJobs = [...allJobs];
        let activeFilters = {{
            country: '',
            sector: '',
            modality: '',
            contract: '',
            jobType: '',
            experience: '',
            search: ''
        }};

        const countryFilter = document.getElementById('countryFilter');
        const sectorFilter = document.getElementById('sectorFilter');
        const modalityFilter = document.getElementById('modalityFilter');
        const contractFilter = document.getElementById('contractFilter');
        const jobTypeFilter = document.getElementById('jobTypeFilter');
        const experienceFilter = document.getElementById('experienceFilter');
        const searchInput = document.getElementById('searchInput');
        const resetFiltersBtn = document.getElementById('resetFilters');
        const activeFiltersCount = document.getElementById('activeFiltersCount');
        const jobsList = document.getElementById('jobsList');
        const noResults = document.getElementById('noResults');
        const totalJobsEl = document.getElementById('totalJobs');

        function populateCountries() {{
            const countries = [...new Set(allJobs.map(j => j.country))].sort();
            countryFilter.innerHTML = '<option value="">Todos los países</option>' +
                countries.map(c => `<option value="${{c}}">${{c}}</option>`).join('');
        }}
        populateCountries();

        function renderJobs() {{
            jobsList.innerHTML = '';
            if (filteredJobs.length === 0) {{
                jobsList.style.display = 'none';
                noResults.style.display = 'block';
                return;
            }}
            jobsList.style.display = '';
            noResults.style.display = 'none';
            filteredJobs.forEach(job => {{
                const card = document.createElement('article');
                card.className = 'job-card';
                card.dataset.country = job.country;
                card.dataset.sector = job.sector;
                card.dataset.modality = job.modality;
                card.dataset.contract = job.contract_type;
                card.dataset.jobtype = job.job_type;
                card.dataset.experience = job.experience;
                card.dataset.date = job.date_published;
                card.innerHTML = `
                    <span class="badge">Fuente: ${{escapeHtml(job.source)}}</span>
                    <h2 class="job-title">${{escapeHtml(job.title)}}</h2>
                    <div class="job-info">
                        🏢 <strong>${{escapeHtml(job.company)}}</strong>
                        &nbsp;|&nbsp; 📍 ${{escapeHtml(job.location)}}
                        ${{job.country !== job.location ? `· ${{escapeHtml(job.country)}}` : ''}}
                        ${{job.salary?.raw ? `· ${{escapeHtml(job.salary.raw)}}` : ''}}
                        ${{job.experience && job.experience !== 'no-especificado'
                          ? `· ${{job.experience.charAt(0).toUpperCase() + job.experience.slice(1)}}`
                          : ''}}
                    </div>
                    <div class="job-tags">
                        <span class="badge">${{job.modality.charAt(0).toUpperCase() + job.modality.slice(1)}}</span>
                        <span class="badge">${{job.contract_type.charAt(0).toUpperCase() + job.contract_type.slice(1)}}</span>
                        <span class="badge">${{job.sector.charAt(0).toUpperCase() + job.sector.slice(1)}}</span>
                    </div>
                    <a href="${{escapeHtml(job.url)}}" class="btn" target="_blank"
                       rel="noopener sponsored">Ver Oferta Completa</a>
                `;
                jobsList.appendChild(card);
            }});
        }}

        function applyFilters() {{
            const country = countryFilter.value;
            const sector = sectorFilter.value;
            const modality = modalityFilter.value;
            const contract = contractFilter.value;
            const jobType = jobTypeFilter.value;
            const experience = experienceFilter.value;
            const search = searchInput.value.toLowerCase().trim();

            activeFilters = {{
                country: country,
                sector: sector,
                modality: modality,
                contract: contract,
                jobType: jobType,
                experience: experience,
                search: search
            }};

            filteredJobs = allJobs.filter(job => {{
                if (country && job.country !== country) return false;
                if (sector && job.sector !== sector) return false;
                if (modality && job.modality !== modality) return false;
                if (contract && job.contract_type !== contract) return false;
                if (jobType && job.job_type !== jobType) return false;
                if (experience && job.experience !== experience) return false;
                if (search && !(
                    job.title.toLowerCase().includes(search) ||
                    job.company.toLowerCase().includes(search) ||
                    job.location.toLowerCase().includes(search) ||
                    job.country.toLowerCase().includes(search)
                )) return false;
                return true;
            }});

            renderJobs();
            updateActiveFiltersCount();
        }}

        function updateActiveFiltersCount() {{
            const count = Object.values(activeFilters).filter(v => v).length;
            activeFiltersCount.textContent = count === 0 ? '0 activos' : `${{count}} activo${{count > 1 ? 's' : ''}}`;
        }}

        function resetFilters() {{
            countryFilter.value = '';
            sectorFilter.value = '';
            modalityFilter.value = '';
            contractFilter.value = '';
            jobTypeFilter.value = '';
            experienceFilter.value = '';
            searchInput.value = '';
            applyFilters();
        }}

        countryFilter.addEventListener('change', applyFilters);
        sectorFilter.addEventListener('change', applyFilters);
        modalityFilter.addEventListener('change', applyFilters);
        contractFilter.addEventListener('change', applyFilters);
        jobTypeFilter.addEventListener('change', applyFilters);
        experienceFilter.addEventListener('change', applyFilters);
        searchInput.addEventListener('input', applyFilters);
        resetFiltersBtn.addEventListener('click', resetFilters);

        renderJobs();
        updateActiveFiltersCount();
    </script>
    '''


all_jobs = fetch_all_jobs()

print(f"🚀 ¡Archivos actualizados con éxito! Total de ofertas: {len(all_jobs)}")

html_content = render_page(all_jobs)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html_content)

with open("jobs.json", "w", encoding="utf-8") as f:
    json.dump(all_jobs, f, ensure_ascii=False, indent=2)

print(f"🚀 ¡Archivos actualizados con éxito! Total de ofertas: {len(all_jobs)}")
