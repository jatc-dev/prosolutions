from datetime import datetime, timezone
import json
import hashlib
import os
import sys
import unicodedata
import urllib.request
import urllib.parse
from html import escape

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# Configuración básica
# ---------------------------------------------------------------------------
SITE_URL = "https://projobs.prosolutions.page/"
PROJOBS_API_URL = os.environ.get("PROJOBS_API_URL", "").strip().rstrip("/")
SITE_TITLE = "ProJobs - Empleos Tech y Más"
SITE_DESC = "Encuentra empleo en tecnología, administración, ventas, salud, educación y más. Actualizado diariamente."

PROCV_URL = "https://procv.prosolutions.page"
CORE_URL = "https://prosolutions.page"
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
            'style="display:block;min-height:90px" '
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


COUNTRY_ALIASES = {
    # ISO 3166-1 alpha-2 codes are the canonical values for known countries.
    "ar": "AR", "argentina": "AR",
    "au": "AU", "australia": "AU",
    "at": "AT", "austria": "AT",
    "be": "BE", "belgium": "BE", "belgica": "BE",
    "br": "BR", "brazil": "BR", "brasil": "BR",
    "ca": "CA", "canada": "CA",
    "cl": "CL", "chile": "CL",
    "cn": "CN", "china": "CN",
    "co": "CO", "colombia": "CO", "bogota": "CO",
    "cr": "CR", "costa rica": "CR",
    "cz": "CZ", "czechia": "CZ", "czech republic": "CZ",
    "de": "DE", "germany": "DE", "alemania": "DE",
    "dk": "DK", "denmark": "DK",
    "ec": "EC", "ecuador": "EC",
    "es": "ES", "spain": "ES", "espana": "ES",
    "fi": "FI", "finland": "FI",
    "fr": "FR", "france": "FR", "francia": "FR",
    "gb": "GB", "uk": "GB", "u.k.": "GB", "united kingdom": "GB",
    "great britain": "GB", "reino unido": "GB",
    "gr": "GR", "greece": "GR",
    "hk": "HK", "hong kong": "HK",
    "hu": "HU", "hungary": "HU",
    "id": "ID", "indonesia": "ID",
    "ie": "IE", "ireland": "IE",
    "il": "IL", "israel": "IL",
    "in": "IN", "india": "IN",
    "is": "IS", "iceland": "IS",
    "it": "IT", "italy": "IT", "italia": "IT",
    "jp": "JP", "japan": "JP",
    "kr": "KR", "south korea": "KR", "korea": "KR",
    "mx": "MX", "mexico": "MX",
    "my": "MY", "malaysia": "MY",
    "ng": "NG", "nigeria": "NG",
    "nl": "NL", "netherlands": "NL", "the netherlands": "NL",
    "no": "NO", "norway": "NO",
    "nz": "NZ", "new zealand": "NZ",
    "pa": "PA", "panama": "PA",
    "pe": "PE", "peru": "PE",
    "ph": "PH", "philippines": "PH",
    "pk": "PK", "pakistan": "PK",
    "pl": "PL", "poland": "PL",
    "pt": "PT", "portugal": "PT",
    "ro": "RO", "romania": "RO",
    "sa": "SA", "saudi arabia": "SA",
    "se": "SE", "sweden": "SE",
    "sg": "SG", "singapore": "SG",
    "th": "TH", "thailand": "TH",
    "tr": "TR", "turkey": "TR", "turkiye": "TR",
    "tw": "TW", "taiwan": "TW",
    "ua": "UA", "ukraine": "UA",
    "us": "US", "usa": "US", "u.s.": "US",
    "united states": "US", "united states of america": "US",
    "estados unidos": "US", "america": "US",
    "uy": "UY", "uruguay": "UY",
    "ve": "VE", "venezuela": "VE",
    "vn": "VN", "vietnam": "VN",
    "za": "ZA", "south africa": "ZA",
    "remote": "REMOTE", "remoto": "REMOTE", "worldwide": "REMOTE",
    "anywhere": "REMOTE", "global": "REMOTE", "remote worldwide": "REMOTE",
    "worldwide remote": "REMOTE", "remote - worldwide": "REMOTE",
    "latin america": "REMOTE", "latam": "REMOTE", "multiple locations": "REMOTE",
}


def _country_key(value: str) -> str:
    return " ".join(
        unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii").casefold().replace(".", "").split()
    )


# Arbeitnow and some aggregators often return a city instead of a country.
# Map common city-only locations to ISO codes; explicit source country fields always win.
CITY_COUNTRY_ALIASES = {
    "berlin": "DE", "munich": "DE", "munchen": "DE", "hamburg": "DE",
    "frankfurt": "DE", "cologne": "DE", "koln": "DE", "stuttgart": "DE",
    "dusseldorf": "DE", "dortmund": "DE", "leipzig": "DE", "dresden": "DE",
    "hanover": "DE", "hannover": "DE", "nuremberg": "DE", "nurnberg": "DE",
    "london": "GB", "manchester": "GB", "birmingham": "GB", "edinburgh": "GB",
    "new york": "US", "san francisco": "US", "los angeles": "US", "seattle": "US",
    "austin": "US", "chicago": "US", "boston": "US", "denver": "US",
    "toronto": "CA", "vancouver": "CA", "montreal": "CA", "ottawa": "CA",
    "sydney": "AU", "melbourne": "AU", "brisbane": "AU", "perth": "AU",
    "paris": "FR", "lyon": "FR", "amsterdam": "NL", "rotterdam": "NL",
    "madrid": "ES", "barcelona": "ES", "valencia": "ES", "lisbon": "PT",
    "lisboa": "PT", "porto": "PT", "rome": "IT", "roma": "IT", "milan": "IT",
    "milano": "IT", "dublin": "IE", "zurich": "CH", "geneva": "CH",
    "vienna": "AT", "wien": "AT", "prague": "CZ", "warsaw": "PL",
    "krakow": "PL", "copenhagen": "DK", "stockholm": "SE", "oslo": "NO",
    "helsinki": "FI", "brussels": "BE", "bruges": "BE", "athens": "GR",
    "bucharest": "RO", "budapest": "HU", "istanbul": "TR", "tel aviv": "IL",
    "dubai": "AE", "abu dhabi": "AE", "singapore": "SG", "tokyo": "JP",
    "osaka": "JP", "seoul": "KR", "taipei": "TW", "hong kong": "HK",
    "bangalore": "IN", "bengaluru": "IN", "mumbai": "IN", "delhi": "IN",
    "jakarta": "ID", "manila": "PH", "bangkok": "TH", "kuala lumpur": "MY",
    "lagos": "NG", "nairobi": "KE", "cape town": "ZA", "johannesburg": "ZA",
    "sao paulo": "BR", "são paulo": "BR", "rio de janeiro": "BR",
    "mexico city": "MX", "bogota": "CO", "bogotá": "CO", "medellin": "CO",
    "medellín": "CO", "buenos aires": "AR", "santiago": "CL", "lima": "PE",
    "quito": "EC", "montevideo": "UY", "panama city": "PA",
}


def normalize_country(location: str | None) -> str:
    """Devuelve un código ISO estable para países reconocidos y un fallback limpio."""
def normalize_country(location: str | None) -> str:
    """Devuelve un código ISO estable para países reconocidos y un fallback limpio."""
    if not location or not str(location).strip():
        return "UNKNOWN"

    raw = str(location).strip()
    parts = [part.strip() for part in raw.split(",") if part.strip()]
    # Prefer explicit country names/codes at the end of a location.
    for candidate in reversed(parts or [raw]):
        key = _country_key(candidate)
        if key in COUNTRY_ALIASES:
            return COUNTRY_ALIASES[key]
        if key in CITY_COUNTRY_ALIASES:
            return CITY_COUNTRY_ALIASES[key]
        # Handles values such as "Remote - US" and "Remote (UK)".
        suffix = candidate.rsplit("-", 1)[-1].strip(" ()")
        suffix_key = _country_key(suffix)
        if suffix_key in COUNTRY_ALIASES and COUNTRY_ALIASES[suffix_key] != "REMOTE":
            return COUNTRY_ALIASES[suffix_key]

    key = _country_key(raw)
    if key in COUNTRY_ALIASES:
        return COUNTRY_ALIASES[key]
    if key in CITY_COUNTRY_ALIASES:
        return CITY_COUNTRY_ALIASES[key]
    # Keep unfamiliar locations useful, but normalize whitespace and casing.
    return " ".join(parts[-1].split()).title() if parts else raw.title()


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


def normalize_published_date(job: dict) -> str:
    """Devuelve una fecha comparable como texto, incluso si la fuente entrega epoch."""
    value = job.get("date_published") or job.get("publication_date") or job.get("created_at") or ""
    if isinstance(value, (int, float)) or (
        isinstance(value, str) and value.strip().isdigit()
    ):
        try:
            timestamp = float(value)
            if timestamp > 10_000_000_000:
                timestamp /= 1000
            return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat(
                timespec="seconds"
            ).replace("+00:00", "Z")
        except (OverflowError, OSError, ValueError):
            return ""
    return str(value).strip()


def normalize_sector(category: str | None, *extra_fields) -> str:
    for value in (category, *extra_fields):
        if not value:
            continue
        mapped = SECTOR_MAP.get(str(value).lower())
        if mapped:
            return mapped
    return "otras"


