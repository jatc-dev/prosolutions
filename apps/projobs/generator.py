from datetime import datetime
import json
import sys
import urllib.request

# Evita UnicodeEncodeError en consolas Windows (cp1252) al imprimir emojis.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Configuración básica de la web
SITE_URL = "https://jatc-dev.github.io/empleos-tech-remoto/"
SITE_TITLE = "Empleos Tech Remotos | Ofertas Diarias para Programadores"
SITE_DESC = "Encuentra las mejores ofertas de trabajo remoto en tecnología: Desarrollo Web, Python, React, Data y DevOps. Actualizado todos los días."

all_jobs = []

# ---------------------------------------------------------
# 1. API Arbeitnow
# ---------------------------------------------------------
try:
  url_arbeitnow = "https://www.arbeitnow.com/api/job-board-api"
  req = urllib.request.Request(
      url_arbeitnow, headers={"User-Agent": "Mozilla/5.0"}
  )
  with urllib.request.urlopen(req, timeout=10) as response:
    data = json.loads(response.read().decode())
    jobs_arbeitnow = data.get("data", [])[:15]
    for job in jobs_arbeitnow:
      all_jobs.append({
          "title": job.get("title", "Oferta Tech Remota"),
          "company": job.get("company_name", "Empresa confidencial"),
          "location": job.get("location", "Remoto"),
          "url": job.get("url", "#"),
          "source": "Arbeitnow",
      })
    print(
        f"✅ {len(jobs_arbeitnow)} empleos obtenidos de Arbeitnow."
    )
except Exception as e:
  print(f"⚠️ Error en API Arbeitnow: {e}")

# ---------------------------------------------------------
# 2. API Remotive
# ---------------------------------------------------------
try:
  url_remotive = "https://remotive.com/api/remote-jobs?limit=20"
  req = urllib.request.Request(
      url_remotive, headers={"User-Agent": "Mozilla/5.0"}
  )
  with urllib.request.urlopen(req, timeout=10) as response:
    data = json.loads(response.read().decode())
    jobs_remotive = data.get("jobs", [])[:15]
    for job in jobs_remotive:
      all_jobs.append({
          "title": job.get("title", "Oferta Tech Remota"),
          "company": job.get("company_name", "Empresa confidencial"),
          "location": job.get("candidate_required_location", "Remoto Mundial"),
          "url": job.get("url", "#"),
          "source": "Remotive",
      })
    print(
        f"✅ {len(jobs_remotive)} empleos obtenidos de Remotive."
    )
except Exception as e:
  print(f"⚠️ Error en API Remotive: {e}")

# ---------------------------------------------------------
# 3. Generación de sitemap.xml (SEO para Google Search Console)
# ---------------------------------------------------------
today_iso = datetime.now().strftime("%Y-%m-%d")
sitemap_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>{SITE_URL}</loc>
        <lastmod>{today_iso}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>{SITE_URL}privacidad.html</loc>
        <lastmod>{today_iso}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.3</priority>
    </url>
</urlset>"""

with open("sitemap.xml", "w", encoding="utf-8") as f:
  f.write(sitemap_xml)
print("✅ Archivo sitemap.xml generado con éxito.")

# ---------------------------------------------------------
# 4. Generación de privacidad.html
# ---------------------------------------------------------
privacy_html = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Política de Privacidad | Empleos Tech Remotos</title>
    <style>
        body {{ font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 25px; color: #1c1e21; line-height: 1.6; background: #f4f6f8; }}
        .container {{ background: white; padding: 30px; border-radius: 8px; border: 1px solid #d0d7de; box-shadow: 0 2px 5px rgba(0,0,0,0.03); }}
        h1, h2 {{ color: #0969da; }}
        a {{ color: #0969da; text-decoration: none; }}
        a:hover {{ text-decoration: underline; }}
    </style>
</head>
<body>
    <div class="container">
        <p><a href="index.html">← Volver al Portal de Empleos</a></p>
        <h1>Política de Privacidad</h1>
        <p>En <strong>Empleos Tech Remotos</strong>, la privacidad de nuestros visitantes es una prioridad.</p>

        <h2>Uso de Cookies y Redes de Anuncios</h2>
        <p>Este sitio web puede utilizar cookies para mejorar la experiencia del usuario y mostrar publicidad personalizada a través de proveedores de terceros, como Google AdSense.</p>
        <p>Los proveedores de terceros, incluido Google, utilizan cookies para mostrar anuncios basados en las visitas anteriores del usuario a este sitio web o a otros sitios web.</p>

        <h2>Enlaces de Afiliados y Terceros</h2>
        <p>Nuestro portal contiene enlaces a plataformas externas de empleo y servicios para profesionales. No nos hacemos responsables de los contenidos o las prácticas de privacidad de dichos sitios web.</p>

        <p><small>Última actualización: {datetime.now().strftime('%d/%m/%Y')}</small></p>
    </div>
</body>
</html>
"""

with open("privacidad.html", "w", encoding="utf-8") as f:
  f.write(privacy_html)
print("✅ Archivo privacidad.html generado con éxito.")

