import sys
import os

# Agregar el directorio de projobs al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from generator import (
    normalize_job,
    normalize_country,
    normalize_modality,
    normalize_contract_type,
    normalize_job_type,
    normalize_experience,
    infer_experience,
    infer_employment_terms,
    normalize_salary,
    normalize_sector,
    is_valid_url,
    canonical_url,
    deduplicate_jobs,
    fetch_all_jobs,
)

# Pruebas de normalización
print("=== Pruebas de normalización ===")

# Prueba 1: authController normalización de job
job = {
    "title": "Senior Python Developer",
    "company_name": "Tech Solutions S.A.",
    "location": "Madrid, España",
    "url": "https://www.arbeitnow.com/job/python-dev-123",
    "remote": True,
    "category": "software-development",
    "job_type": "full-time",
    "experience_level": "senior",
    "salary": "60000 €",
    "description": "Buscamos desarrollador senior...",
}
result = normalize_job(job, "Arbeitnow")
assert result is not None, "register: authController falló"
assert result["title"] == "Senior Python Developer"
assert result["company"] == "Tech Solutions S.A."
assert job["location"] == "Madrid, España"
assert job["country"] == "ES"
assert job["url"] == "https://www.arbeitnow.com/job/python-dev-123"
assert job["source"] == "Arbeitnow"
assert job["sector"] == "tecnologia"
assert job["modality"] == "remoto"
assert job["contract_type"] == "indefinido"
assert job["job_type"] == "completa"
assert job["experience"] == "senior"
assert job["salary"]["raw"] == "60000 €"
print("  ✓ normalize_job_arbeitnow OK")

# Prueba 2: normalize_country
assert normalize_country("Madrid, España") == "ES"
assert normalize_country("Barcelona, Spain") == "ES"
assert normalize_country("México") == "MX"
assert normalize_country("") == "UNKNOWN"
assert normalize_country(None) == "UNKNOWN"
print("  ✓ normalize_country OK")

# Prueba 3: normalize_modality
assert normalize_modality(True) == "remoto"
assert normalize_modality("remote") == "remoto"
assert normalize_modality("on-site") == "presencial"
assert normalize_modality("hybrid") == "híbrido"
assert normalize_modality("remoto") == "remoto"
assert normalize_modality("presencial") == "presencial"
assert normalize_modality("híbrido") == "híbrido"
assert normalize_modality("hibrido") == "híbrido"
assert normalize_modality("desconocido") == "no-especificado"
assert normalize_modality(None) == "no-especificado"
assert normalize_modality(123) == "no-especificado"
print("  ✓ normalize_modality OK")

# Prueba 4: normalize_contract_type
assert normalize_contract_type("full-time") == "indefinido"
assert normalize_contract_type("part-time") == "parcial"
assert normalize_contract_type("contract") == "temporal"
assert normalize_contract_type("freelance") == "freelance"
assert normalize_contract_type("internship") == "prácticas"
assert normalize_contract_type("indefinido") == "indefinido"
assert normalize_contract_type("temporal") == "temporal"
assert normalize_contract_type("prácticas") == "prácticas"
assert normalize_contract_type("practicas") == "prácticas"
assert normalize_contract_type("otro") == "otro"
assert normalize_contract_type(None) == "no-especificado"
print("  ✓ normalize_contract_type OK")

# Prueba 5: normalize_job_type
assert normalize_job_type("full-time") == "completa"
assert normalize_job_type("part-time") == "parcial"
assert normalize_job_type("completa") == "completa"
assert normalize_job_type("parcial") == "parcial"
assert normalize_job_type("otro") == "otro"
assert normalize_job_type(None) == "no-especificado"
print("  ✓ normalize_job_type OK")

# Prueba 6: normalize_experience
assert normalize_experience("entry") == "junior"
assert normalize_experience("mid") == "medio"
assert normalize_experience("senior") == "senior"
assert normalize_experience("lead") == "senior"
assert normalize_experience("executive") == "senior"
assert normalize_experience("junior") == "junior"
assert normalize_experience("medio") == "medio"
assert normalize_experience("senior") == "senior"
assert normalize_experience("otro") == "no-especificado"
assert normalize_experience(None) == "no-especificado"
print("  ✓ normalize_experience OK")

# Prueba 7: normalize_salary
assert normalize_salary(None) is None
assert normalize_salary("") is None
assert normalize_salary("60000 €") == {"raw": "60000 €"}
print("  ✓ normalize_salary OK")