def normalize_job(job: dict, source: str) -> dict | None:
    title = str(job.get("title") or job.get("title_raw") or "").strip()
    company = str(job.get("company_name") or job.get("company") or "").strip()
    location = str(job.get("location") or job.get("candidate_required_location") or "").strip()
    url = str(job.get("url") or "").strip()

    if not title or not url:
        return None

    if not is_valid_url(url):
        return None

    country_hint = str(
        job.get("country") or job.get("country_code") or job.get("countryCode") or ""
    ).strip()
    country = normalize_country(country_hint or location)
    country_codes = []
    for raw_country in job.get("country_codes") or []:
        code = normalize_country(str(raw_country))
        if code not in ("UNKNOWN", "REMOTE") and code not in country_codes:
            country_codes.append(code)
    if country_codes:
        country = country_codes[0]
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
        "id": hashlib.sha256(canonical_url(url).encode("utf-8")).hexdigest()[:24],
        "title": title.strip(),
        "company": company.strip(),
        "location": location.strip(),
        "country": country,
        "countries": country_codes or ([country] if country != "UNKNOWN" else []),
        "url": url,
        "source": source,
        "sector": sector,
        "modality": modality,
        "contract_type": contract_type,
        "job_type": job_type,
        "experience": experience,
        "salary": salary,
        "date_published": normalize_published_date(job),
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
    """Normaliza URLs para deduplicar ofertas sin alterar rutas sensibles a mayúsculas."""
    try:
        parsed = urllib.parse.urlparse(str(url or "").strip())
        tracking_params = {
            "utm_source", "utm_medium", "utm_campaign", "utm_term",
            "utm_content", "fbclid", "igshid", "ref", "source",
        }
        query_items = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
        clean_query = [
            (key, value) for key, value in query_items
            if key.casefold() not in tracking_params
        ]
        new_query = urllib.parse.urlencode(clean_query, doseq=True)
        path = parsed.path.rstrip("/") or "/"
        return urllib.parse.urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            path,
            parsed.params,
            new_query,
            "",
        ))
    except (TypeError, ValueError):
        return str(url or "").strip()


def _normalized_identity(value: object) -> str:
    return " ".join(str(value or "").casefold().split())


def deduplicate_jobs(jobs: list[dict]) -> list[dict]:
    """Deduplica por URL canónica y, si hay datos suficientes, por identidad laboral."""
    seen_urls = set()
    seen_keys = set()
    result = []
    for job in jobs:
        url = str(job.get("url") or "").strip()
        canon = canonical_url(url) if url else ""
        company = _normalized_identity(job.get("company") or job.get("company_name"))
        title = _normalized_identity(job.get("title") or job.get("title_raw"))
        location = _normalized_identity(job.get("location") or job.get("candidate_required_location"))
        # Sin empresa/ubicación no hay suficiente evidencia para descartar otra oferta
        # legítima con el mismo título.
        key = (company, title, location) if company and title and location else None
        if (canon and canon in seen_urls) or (key is not None and key in seen_keys):
            continue
        if canon:
            seen_urls.add(canon)
        if key is not None:
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
    """Fetch several pages so the catalogue is not capped at the first 50 listings."""
    result = []
    for page in range(1, 6):
        data = fetch_json(
            "https://www.arbeitnow.com/api/job-board-api"
            + (f"?page={page}" if page > 1 else "")
        )
        if not data:
            break
        jobs = data.get("data", [])
        if not jobs:
            break
        for job in jobs:
            normalized = normalize_job(job, "Arbeitnow")
            if normalized:
                result.append(normalized)
    return result


def fetch_remotive() -> list[dict]:
    data = fetch_json("https://remotive.com/api/remote-jobs?limit=50")
    if not data:
        return []
    result = []
    for job in data.get("jobs", [])[:50]:
        normalized = normalize_job(job, "Remotive")
        if normalized:
            result.append(normalized)
    return result


def fetch_jobicy() -> list[dict]:
    """Worldwide remote roles from Jobicy's current public jobs API."""
    data = fetch_json("https://jobicy.com/api/jobs?count=200")
    if not data or data.get("success") is False:
        return []
    result = []
    for item in data.get("jobs", [])[:200]:
        job_types = item.get("jobType") or []
        industries = item.get("jobIndustry") or []
        salary = item.get("salary")
        if not salary and (item.get("salaryMin") or item.get("salaryMax")):
            salary = " - ".join(str(value) for value in (item.get("salaryMin"), item.get("salaryMax")) if value)
            salary = (salary + " " + str(item.get("salaryCurrency") or "")).strip()
        job = {
            "title": item.get("jobTitle"),
            "company_name": item.get("companyName"),
            "location": item.get("jobGeo") or "Worldwide remote",
            "url": item.get("url"),
            "category": industries[0] if isinstance(industries, list) and industries else industries,
            "job_type": job_types[0] if isinstance(job_types, list) and job_types else job_types,
            "remote": True,
            "date_published": item.get("pubDate"),
            "description": item.get("jobExcerpt") or item.get("jobDescription") or "",
            "salary": salary,
        }
        normalized = normalize_job(job, "Jobicy")
        if normalized:
            result.append(normalized)
    return result


def fetch_himalayas() -> list[dict]:
    """Fetch several cursor pages from Himalayas' public jobs API (max 20 per page)."""
    result = []
    cursor = ""
    for _ in range(5):
        url = "https://himalayas.app/jobs/api?limit=20"
        if cursor:
            url += "&cursor=" + urllib.parse.quote(cursor, safe="")
        data = fetch_json(url)
        if not data or not isinstance(data, dict):
            break
        items = data.get("jobs", [])
        if not isinstance(items, list) or not items:
            break
        for item in items:
            restrictions = item.get("locationRestrictions") or []
            location = item.get("location") or (
                ", ".join(str(value) for value in restrictions[:3])
                if restrictions else "Worldwide remote"
            )
            salary = item.get("salary")
            if not salary and (item.get("minSalary") or item.get("maxSalary")):
                salary = " - ".join(str(value) for value in (item.get("minSalary"), item.get("maxSalary")) if value)
                salary = (salary + " " + str(item.get("currency") or "")).strip()
            job = {
                "title": item.get("title"),
                "company_name": item.get("companyName") or item.get("company"),
                "location": location,
                "country_codes": restrictions,
                "url": item.get("applicationLink"),
                "category": (item.get("categories") or item.get("parentCategories") or [""])[0],
                "job_type": item.get("employmentType") or "full-time",
                "remote": True,
                "date_published": item.get("pubDate") or item.get("publishedAt"),
                "description": item.get("excerpt") or item.get("description") or "",
                "salary": salary,
            }
            normalized = normalize_job(job, "Himalayas")
            if normalized:
                result.append(normalized)
        cursor = data.get("nextCursor") or ""
        if not cursor:
            break
    return result


def fetch_remoteok() -> list[dict]:
    """RemoteOK's public JSON feed, with its metadata object excluded."""
    data = fetch_json("https://remoteok.com/api")
    if not isinstance(data, list):
        return []
    result = []
    for item in data:
        if not isinstance(item, dict) or not item.get("position"):
            continue
        job = {
            "title": item.get("position"),
            "company_name": item.get("company"),
            "location": item.get("location") or "Worldwide remote",
            "url": item.get("apply_url") or item.get("url"),
            "category": item.get("tags") or item.get("category"),
            "job_type": item.get("job_type"),
            "remote": True,
            "date_published": item.get("date") or item.get("epoch"),
            "description": item.get("description") or "",
            "salary": item.get("salary"),
        }
        normalized = normalize_job(job, "RemoteOK")
        if normalized:
            result.append(normalized)
    return result


def fetch_all_jobs() -> list[dict]:
    all_jobs = []
    # Each source is independent: an outage or rate limit must not block the others.
    for fetcher in (
        fetch_arbeitnow, fetch_remotive, fetch_jobicy, fetch_himalayas, fetch_remoteok
    ):
        try:
            all_jobs.extend(fetcher())
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
        salary_text = '<svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10h.01M18 14h.01"/></svg> ' + escape_html(job["salary"]["raw"])

    experience_text = ""
    if job.get("experience") and job["experience"] != "no-especificado":
        experience_text = " • " + job["experience"].title()

    stable_url = canonical_url(job.get("url", ""))
    job_id = hashlib.sha256(stable_url.encode("utf-8")).hexdigest()[:24]
    job_url = escape_html(job["url"])
    job_title = escape_html(job["title"])
    company = escape_html(job["company"])
    source_urls = {
        "Arbeitnow": "https://www.arbeitnow.com/",
        "Remotive": "https://remotive.com/",
        "Jobicy": "https://jobicy.com/",
        "Himalayas": "https://himalayas.app/",
        "RemoteOK": "https://remoteok.com/",
    }
    source_url = escape_html(source_urls.get(job.get("source", ""), "https://projobs.prosolutions.page/"))
    source_name = escape_html(job.get("source", "ProJobs"))

    return ('        <article class="job-card" data-job-id="' + job_id + '" data-country="' + escape_html(job['country']) + '"\n'
            '             data-sector="' + escape_html(job['sector']) + '"\n'
            '             data-modality="' + escape_html(job['modality']) + '"\n'
            '             data-contract="' + escape_html(job['contract_type']) + '"\n'
            '             data-jobtype="' + escape_html(job['job_type']) + '"\n'
            '             data-experience="' + escape_html(job['experience']) + '"\n'
            '             data-date="' + escape_html(job.get('date_published','')) + '">\n'
            '            <span class="badge">Fuente: <a href="' + source_url + '" target="_blank" rel="noopener noreferrer">' + source_name + '</a></span>\n'
            '            <h2 class="job-title">' + escape_html(job['title']) + '</h2>\n'
            '            <div class="job-info">\n'
            '                <svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></svg> <strong>' + escape_html(job['company']) + '</strong>\n'
            '                &nbsp;|&nbsp; <svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg> ' + escape_html(job['location']) + '\n'
            + (f" · {escape_html(job['country'])}" if job['country'] != job['location'] else "")
            + (f" · {salary_text}" if salary_text else "")
            + experience_text
            + '            </div>\n'
            '            <div class="job-tags">\n'
            '                <span class="badge">' + escape_html(job['modality'].title()) + '</span>\n'
            '                <span class="badge">' + escape_html(job['contract_type'].title()) + '</span>\n'
            '                <span class="badge">' + escape_html(job['sector'].title()) + '</span>\n'
            '            </div>\n'
            '            <div class="job-actions">\n'
            '                <a href="' + job_url + '" class="btn" data-i18n="viewJob" data-action="apply" data-job-id="' + job_id + '" data-job-url="' + job_url + '" data-job-title="' + job_title + '" data-company="' + company + '" target="_blank" rel="noopener sponsored">Ver oferta</a>\n'
            '                <button type="button" class="btn-save" data-action="save-job" data-job-id="' + job_id + '" data-job-url="' + job_url + '" data-job-title="' + job_title + '" data-company="' + company + '" aria-label="Guardar empleo" data-i18n="saveJob"><svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg><span data-i18n="saveJob">Guardar</span></button>\n'
            '            </div>\n'
            '        </article>\n    ')