# ---------------------------------------------------------
# 5. Generación de index.html (Con Buscador + Afiliados)
# ---------------------------------------------------------
html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{SITE_TITLE}</title>
    <meta name="google-site-verification" content="UYX4wV17YfoO-ToIoXuD-0JfDpUnVROQAfYOmNfyyWk" />
    <meta name="description" content="{SITE_DESC}">
    <meta name="keywords" content="empleo remoto, trabajo tech, programador remoto, ofertas python, desarrollo web, react, devops">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="{SITE_URL}">

    <meta property="og:type" content="website">
    <meta property="og:url" content="{SITE_URL}">
    <meta property="og:title" content="{SITE_TITLE}">
    <meta property="og:description" content="{SITE_DESC}">

    <style>
        body {{ font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 850px; margin: 0 auto; padding: 20px; background: #f4f6f8; color: #1c1e21; line-height: 1.5; }}
        header {{ text-align: center; margin-bottom: 25px; }}
        h1 {{ color: #0969da; margin-bottom: 8px; font-size: 1.8rem; }}
        .subtitle {{ color: #57606a; font-size: 0.95rem; margin-top: 0; }}

        /* Buscador en tiempo real */
        .search-container {{ margin-bottom: 25px; text-align: center; }}
        .search-input {{ width: 100%; max-width: 600px; padding: 12px 18px; font-size: 1rem; border: 2px solid #d0d7de; border-radius: 8px; box-sizing: border-box; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }}
        .search-input:focus {{ border-color: #0969da; box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.15); }}

        /* Bloques de Monetización / Afiliados */
        .promo-banner {{ background: linear-gradient(135deg, #0969da, #044289); color: white; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }}
        .promo-banner h3 {{ margin: 0 0 8px 0; font-size: 1.2rem; }}
        .promo-banner p {{ margin: 0 0 15px 0; font-size: 0.95rem; opacity: 0.9; }}
        .promo-btn {{ display: inline-block; background: #2da44e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.9rem; }}
        .promo-btn:hover {{ background: #2c974b; }}

        .badge {{ display: inline-block; background: #e1f5fe; color: #0288d1; font-size: 0.8rem; font-weight: bold; padding: 3px 8px; border-radius: 4px; margin-bottom: 8px; }}
        .job-card {{ background: white; border: 1px solid #d0d7de; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.03); transition: transform 0.1s ease; }}
        .job-card:hover {{ transform: translateY(-2px); }}
        .job-title {{ font-size: 1.2rem; font-weight: 600; color: #0969da; margin: 0 0 6px 0; }}
        .job-info {{ color: #57606a; font-size: 0.9rem; margin-bottom: 14px; }}
        .btn {{ display: inline-block; background: #2da44e; color: white; padding: 9px 18px; text-decoration: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; }}

        .no-results {{ display: none; text-align: center; color: #57606a; padding: 30px; font-size: 1.05rem; }}

        footer {{ text-align: center; margin-top: 40px; font-size: 0.85rem; color: #6e7781; border-top: 1px solid #d0d7de; padding-top: 20px; }}
        footer a {{ color: #0969da; text-decoration: none; }}
        footer a:hover {{ text-decoration: underline; }}
    </style>
</head>
<body>
    <header>
        <h1>💼 Portal de Empleos Tech Remotos</h1>
        <p class="subtitle">Agregador diario de vacantes internacionales de programación y tecnología</p>
        <p class="subtitle"><strong>Última actualización:</strong> {datetime.now().strftime('%d/%m/%Y a las %H:%M UTC')}</p>
    </header>

    <!-- BUSCADOR -->
    <div class="search-container">
        <input type="text" id="searchInput" class="search-input" placeholder="🔍 Buscar por tecnología, puesto o empresa (ej. Python, React, Senior)...">
    </div>

    <!-- BLOQUE DE AFILIADO -->
    <section class="promo-banner">
        <h3>🚀 ¿Quieres destacar en tus postulaciones remotas?</h3>
        <p>Prepara tu CV en inglés y optimiza tu perfil técnico para superar los filtros ATS de empresas internacionales.</p>
        <a href="https://www.udemy.com/" target="_blank" rel="noopener sponsored" class="promo-btn">Ver Cursos de Preparación Tech</a>
    </section>

    <main id="jobsList">
"""

for job in all_jobs:
  title = job.get("title")
  company = job.get("company")
  location = job.get("location")
  job_url = job.get("url")
  source = job.get("source")

  html_content += f"""
        <article class="job-card">
            <span class="badge">Fuente: {source}</span>
            <h2 class="job-title">{title}</h2>
            <div class="job-info">🏢 <strong>{company}</strong> &nbsp;|&nbsp; 📍 {location}</div>
            <a href="{job_url}" class="btn" target="_blank" rel="noopener">Ver Oferta Completa</a>
        </article>
    """

html_content += f"""
    </main>

    <div id="noResults" class="no-results">
        <p>No se encontraron ofertas que coincidan con tu búsqueda. 🔍</p>
    </div>

    <footer>
        <p>Total de ofertas activas cargadas hoy: <strong>{len(all_jobs)}</strong></p>
        <p>© {datetime.now().year} Empleos Tech Remoto — Actualizado automáticamente con GitHub Actions</p>
        <p><a href="privacidad.html">Política de Privacidad</a></p>
    </footer>

    <!-- FILTRO EN TIEMPO REAL CON JS -->
    <script>
        document.getElementById('searchInput').addEventListener('input', function(e) {{
            const searchTerm = e.target.value.toLowerCase().trim();
            const cards = document.querySelectorAll('.job-card');
            let visibleCount = 0;

            cards.forEach(card => {{
                const text = card.textContent.toLowerCase();
                if (text.includes(searchTerm)) {{
                    card.style.display = 'block';
                    visibleCount++;
                }} else {{
                    card.style.display = 'none';
                }}
            }});

            const noResults = document.getElementById('noResults');
            if (visibleCount === 0 && searchTerm !== '') {{
                noResults.style.display = 'block';
            }} else {{
                noResults.style.display = 'none';
            }}
        }});
    </script>
</body>
</html>
"""

with open("index.html", "w", encoding="utf-8") as f:
  f.write(html_content)

print(
    f"🚀 ¡Archivos actualizados con éxito! Total de ofertas: {len(all_jobs)}"
)