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
assert job["country"] == "España"
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
assert normalize_country("Madrid, España") == "España"
assert normalize_country("Barcelona, Spain") == "Spain"
assert normalize_country("México") == "México"
assert normalize_country("") == "desconocido"
assert normalize_country(None) == "desconocido"
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