def render_filters_html() -> str:
    sectors_options = "".join(
        f'<option value="{k}" data-i18n-sector="{k}">{v}</option>'
        for k, v in SECTOR_TAXONOMY.items()
    )
    return f'''
    <div class="filters-panel">
        <div class="filters-header">
            <h3 data-i18n="filtersTitle"><svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg> Filtros de búsqueda</h3>
            <button type="button" id="resetFilters" class="btn-reset">
                <span data-i18n="resetFilters">Limpiar filtros</span>
            </button>
            <span class="active-filters" id="activeFiltersCount">0 activos</span>
            <div class="alert-tools">
                <input id="alertNameInput" type="text" maxlength="120" data-i18n-placeholder="alertNamePlaceholder" placeholder="Nombre de la alerta (p. ej. React remoto)">
                <select id="alertFrequency" aria-label="Frecuencia de alerta">
                    <option value="daily" data-i18n="dailyAlerts">Diaria</option>
                    <option value="weekly" data-i18n="weeklyAlerts">Semanal</option>
                </select>
                <button type="button" id="createAlertButton" class="btn-alert" data-i18n="createAlert">Crear alerta</button>
            </div>
        </div>
        <div class="filters-grid">
            <div class="filter-group">
                <label for="countryFilter" data-i18n="country">País</label>
                <select id="countryFilter" aria-label="País">
                    <option value="" data-i18n="allCountries">Todos los países</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="sectorFilter" data-i18n="sector">Sector</label>
                <select id="sectorFilter">
                    <option value="" data-i18n="allSectors">Todos los sectores</option>
                    {sectors_options}
                </select>
            </div>
            <div class="filter-group">
                <label for="modalityFilter" data-i18n="modality">Modalidad</label>
                <select id="modalityFilter">
                    <option value="" data-i18n="all">Todas</option>
                    <option value="remoto" data-i18n="remote">Remoto</option>
                    <option value="presencial" data-i18n="onsite">Presencial</option>
                    <option value="híbrido" data-i18n="hybrid">Híbrido</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="contractFilter" data-i18n="contractType">Tipo de contrato</label>
                <select id="contractFilter">
                    <option value="" data-i18n="all">Todos</option>
                    <option value="indefinido" data-i18n="permanent">Indefinido</option>
                    <option value="temporal" data-i18n="temporary">Temporal</option>
                    <option value="prácticas" data-i18n="internship">Prácticas</option>
                    <option value="freelance" data-i18n="freelance">Freelance</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="jobTypeFilter" data-i18n="schedule">Jornada</label>
                <select id="jobTypeFilter">
                    <option value="" data-i18n="all">Todas</option>
                    <option value="completa" data-i18n="fullTime">Completa</option>
                    <option value="parcial" data-i18n="partTime">Parcial</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="experienceFilter" data-i18n="experience">Experiencia</label>
                <select id="experienceFilter">
                    <option value="" data-i18n="anyLevel">Cualquier nivel</option>
                    <option value="junior">Junior</option>
                    <option value="medio" data-i18n="mid">Medio</option>
                    <option value="senior">Senior</option>
                </select>
            </div>
        </div>
    </div>
    '''


def render_jobs_html(jobs: list[dict]) -> str:
    if not jobs:
        return '<main id="jobsList"></main>'
    cards = "".join(render_job_card(job) for job in jobs)
    return f'''
    <main id="jobsList">
        {cards}
    </main>
    '''