# Prueba 8: normalize_sector
assert normalize_sector("software-development") == "tecnologia"
assert normalize_sector("sales") == "ventas"
assert normalize_sector("marketing") == "marketing"
assert normalize_sector("desconocido") == "otras"
assert normalize_sector(None) == "otras"
assert normalize_sector("ventas", "healthcare") == "ventas"
assert normalize_sector(None, "salud") == "salud"
assert normalize_sector(None, None) == "otras"
print("  ✓ normalize_sector OK")

# Prueba 9: is_valid_url
assert is_valid_url("https://www.arbeitnow.com/job/123") is True
assert is_valid_url("http://example.com/page") is True
assert is_valid_url("not-a-url") is False
assert is_valid_url("ftp://invalid.com") is False
assert is_valid_url("") is False
assert is_valid_url(None) is False
print("  ✓ is_valid_url OK")

# Prueba 10: canonical_url
c1 = canonical_url("https://www.example.com/page?utm_source=google&id=1")
c2 = canonical_url("https://www.example.com/page?id=1")
assert c1 == c2
assert "utm_source" not in c1
print("  ✓ canonical_url OK")

# Prueba 11: deduplicate_jobs
jobs = [
    {"title": "Dev", "company": "A", "location": "Madrid", "url": "https://example.com/1"},
    {"title": "Dev 2", "company": "B", "location": "Barcelona", "url": "https://example.com/1"},
    {"title": "Dev 3", "company": "C", "location": "Valencia", "url": "https://example.com/2"},
]
result = deduplicate_jobs(jobs)
assert len(result) == 2
assert result[0]["title"] == "Dev"
assert result[1]["title"] == "Dev 3"

jobs2 = [
    {"title": "Dev", "company": "Tech", "location": "Madrid", "url": "https://a.com/1"},
    {"title": "Dev", "company": "Tech", "location": "Madrid", "url": "https://b.com/2"},
    {"title": "Otro", "company": "Otra", "location": "Valencia", "url": "https://c.com/3"},
]
result2 = deduplicate_jobs(jobs2)
assert len(result2) == 2
assert result2[0]["title"] == "Dev"
assert result2[1]["title"] == "Otro"
print("  ✓ deduplicate_jobs OK")

print("\n" + "=" * 60)
print("TODAS LAS PRUEBAS PASARON")
print("=" * 60)

# Regression cases for real-world API values that previously broke catalogue filters.
assert normalize_country("Berlin") == "DE"
assert normalize_country("Bochum") == "DE"
assert normalize_country("Frankfurt Am Main") == "DE"
assert normalize_country("Homeoffice") == "REMOTE"
assert normalize_country("Worldwide") == "REMOTE"
assert normalize_country("a city not in the country map") == "UNKNOWN"
assert normalize_modality(True) == "remoto"
assert normalize_contract_type("full_time") == "indefinido"
assert normalize_contract_type("part_time") == "parcial"
assert normalize_job_type("full_time") == "completa"
assert normalize_job_type("part_time") == "parcial"
assert normalize_sector(["software-development"]) == "tecnologia"
assert normalize_sector(None, ["marketing"]) == "marketing"
print("  ✓ ProJobs catalog regression cases OK")
assert infer_experience("Senior Engineer") == "senior"
assert infer_experience("Junior Developer") == "junior"
assert infer_employment_terms("Flexible Nebenjob", "no-especificado", "no-especificado") == ("parcial", "parcial")
assert infer_employment_terms("Freelance Writer", "no-especificado", "no-especificado") == ("no-especificado", "freelance")
print("  ✓ ProJobs employment/experience inference OK")


# Regression tests: modality inferred from title/location when source flags are absent.
hybrid_job = {
    "title": "Hybrid Product Manager",
    "company": "Example",
    "location": "Berlin",
    "url": "https://example.com/jobs/hybrid-product-manager",
}
hybrid_result = normalize_job(hybrid_job, "Generic")
assert hybrid_result["modality"] == "híbrido", hybrid_result["modality"]

remote_job = {
    "title": "Remote Backend Engineer",
    "company": "Example",
    "location": "Worldwide",
    "url": "https://example.com/jobs/remote-backend-engineer",
}
remote_result = normalize_job(remote_job, "Generic")
assert remote_result["modality"] == "remoto", remote_result["modality"]
print("  ✓ Modality inference from title/location OK")


onsite_job = {
    "title": "On-site Data Analyst",
    "company": "Example",
    "location": "Berlin",
    "url": "https://example.com/jobs/onsite-data-analyst",
}
onsite_result = normalize_job(onsite_job, "Generic")
assert onsite_result["modality"] == "presencial", onsite_result["modality"]
print("  ✓ On-site modality inference from title/location OK")
