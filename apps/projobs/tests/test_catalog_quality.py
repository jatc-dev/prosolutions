"""Regresiones de calidad del catálogo de ProJobs: URLs, fechas e identidad."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from generator import canonical_url, deduplicate_jobs, normalize_country, normalize_job, normalize_published_date


def test_canonical_url_removes_tracking_case_insensitively():
    original = "HTTPS://EXAMPLE.COM/jobs/123/?UTM_Source=mail&fbclid=abc&id=7#apply"
    assert canonical_url(original) == "https://example.com/jobs/123?id=7"


def test_canonical_url_keeps_meaningful_query_and_path_case():
    assert canonical_url("https://example.com/Jobs?id=1") != canonical_url(
        "https://example.com/jobs?id=1"
    )
    assert canonical_url("https://example.com/jobs?id=1&lang=es") != canonical_url(
        "https://example.com/jobs?id=1&lang=en"
    )


def test_deduplicate_jobs_uses_normalized_complete_identity():
    jobs = [
        {"title": " Senior Developer ", "company": "Acme  Inc.", "location": "Bogotá, CO",
         "url": "https://jobs.example/one"},
        {"title": "senior developer", "company": "ACME INC.", "location": "Bogotá, CO",
         "url": "https://jobs.example/two"},
        {"title": "Analyst", "company": "Other", "location": "Bogotá, CO",
         "url": "https://jobs.example/three"},
    ]
    result = deduplicate_jobs(jobs)
    assert [job["title"].strip() for job in result] == ["Senior Developer", "Analyst"]


def test_deduplicate_jobs_does_not_merge_incomplete_identities():
    jobs = [
        {"title": "Support Specialist", "company": "", "location": "", "url": "https://jobs.example/a"},
        {"title": "Support Specialist", "company": "", "location": "", "url": "https://jobs.example/b"},
        {"title": "Support Specialist", "company": "", "location": "", "url": "https://jobs.example/a?utm_source=x"},
    ]
    result = deduplicate_jobs(jobs)
    assert len(result) == 2


def test_normalize_job_accepts_common_publication_date_fields_and_trims_values():
    job = {
        "title": "  Backend Engineer  ",
        "company_name": "  Example Co  ",
        "location": "Remote",
        "url": " https://jobs.example/backend ",
        "publication_date": "2026-10-17T12:00:00Z",
    }
    result = normalize_job(job, "TestSource")
    assert result is not None
    assert result["title"] == "Backend Engineer"
    assert result["company"] == "Example Co"
    assert result["url"] == "https://jobs.example/backend"
    assert result["date_published"] == "2026-10-17T12:00:00Z"


def test_normalize_country_uses_stable_iso_codes_for_common_aliases():
    assert normalize_country("Bogotá, CO") == "CO"
    assert normalize_country("New York, United States") == "US"
    assert normalize_country("España") == "ES"
    assert normalize_country("Remote - UK") == "GB"
    assert normalize_country("Worldwide") == "REMOTE"


def test_normalize_job_rejects_non_http_urls_after_trimming():
    job = {"title": "Engineer", "url": " javascript:alert(1) "}
    assert normalize_job(job, "TestSource") is None


def test_numeric_publication_timestamp_is_normalized_to_iso_utc():
    value = normalize_published_date({"created_at": 1792238400})
    assert value.endswith("Z")
    assert "T" in value
    assert value != "1792238400"


if __name__ == "__main__":
    tests = [
        value for name, value in sorted(globals().items())
        if name.startswith("test_") and callable(value)
    ]
    for test in tests:
        test()
        print(f"✓ {test.__name__}")
    print(f"{len(tests)} pruebas de calidad del catálogo superadas.")