CSS_STYLES = """
        <style>
        /* Reset y base */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f7fc;
            color: #20304a;
            line-height: 1.5;
        }
        header { text-align: center; margin-bottom: 25px; }
        h1 { color: #3f6ff5; margin-bottom: 8px; font-size: 1.8rem; }
        .subtitle { color: #64748b; font-size: 0.95rem; margin-top: 0; }

        .search-container { margin-bottom: 20px; text-align: center; }
        .search-input {
            width: 100%; max-width: 700px; padding: 14px 18px; font-size: 1rem;
            border: 2px solid #dce4f0; border-radius: 8px; box-sizing: border-box;
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
            background: white;             border: 1px solid #dce4f0; border-radius: 8px;
            padding: 20px; margin-bottom: 16px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.03); transition: transform 0.1s ease;
        }
        .job-card:hover { transform: translateY(-2px); }
        .job-title { font-size: 1.2rem; font-weight: 600; color: #3f6ff5; margin: 0 0 6px 0; }
        .job-info { color: #64748b; font-size: 0.9rem; margin-bottom: 14px; }
        .inline-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.15em; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
        .search-field { position: relative; display: block; width: 100%; }
        .search-field-icon { position: absolute; left: 18px; top: 50%; width: 20px; height: 20px; transform: translateY(-50%); color: #64748b; }
        .search-field .search-input { padding-left: 48px; }
        .match-panel { max-width: 78rem; margin: 0 auto 22px; padding: 18px 22px; display: grid; grid-template-columns: minmax(220px,1fr) minmax(260px,1fr); gap: 8px 20px; align-items: center; border: 1px solid #dbeafe; border-radius: 16px; background: #f8fbff; }
        .match-panel h2 { margin: 0 0 4px; font-size: 1rem; color: #264fc7; }
        .match-panel p { margin: 0; font-size: .88rem; color: #64748b; }
        .match-input-wrap { display:flex; gap:10px; align-items:center; border:1px solid #aab8ca; border-radius:10px; background:white; padding:0 12px; }
        .match-input-wrap input { width:100%; min-width:0; border:0; outline:none; padding:12px 0; background:transparent; color:#20304a; }
        .small-note { grid-column:1/-1; }
        .alert-tools { display:flex; align-items:center; gap:8px; flex-wrap:wrap; width:100%; margin-top:8px; }
        .alert-tools input,.alert-tools select { border:1px solid #aab8ca; border-radius:9px; padding:8px 10px; background:#fff; color:#20304a; min-width:130px; }
        .alert-tools input { flex:1; }
        .btn-alert { border:1px solid #c7d2fe; border-radius:9px; padding:9px 12px; background:#e5edff; color:#264fc7; font-weight:700; cursor:pointer; }
        .job-match-badge { display:inline-flex; gap:5px; align-items:center; padding:4px 8px; border-radius:999px; font-size:.78rem; font-weight:750; background:#ecfdf5; color:#047857; }
        .job-badges { display:flex; flex-wrap:wrap; align-items:center; gap:7px; margin-bottom:10px; }
        .job-badges .badge { margin:0; }
        .job-actions .btn-secondary { background:#f5f7fc; color:#264fc7; border:1px solid #c7d2fe; }
        html.dark .job-actions .btn-secondary { background:#25334a; color:#b2c0d4; border-color:#52627a; }
        .job-quality-note { color:#64748b; font-size:.78rem; }
        .salary-undisclosed { color:#64748b; font-size:.78rem; }
        html.dark .match-panel { background:#111827; border-color:#34445c; }
        html.dark .match-panel h2 { color:#b2c0d4; }
        html.dark .match-input-wrap,html.dark .match-input-wrap input,html.dark .alert-tools input,html.dark .alert-tools select { background:#111827; color:#dce4f0; border-color:#475569; }
        html.dark .btn-alert { background:#25334a; color:#b2c0d4; border-color:#52627a; }
        @media(max-width:720px) { .match-panel { grid-template-columns:1fr; margin-left:12px; margin-right:12px; padding:16px; } .small-note { grid-column:auto; } }
        .mobile-menu-toggle svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
        .inline-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.15em; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
        .search-field { position: relative; display: block; width: 100%; }
        .search-field-icon { position: absolute; left: 18px; top: 50%; width: 20px; height: 20px; transform: translateY(-50%); color: #64748b; }
        .search-field .search-input { padding-left: 48px; }
        .mobile-menu-toggle svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
        .job-tags { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
        .job-tags .badge { font-size: 0.75rem; }
        .btn {
            display: inline-block; background: #3563e9; color: white;
            padding: 10px 20px; text-decoration: none; border-radius: 6px;
            font-size: 0.9rem; font-weight: 600;
        }
        .btn:hover { background: #059669; }

        .no-results {
            display: none; text-align: center; color: #57606a;
            padding: 30px; font-size: 1.05rem;
        }

        .filters-panel {
            background: white;             border: 1px solid #dce4f0; border-radius: 8px;
            padding: 16px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.03);
        }
        .filters-header {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 16px;
        }
        .filters-header h3 { margin: 0; font-size: 1rem; color: #20304a; }
        .filters-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
        }
        .filter-group label {
            display: block; font-size: 0.85rem; font-weight: 600;
            color: #475569; margin-bottom: 6px;
        }
        .filter-group select, .filter-group input {
            width: 100%; padding: 8px 12px; border: 1px solid #aab8ca;
            border-radius: 6px; background: white; font-size: 0.9rem;
            color: #25334a;
        }
        .btn-reset {
            background: none;             border: 1px solid #dce4f0; border-radius: 6px;
            padding: 6px 12px; font-size: 0.9rem; color: #475569;
            cursor: pointer;
        }
        .btn-reset:hover { background: #f5f7fc; }
        .active-filters { font-size: 0.85rem; color: #64748b; font-weight: 600; }
        .no-results {
            display: none; text-align: center; color: #57606a;
            padding: 30px; font-size: 1.05rem;
        }

        .pro-footer { background: #ffffff; border-top: 1px solid #dce4f0; }
        .pro-footer-inner { max-width: 80rem; margin: 0 auto; padding: 48px 16px 24px; }
        .pro-footer-grid { display: grid; gap: 32px; grid-template-columns: 1fr; }
        @media (min-width: 768px) { .pro-footer-grid { grid-template-columns: 1.4fr 1fr 1fr; } }
        .pro-footer h4 {
            font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.16em; color: #94a3b8; margin: 0 0 12px;
        }
        .pro-footer ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
        .pro-footer a { color: #475569; text-decoration: none; font-size: 14px; }
        .pro-footer a:hover { color: #3563e9; }
        .pro-footer-about {
            font-size: 14px; color: #475569; line-height: 1.6; max-width: 24rem;
            margin: 12px 0 0;
        }
        .pro-footer-bottom {
            margin-top: 36px; padding-top: 20px; border-top: 1px solid #dce4f0;
            display: flex; flex-direction: column; gap: 8px;
            align-items: center; text-align: center; font-size: 12px; color: #64748b;
        }
        @media (min-width: 640px) {
            .pro-footer-bottom { flex-direction: row; justify-content: space-between; text-align: left; }
        }
        .pro-footer-bottom strong { color: #34445c; }
        .pro-footer-bottom a { color: #34445c; font-weight: 700; }
        .language-toggle {
            border: 1px solid #dbe2ea; border-radius: 8px; background: #fff;
            color: #34445c; padding: 9px 13px; font: inherit; font-weight: 700;
            cursor: pointer; transition: background .2s, border-color .2s;
        }
        .language-toggle:hover { background: #f1f5f9; border-color: #94a3b8; }
        .language-toggle:focus-visible { outline: 3px solid rgba(63,111,245,.35); outline-offset: 2px; }
        .theme-toggle { border: 1px solid #dbe2ea; border-radius: 8px; background: #fff; color: #34445c; padding: 9px 11px; font: inherit; font-size: 16px; cursor: pointer; }
        .theme-toggle:hover { background: #f1f5f9; border-color: #94a3b8; }
        .theme-toggle svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
        .theme-toggle:focus-visible { outline: 3px solid rgba(63,111,245,.35); outline-offset: 2px; }
        html.dark body { background: #111827; color: #dce4f0; }
        /* Navegación del ecosistema ProSolutions */
        .pro-nav {
            position: sticky; top: 12px; z-index: 100;
            margin: 0 0 28px; padding: 12px 18px;
            background: rgba(255,255,255,.96); border: 1px solid #dce4f0;
            border-radius: 16px; box-shadow: 0 8px 24px rgba(15,23,42,.08);
            backdrop-filter: blur(12px);
        }
        .pro-nav-inner {
            width: 100%; max-width: 80rem; margin: 0 auto;
            display: flex; align-items: center; justify-content: space-between;
            gap: 16px;
        }
        .pro-brand {
            display: inline-flex; align-items: center; gap: 10px;
            flex: 0 0 auto; color: inherit; text-decoration: none;
        }
        .pro-mark {
            display: grid; place-items: center; width: 42px; height: 42px;
            flex: 0 0 42px; border-radius: 13px;
            background: linear-gradient(135deg,#3f6ff5,#244bd9);
            color: #fff; font-size: 15px; font-weight: 800;
            letter-spacing: -.04em; box-shadow: 0 5px 12px rgba(63,111,245,.24);
        }
        .pro-wordmark { display: block; color: #20304a; font-size: 17px; font-weight: 800; line-height: 1.15; }
        .pro-wordmark em { color: #3f6ff5; font-style: normal; }
        .pro-eyebrow { display: block; margin-top: 3px; color: #64748b; font-size: 10px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
        .pro-links { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 4px; }
        .pro-links a {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 9px 11px; border-radius: 9px;
            color: #475569; font-size: 13px; font-weight: 650;
            line-height: 1.25; text-decoration: none; white-space: nowrap;
            transition: background .18s ease, color .18s ease;
        }
        .pro-links a:hover, .pro-links a.active { background: #e5edff; color: #264fc7; }
        .pro-nav-icon { width: 17px; height: 17px; flex: 0 0 17px; stroke: currentColor; stroke-width: 1.8; fill: none; stroke-linecap: round; stroke-linejoin: round; }
        .pro-active-dot { width: 6px; height: 6px; border-radius: 999px; background: #16a34a; box-shadow: 0 0 0 3px #dcfce7; }
        .pro-links a:focus-visible, .pro-brand:focus-visible, .pro-cta:focus-visible,
        .language-toggle:focus-visible, .theme-toggle:focus-visible {
            outline: 3px solid rgba(63,111,245,.4); outline-offset: 3px;
        }
        @media (max-width: 980px) {
            .pro-nav-inner { flex-wrap: wrap; justify-content: center; }
            .pro-brand { margin-right: auto; }
            .pro-links { order: 3; width: 100%; }
        }
        @media (max-width: 560px) {
            .pro-nav { top: 6px; padding: 10px; border-radius: 12px; }
            .pro-nav-inner { gap: 10px; }
            .pro-brand { margin-right: 0; }
            .pro-wordmark { font-size: 15px; }
            .pro-links { gap: 2px; }
            .pro-links a { padding: 8px 7px; font-size: 12px; }
            .pro-nav-icon { width: 15px; height: 15px; flex-basis: 15px; }
        }
        html.dark .pro-nav { background: rgba(15,23,42,.94); border-color: #34445c; }
        html.dark .pro-wordmark { color: #f5f7fc; }
        html.dark .pro-links a { color: #aab8ca; }
        html.dark .pro-links a:hover, html.dark .pro-links a.active { background: #25334a; color: #f5f7fc; }
        html.dark .search-input, html.dark .filters-panel, html.dark .filter-group select, html.dark .job-card, html.dark .pro-footer { background: #111827; border-color: #34445c; color: #dce4f0; }
        html.dark .search-input::placeholder { color: #94a3b8; }
        html.dark .job-title { color: #93c5fd; }
        html.dark .job-info, html.dark .no-results, html.dark .filter-group label, html.dark .filters-header h3 { color: #aab8ca; }
        html.dark .btn-reset, html.dark .language-toggle, html.dark .theme-toggle { background: #25334a; border-color: #475569; color: #dce4f0; }
        html.dark .btn-reset:hover, html.dark .language-toggle:hover, html.dark .theme-toggle:hover { background: #34445c; }
        html.dark .pro-footer h4, html.dark .pro-footer-about, html.dark .pro-footer-bottom { color: #94a3b8; }
        html.dark .pro-footer a, html.dark .pro-footer-bottom a { color: #aab8ca; }
        /* ProJobs refresh: shared ProSolutions shell + job-board UX */
        body { max-width: none; margin: 0; padding: 0; background: #f5f7fc; color: #20304a; }
        .pro-nav { position: sticky; top: 0; z-index: 40; margin: 0; padding: 0; border: 0; border-bottom: 1px solid rgba(226,232,240,.9); border-radius: 0; box-shadow: none; background: rgba(255,255,255,.92); backdrop-filter: blur(12px); }
        .pro-nav-inner { max-width: 80rem; margin: 0 auto; padding: 12px 16px; min-height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .pro-mark { width: 36px; height: 36px; flex: 0 0 36px; border-radius: 12px; background: linear-gradient(135deg,#3563e9,#73a0ff); box-shadow: none; font-size: 13px; }
        .pro-wordmark { color: #20304a; font-size: 18px; font-weight: 800; letter-spacing: -.01em; }
        .pro-wordmark em { background: linear-gradient(90deg,#3563e9,#73a0ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .pro-eyebrow { margin-top: 2px; color: #94a3b8; font-size: 9px; letter-spacing: .18em; }
        .pro-links { gap: 4px; flex-wrap: nowrap; }
        .pro-links a { min-height: 40px; padding: 8px 12px; border-radius: 12px; font-size: 14px; font-weight: 500; color: #475569; }
        .pro-links a:hover, .pro-links a.active { background: #f1f5f9; color: #20304a; }
        .pro-active-dot { display: none; }
        .pro-active-pill { border-radius: 999px; padding: 2px 6px; background: #dce8ff; color: #264fc7; font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
        .language-toggle, .theme-toggle { min-height: 40px; border-radius: 12px; }
        .mobile-menu-toggle { display: none; width: 40px; height: 40px; align-items: center; justify-content: center; border: 1px solid #dce4f0; border-radius: 12px; background: #fff; color: #475569; font-size: 19px; cursor: pointer; }
        .mobile-menu-toggle:focus-visible { outline: 2px solid #3563e9; outline-offset: 2px; }
        .jobs-hero { margin: 0; padding: 56px max(24px, calc((100vw - 80rem) / 2)) 44px; text-align: left; background: linear-gradient(115deg,#f5f7fc 0%,#e5edff 55%,#dce8ff 100%); border-bottom: 1px solid #dce4f0; }
        .hero-eyebrow { margin: 0 0 12px; color: #3563e9; font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
        h1 { max-width: 850px; margin: 0 0 12px; color: #20304a; font-size: clamp(2rem,4vw,3.25rem); font-weight: 800; letter-spacing: -.045em; line-height: 1.08; }
        .jobs-hero .subtitle { max-width: 760px; margin-top: 0; color: #475569; font-size: 1.05rem; }
        .jobs-hero .subtitle:last-child { margin-top: 14px; color: #64748b; font-size: .82rem; }
        .search-container { position: relative; z-index: 1; max-width: 80rem; margin: -22px auto 24px; padding: 0 16px; text-align: left; }
        .search-input { width: 100%; max-width: none; padding: 18px 20px; border: 1px solid #aab8ca; border-radius: 16px; background: #fff; box-shadow: 0 12px 32px rgba(15,23,42,.10); font-size: 1rem; }
        .search-input:focus { border-color: #3563e9; box-shadow: 0 0 0 4px rgba(53,99,233,.14),0 12px 32px rgba(15,23,42,.08); }
        .filters-panel { max-width: 78rem; margin: 0 auto 28px; padding: 22px; border: 1px solid #dce4f0; border-radius: 20px; box-shadow: 0 4px 16px rgba(15,23,42,.035); }
        .filters-header { gap: 12px; flex-wrap: wrap; }
        .filters-header h3 { font-size: 1.05rem; letter-spacing: -.01em; }
        .filter-group select, .filter-group input { min-height: 44px; border-color: #aab8ca; border-radius: 10px; }
        .filter-group select:focus, .filter-group input:focus { outline: 2px solid rgba(53,99,233,.25); border-color: #3563e9; }
        .btn-reset { border-radius: 10px; padding: 8px 12px; cursor: pointer; }
        .results-heading { max-width: 80rem; margin: 0 auto 16px; padding: 0 16px; display: flex; align-items: end; justify-content: space-between; gap: 16px; }
        .results-heading h2 { margin: 0; color: #20304a; font-size: 1.35rem; letter-spacing: -.025em; }
        .results-heading p { margin: 4px 0 0; color: #64748b; font-size: .9rem; }
        .results-count { flex: 0 0 auto; color: #475569; font-size: .85rem; font-weight: 700; }
        #jobsList { max-width: 80rem; margin: 0 auto; padding: 0 16px 32px; display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px; }
        .job-card { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; margin: 0; padding: 22px; border: 1px solid #dce4f0; border-radius: 18px; box-shadow: 0 2px 8px rgba(15,23,42,.025); transition: border-color .18s ease,box-shadow .18s ease,transform .18s ease; }
        .job-card:hover { transform: translateY(-2px); border-color: #c7d2fe; box-shadow: 0 12px 28px rgba(15,23,42,.07); }
        .job-title { color: #25334a; font-size: 1.12rem; line-height: 1.35; }
        .job-info { margin-bottom: 10px; color: #64748b; line-height: 1.7; }
        .job-tags { margin: 0 0 18px; }
        .job-tags .badge { margin: 0; border-radius: 999px; background: #f1f5f9; color: #475569; font-weight: 650; }
        .job-card > .badge { border-radius: 999px; background: #e5edff; color: #264fc7; }
        .btn { margin-top: auto; border-radius: 10px; background: #3563e9; padding: 11px 16px; }
        .btn:hover { background: #264fc7; }
        .job-actions { display: flex; width: 100%; align-items: center; gap: 10px; margin-top: auto; }
        .job-actions .btn { display: inline-flex; align-items: center; justify-content: center; flex: 1; margin-top: 0; text-decoration: none; }
        .btn-save { min-height: 42px; padding: 10px 14px; border: 1px solid #aab8ca; border-radius: 10px; background: #fff; color: #34445c; font: inherit; font-size: .9rem; font-weight: 650; cursor: pointer; }
        .btn-save:hover { border-color: #3563e9; background: #e5edff; color: #264fc7; }
        .btn-save:focus-visible { outline: 2px solid #3563e9; outline-offset: 2px; }
        html.dark .btn-save { background: #25334a; border-color: #475569; color: #dce4f0; }
        html.dark .btn-save:hover { background: #2b4165; border-color: #73a0ff; color: #f1f5fc; }
        @media (max-width: 420px) { .job-actions { flex-direction: column; align-items: stretch; } .job-actions .btn, .btn-save { width: 100%; } }

        .no-results { max-width: 80rem; margin: 0 auto 32px; padding: 44px 20px; border: 1px dashed #aab8ca; border-radius: 18px; background: #fff; }
        .pro-footer { margin-top: 28px; background: #fff; border-top: 1px solid #dce4f0; }
        .pro-footer-inner { max-width: 80rem; margin: 0 auto; padding: 56px 16px 24px; }
        .pro-footer-grid { gap: 40px; }
        .pro-footer h4 { color: #94a3b8; }
        .pro-footer-about { color: #475569; }
        .pro-footer a:hover { color: #3563e9; }
        .pro-footer-bottom { margin-top: 48px; }
        html.dark body { background: #111827; color: #dce4f0; }
        html.dark .pro-nav { background: rgba(15,23,42,.92); border-color: #34445c; }
        html.dark .projobs-profile-menu summary { border-color: #475569 !important; }
        html.dark .projobs-profile-menu [data-profile-dropdown] { background: #111827 !important; border-color: #34445c !important; color: #dce4f0 !important; }
        html.dark .projobs-profile-menu [data-profile-identity] { border-color: #34445c !important; }
        html.dark .projobs-profile-menu [data-profile-email] { color: #94a3b8 !important; }
        .projobs-profile-menu summary::-webkit-details-marker { display: none; }
        .projobs-profile-menu summary:focus-visible { outline: 2px solid #3563e9; outline-offset: 2px; }
        .projobs-profile-menu [data-profile-account]:hover, .projobs-profile-menu [data-projobs-logout]:hover { background: #f1f5f9 !important; }
        html.dark .projobs-profile-menu [data-profile-account]:hover { background: #25334a !important; }
        html.dark .projobs-profile-menu [data-projobs-logout]:hover { background: #3f1d2a !important; }
        html.dark .mobile-menu-toggle { background: #25334a; border-color: #475569; color: #dce4f0; }
        html.dark .pro-links { border-color: #34445c; }
        html.dark .pro-wordmark { color: #f5f7fc; }
        html.dark .pro-links a:hover, html.dark .pro-links a.active { background: #25334a; color: #f5f7fc; }
        html.dark .pro-active-pill { background: #1d347d; color: #dce8ff; }
        html.dark .jobs-hero { background: linear-gradient(115deg,#111827 0%,#111827 55%,#102a35 100%); border-color: #34445c; }
        html.dark h1, html.dark .results-heading h2 { color: #f5f7fc; }
        html.dark .jobs-hero .subtitle { color: #aab8ca; }
        html.dark .search-input, html.dark .filters-panel, html.dark .filter-group select, html.dark .filter-group input, html.dark .job-card, html.dark .no-results { background: #111827; border-color: #34445c; color: #dce4f0; }
        html.dark .results-heading p, html.dark .results-count { color: #94a3b8; }
        html.dark .job-title { color: #f1f5f9; }
        html.dark .job-tags .badge { background: #25334a; color: #aab8ca; }
        html.dark .job-card > .badge { background: #1e1b4b; color: #c7d2fe; }
        html.dark .pro-footer { background: #111827; border-color: #34445c; }
        html.dark .pro-footer h4, html.dark .pro-footer-about, html.dark .pro-footer-bottom { color: #94a3b8; }
        html.dark .pro-footer a, html.dark .pro-footer-bottom a { color: #aab8ca; }
        @media (max-width: 980px) {
          .pro-nav-inner { flex-wrap: wrap; justify-content: space-between; }
          .pro-brand { margin-right: auto; }
          .mobile-menu-toggle { display: inline-flex; }
          .pro-links { display: none; order: 5; width: 100%; justify-content: stretch; flex-direction: column; flex-wrap: nowrap; padding: 8px 0 4px; border-top: 1px solid #dce4f0; }
          .pro-links.mobile-open { display: flex; }
          .pro-links a { width: 100%; }
          .language-toggle { order: 2; }
          .theme-toggle { order: 3; }
          .jobs-hero { padding: 44px 24px 36px; }
          .filters-panel { margin-left: 16px; margin-right: 16px; }
          #jobsList { grid-template-columns: 1fr; }
        }
        @media (max-width: 560px) {
          .pro-nav-inner { gap: 10px; }
          .pro-brand { margin-right: 0; }
          .pro-links { gap: 2px; }
          .pro-links a { padding: 8px 9px; font-size: 12px; }
          .jobs-hero { padding: 36px 18px 32px; }
          .hero-eyebrow { font-size: 10px; }
          .search-container { margin-top: -16px; padding: 0 12px; }
          .filters-panel { margin: 0 12px 24px; padding: 16px; }
          .filters-header { align-items: flex-start; }
          .results-heading { align-items: flex-start; flex-direction: column; padding: 0 12px; }
          #jobsList { padding: 0 12px 28px; gap: 12px; }
          .job-card { padding: 18px; }
          .pro-footer-inner { padding: 40px 16px 22px; }
        }
        </style>
    """

def render_page(jobs: list[dict]) -> str:
    jobs_json = jobs_to_json_script(jobs)
    filters_html = render_filters_html()
    jobs_html = render_jobs_html(jobs)

    page = f'''<!DOCTYPE html>
<html lang="es">
<head>
    <script>
      // Set the platform language before the generated page renders.
      (function () {{
        try {{
          var entry = document.cookie.split('; ').find(function (part) {{ return part.indexOf('prosolutions_locale=') === 0; }});
          var shared = entry ? entry.split('=').slice(1).join('=') : '';
          var saved = localStorage.getItem('projobs-locale');
          var locale = shared === 'en' || shared === 'es' ? shared : (saved === 'en' || saved === 'es' ? saved : '');
          if (!locale) locale = (navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'es';
          document.documentElement.lang = locale;
        }} catch (error) {{
          document.documentElement.lang = (navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'es';
        }}
      }})();
    </script>
    <script>
      (function () {{
        try {{
          var cookie = document.cookie.split('; ').find(function (part) {{ return part.indexOf('prosolutions_theme=') === 0; }});
          var preference = cookie ? cookie.split('=').slice(1).join('=') : '';
          if (preference !== 'dark' && preference !== 'light') {{
            var saved = JSON.parse(localStorage.getItem('theme-storage') || 'null');
            preference = saved && saved.state && saved.state.preference;
          }}
          var dark = preference === 'dark' || (preference !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
          document.documentElement.classList.toggle('dark', dark);
          document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
        }} catch (error) {{
          /* Use CSS defaults if storage is unavailable. */
        }}
      }})();
    </script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title id="pageTitle">{SITE_TITLE}</title>
    <meta name="google-site-verification" content="UYX4wV17YfoO-ToIoXuD-0JfDpUnVROQAfYOmNfyyWk" />
    <meta name="description" id="metaDescription" content="{SITE_DESC}">
    <meta name="keywords" content="empleo, trabajo, ofertas, empleos tech, trabajo remoto, ofertas de empleo">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="{SITE_URL}">
    {ADSENSE_SCRIPT_TAG}

    <meta property="og:type" content="website">
    <meta property="og:url" content="{SITE_URL}">
    <meta property="og:title" id="ogTitle" content="{SITE_TITLE}">
    <meta property="og:description" id="ogDescription" content="{SITE_DESC}">

    {CSS_STYLES}
</head>
<body>
    <nav class="pro-nav" aria-label="Navegación del ecosistema ProSolutions" data-i18n-aria="ecosystemNav">
        <div class="pro-nav-inner">
            <a class="pro-brand" href="{CORE_URL}">
                <span class="pro-mark" aria-hidden="true">PS</span>
                <span>
                    <span class="pro-wordmark">Pro<em>Solutions</em></span>
                    <span class="pro-eyebrow">Ecosystem</span>
                </span>
            </a>
            <div class="pro-links">
                <a href="{CORE_URL}"><svg class="pro-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9"/><path d="M9 21v-7h6v7"/></svg><span data-i18n="home">ProSolutions</span></a>
                <a href="{PROCV_URL}" target="_blank" rel="noopener"><svg class="pro-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><circle cx="10" cy="13" r="2"/><path d="M7 18a3 3 0 0 1 6 0"/></svg><span>ProCV</span></a>
                <a href="{SITE_URL}" class="active" aria-current="page"><svg class="pro-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/><path d="M10 12v2h4v-2"/></svg><span>ProJobs</span><span class="pro-active-pill" data-i18n="active">Activo</span></a>
                <a href="{CORE_URL}#planes"><svg class="pro-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg><span data-i18n="plans">Planes Premium</span></a>
            </div>
            <button class="mobile-menu-toggle" id="mobileMenuToggle" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="projobs-mobile-nav"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
            <button class="language-toggle" id="languageToggle" type="button" aria-label="Cambiar idioma a inglés">EN</button>
            <button class="theme-toggle" id="themeToggle" type="button" aria-label="Activar modo oscuro" title="Activar modo oscuro"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z"/></svg></button>
        </div>
    </nav>

    <header class="jobs-hero">
        <p class="hero-eyebrow" data-i18n="heroEyebrow">OPORTUNIDADES PARA TU SIGUIENTE PASO</p>
        <h1 data-i18n="title">Encuentra tu próxima oportunidad</h1>
        <p class="subtitle" data-i18n="description">{SITE_DESC}</p>
        <p class="subtitle"><strong data-i18n="lastUpdated">Última actualización:</strong>
            {datetime.now().strftime('%d/%m/%Y a las %H:%M UTC')}</p>
    </header>

    <div class="search-container">
        <label class="search-field" for="searchInput">
            <svg class="inline-icon search-field-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
            <input type="text" id="searchInput" class="search-input"
                   data-i18n-placeholder="searchPlaceholder" placeholder="Buscar por tecnología, puesto o empresa (ej. Python, React, Senior)...">
        </label>
    </div>

    <section class="match-panel" aria-labelledby="matchPanelTitle">
        <div class="match-panel-copy">
            <h2 id="matchPanelTitle" data-i18n="matchTitle">Compatibilidad explicable</h2>
            <p data-i18n="matchDescription">Añade tus habilidades para ver coincidencias estimadas con cada oferta. Tus datos se quedan en este navegador.</p>
        </div>
        <label class="match-input-wrap" for="candidateSkillsInput">
            <svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z"/></svg>
            <input id="candidateSkillsInput" type="text" data-i18n-placeholder="skillsPlaceholder" placeholder="Tus habilidades, separadas por comas (React, SQL, Python)">
        </label>
        <p class="small-note" id="matchPrivacyNote" data-i18n="matchPrivacy">No es una evaluación automática de contratación ni se envía tu perfil a ProJobs.</p>
    </section>

    {filters_html}

    <section class="results-heading" aria-live="polite">
        <div>
            <h2 data-i18n="resultsTitle">Ofertas para explorar</h2>
            <p data-i18n="resultsDescription">Oportunidades de distintas fuentes, con filtros para encontrar el puesto adecuado.</p>
        </div>
        <p class="results-count"><strong id="totalJobs">{len(jobs)}</strong> <span data-i18n="jobsAvailable">ofertas disponibles</span></p>
    </section>

    {jobs_html}

    {jobs_json}

    <div id="noResults" class="no-results">
        <p data-i18n="noMatches">No se encontraron ofertas que coincidan con tu búsqueda.</p>
        <p data-i18n="adjustFilters">Intenta ajustar los filtros o prueba con otras palabras clave.</p>
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
                    <p class="pro-footer-about" data-i18n="footerAbout">
                        El ecosistema de herramientas profesionales tech. Crea tu hoja de vida optimizada para ATS con ProCV y encuentra tu próximo empleo remoto con ProJobs.
                    </p>
                </div>
                <div>
                    <h4 data-i18n="ecosystem">Ecosistema</h4>
                    <ul>
                        <li><a href="{CORE_URL}" data-i18n="footerHome">Inicio</a></li>
                        <li><a href="{PROCV_URL}" target="_blank" rel="noopener">ProCV</a></li>
                        <li><a href="{SITE_URL}">ProJobs</a></li>
                        <li><a href="{CORE_URL}#planes" data-i18n="plans">Planes Premium</a></li>
                    </ul>
                </div>
                <div>
                    <h4 data-i18n="legal">Legal</h4>
                    <ul>
                        <li><a href="privacidad.html" data-i18n="privacy">Privacidad</a></li>
                        <li><a href="#terminos" data-i18n="terms">Términos</a></li>
                    </ul>
                </div>
            </div>
            <div class="pro-footer-bottom">
                <p>&copy; {datetime.now().year} ProSolutions. <span data-i18n="developedBy">Un producto desarrollado por</span>
                    <a href="{JATC_URL}" target="_blank" rel="noopener">JATC.DEV</a></p>
                <p data-i18n="madeForProfessionals">Hecho para profesionales tech</p>
            </div>
        </div>
    </footer>

    {JS_CODE}
    <script>window.__PROJOBS_API_URL__ = {json.dumps(PROJOBS_API_URL)};</script>
    <script src="auth.js"></script>
</body>
</html>'''

    return "\n".join(line.rstrip() for line in page.splitlines())


JS_CODE = f'''<script>
const COPY = {{
  es: {{ pageTitle: 'ProJobs | Encuentra tu próxima oportunidad', title: 'Encuentra tu próxima oportunidad', heroEyebrow: 'Oportunidades para tu siguiente paso', resultsTitle: 'Ofertas para explorar', resultsDescription: 'Oportunidades de distintas fuentes, con filtros para encontrar el puesto adecuado.', jobsAvailable: 'ofertas disponibles', madeForProfessionals: 'Hecho para profesionales tech', description: 'Encuentra empleo en tecnología, administración, ventas, salud, educación y más. Actualizado diariamente.', home: 'ProSolutions', footerHome: 'Inicio', plans: 'Planes Premium', active: 'Activo', createCv: 'Crear mi CV Gratis', lastUpdated: 'Última actualización:', searchPlaceholder: 'Buscar por tecnología, puesto o empresa (ej. Python, React, Senior)...', filtersTitle: 'Filtros de búsqueda', resetFilters: 'Limpiar filtros', country: 'País', allCountries: 'Todos los países', sector: 'Sector', allSectors: 'Todos los sectores', modality: 'Modalidad', all: 'Todas', remote: 'Remoto', onsite: 'Presencial', hybrid: 'Híbrido', contractType: 'Tipo de contrato', permanent: 'Indefinido', temporary: 'Temporal', internship: 'Prácticas', freelance: 'Freelance', schedule: 'Jornada', fullTime: 'Completa', partTime: 'Parcial', matchTitle: 'Compatibilidad explicable', matchDescription: 'Añade tus habilidades para ver coincidencias estimadas con cada oferta. Tus datos se quedan en este navegador.', skillsPlaceholder: 'Tus habilidades, separadas por comas (React, SQL, Python)', matchPrivacy: 'No es una evaluación automática de contratación ni se envía tu perfil a ProJobs.', salaryNotDisclosed: 'Salario no informado', sourceIdentified: 'Fuente identificada', publishedRecently: 'Actualizada recientemente', tailorCv: 'Adaptar mi CV en ProCV', alertNamePlaceholder: 'Nombre de la alerta (p. ej. React remoto)', dailyAlerts: 'Diaria', weeklyAlerts: 'Semanal', createAlert: 'Crear alerta', alertSaved: 'Alerta guardada', alertNeedsFilters: 'Selecciona al menos un filtro para crear una alerta.', alertNeedsLogin: 'Inicia sesión para guardar alertas.', alertFailed: 'No se pudo guardar la alerta. Inténtalo de nuevo.', experience: 'Experiencia', anyLevel: 'Cualquier nivel', junior: 'Junior', mid: 'Medio', senior: 'Senior', unspecified: 'No especificado', noMatches: 'No se encontraron ofertas que coincidan con tu búsqueda.', adjustFilters: 'Intenta ajustar los filtros o prueba con otras palabras clave.', footerAbout: 'El ecosistema de herramientas profesionales tech. Crea tu hoja de vida optimizada para ATS con ProCV y encuentra tu próximo empleo con ProJobs.', ecosystem: 'Ecosistema', legal: 'Legal', privacy: 'Privacidad', terms: 'Términos', jobsToday: 'Total de ofertas cargadas hoy:', developedBy: 'Un producto desarrollado por', ecosystemNav: 'Navegación del ecosistema ProSolutions', source: 'Fuente', viewJob: 'Ver oferta completa', saveJob: 'Guardar', savedJob: 'Guardado', activeCount: n => `${{n}} activo${{n === 1 ? '' : 's'}}`, sectors: {{ tecnologia: 'Tecnología y Datos', finanzas: 'Administración, Finanzas y Contabilidad', ventas: 'Ventas, Marketing y Atención al Cliente', ingenieria: 'Ingeniería, Industria y Mantenimiento', salud: 'Salud y Ciencias de la Vida', educacion: 'Educación y Formación', logistica: 'Logística, Transporte y Operaciones', construccion: 'Construcción y Oficios', hosteleria: 'Hostelería, Turismo y Restauración', 'recursos-humanos': 'Recursos Humanos y Servicios Profesionales', 'sector-publico': 'Sector Público y Organizaciones Sociales', otras: 'Otras Áreas y Ofertas' }} }},
  en: {{ pageTitle: 'ProJobs | Find your next opportunity', title: 'Find your next opportunity', heroEyebrow: 'Opportunities for your next step', resultsTitle: 'Explore job listings', resultsDescription: 'Opportunities from multiple sources, with filters to find the right role.', jobsAvailable: 'available jobs', madeForProfessionals: 'Made for tech professionals', description: 'Find jobs in technology, administration, sales, healthcare, education, and more. Updated daily.', home: 'ProSolutions', footerHome: 'Home', plans: 'Premium plans', active: 'Active', createCv: 'Create my free CV', lastUpdated: 'Last updated:', searchPlaceholder: 'Search by technology, role, or company (e.g. Python, React, Senior)...', filtersTitle: 'Search filters', resetFilters: 'Clear filters', country: 'Country', allCountries: 'All countries', sector: 'Industry', allSectors: 'All industries', modality: 'Work setup', all: 'All', remote: 'Remote', onsite: 'On-site', hybrid: 'Hybrid', contractType: 'Contract type', permanent: 'Permanent', temporary: 'Temporary', internship: 'Internship', freelance: 'Freelance', schedule: 'Schedule', fullTime: 'Full-time', partTime: 'Part-time', matchTitle: 'Explainable job match', matchDescription: 'Add your skills to see estimated matches for each listing. Your data stays in this browser.', skillsPlaceholder: 'Your skills, separated by commas (React, SQL, Python)', matchPrivacy: 'This is not a hiring assessment and your profile is not sent to ProJobs.', salaryNotDisclosed: 'Salary not disclosed', sourceIdentified: 'Source identified', publishedRecently: 'Recently updated', tailorCv: 'Tailor my CV in ProCV', alertNamePlaceholder: 'Alert name (e.g. remote React)', dailyAlerts: 'Daily', weeklyAlerts: 'Weekly', createAlert: 'Create alert', alertSaved: 'Alert saved', alertNeedsFilters: 'Choose at least one filter to create an alert.', alertNeedsLogin: 'Sign in to save alerts.', alertFailed: 'Could not save the alert. Try again.', experience: 'Experience', anyLevel: 'Any level', junior: 'Junior', mid: 'Mid-level', senior: 'Senior', unspecified: 'Unspecified', noMatches: 'No jobs match your search.', adjustFilters: 'Try adjusting the filters or searching for different keywords.', footerAbout: 'The professional tech tools ecosystem. Build an ATS-optimized resume with ProCV and find your next job with ProJobs.', ecosystem: 'Ecosystem', legal: 'Legal', privacy: 'Privacy', terms: 'Terms', jobsToday: 'Jobs loaded today:', developedBy: 'A product by', ecosystemNav: 'ProSolutions ecosystem navigation', source: 'Source', viewJob: 'View full listing', saveJob: 'Save', savedJob: 'Saved', activeCount: n => `${{n}} active filter${{n === 1 ? '' : 's'}}`, sectors: {{ tecnologia: 'Technology and Data', finanzas: 'Administration, Finance and Accounting', ventas: 'Sales, Marketing and Customer Service', ingenieria: 'Engineering, Industry and Maintenance', salud: 'Healthcare and Life Sciences', educacion: 'Education and Training', logistica: 'Logistics, Transport and Operations', construccion: 'Construction and Trades', hosteleria: 'Hospitality, Tourism and Food Service', 'recursos-humanos': 'Human Resources and Professional Services', 'sector-publico': 'Public Sector and Nonprofits', otras: 'Other Areas and Jobs' }} }}
}};
function readSharedLocale() {{
  const entry = document.cookie.split('; ').find(part => part.startsWith('prosolutions_locale='));
  const value = entry ? entry.split('=').slice(1).join('=') : '';
  return value === 'en' || value === 'es' ? value : null;
}}
function persistLocale(value) {{
  try {{ localStorage.setItem('projobs-locale', value); }} catch {{ /* storage unavailable */ }}
  const host = window.location.hostname;
  const domain = host === 'prosolutions.page' || host.endsWith('.prosolutions.page') ? '; Domain=.prosolutions.page' : '';
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = 'prosolutions_locale=' + value + '; Path=/; Max-Age=31536000; SameSite=Lax' + domain + secure;
}}
let locale = readSharedLocale() || localStorage.getItem('projobs-locale');
if (locale !== 'en' && locale !== 'es') locale = navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es';
const copy = () => COPY[locale];
function applyLocale() {{
  const text = copy();
  persistLocale(locale);
  document.documentElement.lang = locale;
  document.querySelectorAll('[data-i18n]').forEach(el => {{ el.textContent = text[el.dataset.i18n]; }});
  document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', text[el.dataset.i18nAria]));
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = text[el.dataset.i18nPlaceholder]);
  document.querySelectorAll('[data-i18n-sector]').forEach(el => el.textContent = text.sectors[el.dataset.i18nSector]);
  document.getElementById('pageTitle').textContent = text.pageTitle || text.title;
  document.getElementById('metaDescription').content = text.description;
  document.getElementById('ogTitle').content = text.title;
  document.getElementById('ogDescription').content = text.description;
  const button = document.getElementById('languageToggle');
  button.textContent = locale === 'es' ? 'EN' : 'ES';
  button.setAttribute('aria-label', locale === 'es' ? 'Switch language to English' : 'Cambiar idioma a español');
  button.title = button.getAttribute('aria-label');
  populateCountries();
  renderJobs();
  updateActiveFiltersCount();
  if (typeof isDark !== 'undefined') applyTheme(isDark);
}}
function labelFor(value) {{
  const aliases = {{ remoto: 'remote', presencial: 'onsite', 'híbrido': 'hybrid', indefinido: 'permanent', temporal: 'temporary', 'prácticas': 'internship', completa: 'fullTime', parcial: 'partTime', junior: 'junior', medio: 'mid', senior: 'senior', 'no-especificado': 'unspecified' }};
  const key = aliases[value] || value;
  return copy()[key] || value.charAt(0).toUpperCase() + value.slice(1);
}}

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

        function countryLabel(value) {{
            const country = String(value || '').trim();
            if (country === 'REMOTE') return locale === 'es' ? 'Remoto / Global' : 'Remote / Global';
            if (country === 'UNKNOWN') return locale === 'es' ? 'No especificado' : 'Unspecified';
            if (/^[A-Z]{{2}}$/.test(country)) {{
                try {{
                    return new Intl.DisplayNames([locale || 'es'], {{ type: 'region' }}).of(country) || country;
                }} catch {{ /* Keep the stable stored code if Intl is unavailable. */ }}
            }}
            return country;
        }}

        // ISO 3166-1 codes: expose every country/territory even if no jobs are listed there.
        const WORLD_COUNTRY_CODES = ["AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW"];
        function populateCountries() {{
            const selectedCode = activeFilters.country || countryFilter.value || '';
            const countries = [...new Set([
                'REMOTE', ...WORLD_COUNTRY_CODES,
                ...allJobs.map(job => job.country).filter(Boolean),
                ...allJobs.flatMap(job => Array.isArray(job.countries) ? job.countries : [])
            ])].sort((a, b) => countryLabel(a).localeCompare(countryLabel(b), locale));
            countryFilter.replaceChildren(new Option(copy().allCountries, ''));
            countries.forEach(country => {{
                countryFilter.add(new Option(countryLabel(country), country));
            }});
            countryFilter.value = countries.includes(selectedCode) ? selectedCode : '';
        }}
        populateCountries();

        function stableJobId(job) {{
            if (job.id) return String(job.id);
            const input = String(job.url || job.title || '');
            let hash = 2166136261;
            for (let i = 0; i < input.length; i++) {{
                hash ^= input.charCodeAt(i);
                hash = Math.imul(hash, 16777619);
            }}
            return (hash >>> 0).toString(16).padStart(8, '0');
        }}

        const candidateSkillsInput = document.getElementById('candidateSkillsInput');
        try {{ candidateSkillsInput.value = localStorage.getItem('projobs-candidate-skills') || ''; }} catch {{ /* storage unavailable */ }}
        function getCandidateSkills() {{
            return [...new Set(candidateSkillsInput.value.split(/[,;\\n]+/).map(value => value.trim().toLowerCase()).filter(value => value.length >= 2))].slice(0, 40);
        }}
        function matchForJob(job) {{
            const skills = getCandidateSkills();
            if (!skills.length) return null;
            const corpus = [job.title, job.company, job.description, ...(job.tags || []), ...(job.skills || [])].join(' ').replace(/<[^>]*>/g, ' ').toLowerCase();
            const matches = skills.filter(skill => corpus.includes(skill));
            return {{ score: Math.round(matches.length / skills.length * 100), matches }};
        }}
        function freshnessForJob(job) {{
            const published = Date.parse(job.date_published || '');
            if (!Number.isFinite(published)) return '';
            const days = Math.max(0, Math.floor((Date.now() - published) / 86400000));
            if (days <= 7) return locale === 'es' ? 'Publicada hace ' + days + ' d' : 'Posted ' + days + 'd ago';
            if (days <= 30) return locale === 'es' ? 'Publicada hace ' + days + ' d' : 'Posted ' + days + 'd ago';
            return locale === 'es' ? 'Publicación antigua: ' + days + ' d' : 'Older listing: ' + days + 'd';
        }}
        function proCvUrlForJob(job) {{
            const url = new URL('/dashboard', 'https://procv.prosolutions.page');
            url.searchParams.set('jobTitle', String(job.title || '').slice(0, 180));
            const description = String(job.description || '').replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim();
            const context = description || [job.title, job.company, job.location, job.modality, job.contract_type].filter(Boolean).join(' · ');
            url.searchParams.set('jobDescription', context.slice(0, 3000));
            url.searchParams.set('source', 'projobs');
            return url.toString();
        }}
        function renderJobs() {{
            jobsList.replaceChildren();
            if (totalJobsEl) totalJobsEl.textContent = filteredJobs.length;
            if (filteredJobs.length === 0) {{
                jobsList.style.display = 'none';
                noResults.style.display = 'block';
                window.dispatchEvent(new CustomEvent('projobs:jobs-rendered'));
                return;
            }}
            jobsList.style.display = '';
            noResults.style.display = 'none';
            filteredJobs.forEach(job => {{
                const jobId = stableJobId(job);
                const jobUrl = String(job.url || '');
                const jobTitle = String(job.title || '');
                const company = String(job.company || '');
                const sourceUrls = {{
                    'Arbeitnow': 'https://www.arbeitnow.com/',
                    'Remotive': 'https://remotive.com/',
                    'Jobicy': 'https://jobicy.com/',
                    'Himalayas': 'https://himalayas.app/',
                    'RemoteOK': 'https://remoteok.com/'
                }};
                const card = document.createElement('article');
                card.className = 'job-card';
                card.dataset.jobId = jobId;
                card.dataset.country = job.country || '';
                card.dataset.sector = job.sector || '';
                card.dataset.modality = job.modality || '';
                card.dataset.contract = job.contract_type || '';
                card.dataset.jobtype = job.job_type || '';
                card.dataset.experience = job.experience || '';
                card.dataset.date = job.date_published || '';
                const match = matchForJob(job);
                const freshness = freshnessForJob(job);
                const matchMarkup = match ? `<span class="job-match-badge" title="${{escapeHtml(match.matches.length ? (locale === 'es' ? 'Coincidencias: ' : 'Matched skills: ') + match.matches.join(', ') : (locale === 'es' ? 'No se encontraron coincidencias textuales' : 'No text matches found'))}}">${{match.score}}% ${{locale === 'es' ? 'coincidencia' : 'match'}}</span>` : '';
                card.innerHTML = `
                    <div class="job-badges">
                      <span class="badge">${{copy().source}}: <a href="${{sourceUrls[job.source] || 'https://projobs.prosolutions.page/'}}" target="_blank" rel="noopener noreferrer">${{escapeHtml(job.source || 'ProJobs')}}</a></span>
                      <span class="job-quality-note">${{copy().sourceIdentified}}</span>
                      ${{job.salary?.raw ? '' : `<span class="salary-undisclosed">${{copy().salaryNotDisclosed}}</span>`}}
                      ${{freshness ? `<span class="job-quality-note">${{escapeHtml(freshness)}}</span>` : ''}}
                      ${{matchMarkup}}
                    </div>
                    <h2 class="job-title">${{escapeHtml(jobTitle)}}</h2>
                    <div class="job-info">
                        <svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></svg> <strong>${{escapeHtml(company || (locale === 'es' ? 'Empresa no especificada' : 'Company not specified'))}}</strong>
                        &nbsp;|&nbsp; <svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg> ${{escapeHtml(job.location || (locale === 'es' ? 'Ubicación no especificada' : 'Location not specified'))}}
                        ${{job.country && job.country !== job.location ? `· ${{escapeHtml(countryLabel(job.country))}}` : ''}}
                        ${{job.salary?.raw ? `· <svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10h.01M18 14h.01"/></svg> ${{escapeHtml(job.salary.raw)}}` : ''}}
                        ${{job.experience && job.experience !== 'no-especificado' ? `· ${{labelFor(job.experience)}}` : ''}}
                    </div>
                    <div class="job-tags">
                        <span class="badge">${{labelFor(job.modality || 'no-especificado')}}</span>
                        <span class="badge">${{labelFor(job.contract_type || 'no-especificado')}}</span>
                        <span class="badge">${{copy().sectors[job.sector] || escapeHtml(job.sector || 'otras')}}</span>
                    </div>
                    <div class="job-actions">
                        <a href="${{escapeHtml(jobUrl)}}" class="btn" data-i18n="viewJob"
                           data-action="apply" data-job-id="${{escapeHtml(jobId)}}"
                           data-job-url="${{escapeHtml(jobUrl)}}" data-job-title="${{escapeHtml(jobTitle)}}"
                           data-company="${{escapeHtml(company)}}" target="_blank" rel="noopener sponsored">${{copy().viewJob}}</a>
                        <a href="${{escapeHtml(proCvUrlForJob(job))}}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">${{copy().tailorCv}}</a>
                        <button type="button" class="btn-save" data-action="save-job"
                           data-job-id="${{escapeHtml(jobId)}}" data-job-url="${{escapeHtml(jobUrl)}}"
                           data-job-title="${{escapeHtml(jobTitle)}}" data-company="${{escapeHtml(company)}}"
                           aria-label="${{locale === 'es' ? 'Guardar empleo' : 'Save job'}}"
                           aria-pressed="false"><svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg><span>${{copy().saveJob}}</span></button>
                    </div>
                `;
                jobsList.appendChild(card);
            }});
            window.dispatchEvent(new CustomEvent('projobs:jobs-rendered'));
        }}

        function applyFilters() {{
            const country = countryFilter.value.trim().toUpperCase();
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
                if (country && job.country !== country && job.country !== 'REMOTE' && !(job.countries || []).includes(country)) return false;
                if (sector && job.sector !== sector) return false;
                if (modality && job.modality !== modality) return false;
                if (contract && job.contract_type !== contract) return false;
                if (jobType && job.job_type !== jobType) return false;
                if (experience && job.experience !== experience) return false;
                if (search && !(
                    job.title.toLowerCase().includes(search) ||
                    job.company.toLowerCase().includes(search) ||
                    job.location.toLowerCase().includes(search) ||
                    countryLabel(job.country).toLowerCase().includes(search)
                )) return false;
                return true;
            }});

            renderJobs();
            updateActiveFiltersCount();
        }}

        function updateActiveFiltersCount() {{
            const count = Object.values(activeFilters).filter(v => v).length;
            activeFiltersCount.textContent = copy().activeCount(count);
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

        countryFilter.addEventListener('input', applyFilters);
        countryFilter.addEventListener('change', applyFilters);
        sectorFilter.addEventListener('change', applyFilters);
        modalityFilter.addEventListener('change', applyFilters);
        contractFilter.addEventListener('change', applyFilters);
        jobTypeFilter.addEventListener('change', applyFilters);
        experienceFilter.addEventListener('change', applyFilters);
        searchInput.addEventListener('input', applyFilters);
        candidateSkillsInput.addEventListener('input', () => {{
            try {{ localStorage.setItem('projobs-candidate-skills', candidateSkillsInput.value.slice(0, 1000)); }} catch {{ /* storage unavailable */ }}
            renderJobs();
        }});
        resetFiltersBtn.addEventListener('click', resetFilters);
        document.getElementById('createAlertButton').addEventListener('click', async () => {{
            const button = document.getElementById('createAlertButton');
            if (!window.proJobsAuth?.isAuthenticated()) {{
                if (window.proJobsAuth?.login) window.proJobsAuth.login();
                else window.location.assign('https://identity.prosolutions.page/login?redirect_uri=' + encodeURIComponent(window.location.href));
                return;
            }}
            const filters = {{ q: activeFilters.search, country: activeFilters.country, sector: activeFilters.sector, modality: activeFilters.modality, contract: activeFilters.contract, jobType: activeFilters.jobType, experience: activeFilters.experience }};
            Object.keys(filters).forEach(key => {{ if (!filters[key]) delete filters[key]; }});
            if (!Object.keys(filters).length) {{ window.alert(copy().alertNeedsFilters); return; }}
            const name = document.getElementById('alertNameInput').value.trim() || [activeFilters.search, activeFilters.country, activeFilters.sector].filter(Boolean).join(' · ') || (locale === 'es' ? 'Mi alerta de empleo' : 'My job alert');
            const token = window.proJobsAuth.getToken();
            button.disabled = true;
            try {{
                const response = await fetch((window.__PROJOBS_API_URL__ || 'https://projobs-api-0clw.onrender.com') + '/api/job-alerts', {{
                    method: 'POST', headers: {{ 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }},
                    body: JSON.stringify({{ name, filters, frequency: document.getElementById('alertFrequency').value }})
                }});
                const data = await response.json().catch(() => ({{}}));
                if (!response.ok) throw new Error(data.message || copy().alertFailed);
                button.textContent = copy().alertSaved;
                window.setTimeout(() => {{ button.textContent = copy().createAlert; }}, 2200);
            }} catch (error) {{
                window.alert(error.message || copy().alertFailed);
            }} finally {{ button.disabled = false; }}
        }});

        document.getElementById('mobileMenuToggle').addEventListener('click', () => {{
            const menu = document.querySelector('.pro-links');
            const button = document.getElementById('mobileMenuToggle');
            const isOpen = menu.classList.toggle('mobile-open');
            button.setAttribute('aria-expanded', String(isOpen));
            button.setAttribute('aria-label', isOpen ? (locale === 'es' ? 'Cerrar menú' : 'Close menu') : (locale === 'es' ? 'Abrir menú' : 'Open menu'));
            button.innerHTML = isOpen ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
        }});
        document.addEventListener('keydown', event => {{
            if (event.key === 'Escape') {{
                document.querySelector('.pro-links').classList.remove('mobile-open');
                const button = document.getElementById('mobileMenuToggle');
                button.setAttribute('aria-expanded', 'false');
                button.setAttribute('aria-label', locale === 'es' ? 'Abrir menú' : 'Open menu');
                button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
            }}
        }});

        document.getElementById('languageToggle').addEventListener('click', () => {{
            locale = locale === 'es' ? 'en' : 'es';
            persistLocale(locale);
            applyLocale();
        }});
        function applyTheme(isDark) {{
            document.documentElement.classList.toggle('dark', isDark);
            document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
            const button = document.getElementById('themeToggle');
            const label = isDark
                ? (locale === 'es' ? 'Activar modo claro' : 'Switch to light mode')
                : (locale === 'es' ? 'Activar modo oscuro' : 'Switch to dark mode');
            button.innerHTML = isDark
                ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
                : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z"/></svg>';
            button.setAttribute('aria-label', label);
            button.title = label;
        }}
        let isDark = false;
        try {{
            const themeCookie = document.cookie.split('; ').find(part => part.startsWith('prosolutions_theme='));
            const cookiePreference = themeCookie ? themeCookie.split('=').slice(1).join('=') : '';
            const savedTheme = JSON.parse(localStorage.getItem('theme-storage') || 'null')?.state?.preference;
            const preference = (cookiePreference === 'dark' || cookiePreference === 'light') ? cookiePreference : savedTheme;
            isDark = preference === 'dark' || (preference !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }} catch {{
            isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }}
        applyTheme(isDark);
        document.getElementById('themeToggle').addEventListener('click', () => {{
            isDark = !isDark;
            const preference = isDark ? 'dark' : 'light';
            try {{ localStorage.setItem('theme-storage', JSON.stringify({{ state: {{ preference }} }})); }} catch {{ /* storage unavailable */ }}
            document.cookie = 'prosolutions_theme=' + preference + '; Domain=.prosolutions.page; Path=/; Max-Age=31536000; SameSite=Lax; Secure';
            applyTheme(isDark);
        }});
        applyLocale();
    </script>
    '''


if os.environ.get("PROJOBS_SKIP_FETCH") == "1":
    try:
        with open("jobs.json", encoding="utf-8") as jobs_file:
            all_jobs = json.load(jobs_file)
        if not isinstance(all_jobs, list):
            raise ValueError("jobs.json must contain an array")
        print(f"Using {len(all_jobs)} cached jobs (PROJOBS_SKIP_FETCH=1).")
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Could not load cached jobs.json: {exc}")
else:
    all_jobs = fetch_all_jobs()

print(f"🚀 ¡Archivos actualizados con éxito! Total de ofertas: {len(all_jobs)}")

html_content = render_page(all_jobs)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html_content)

with open("jobs.json", "w", encoding="utf-8") as f:
    json.dump(all_jobs, f, ensure_ascii=False, indent=2)

print(f"🚀 ¡Archivos actualizados con éxito! Total de ofertas: {len(all_jobs)}")
