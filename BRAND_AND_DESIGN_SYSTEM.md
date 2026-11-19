# ProSolutions — Marca y Design System (Etapa 1)

Fecha: 2026-11-18 · Objetivo: que Core, ProCV, ProJobs (incluido ProRecruit), ProAcademy, ProTools y ProAdmin se perciban como **un solo producto**: sobrio, rápido y legible, en la línea de Linear, Stripe y Apple. Los colores se usan con contención, la jerarquía tipográfica es clara y hay mucho aire.

---

## 1. Auditoría visual actual (evidencia)

| Aspecto | Estado real | Problema |
|---|---|---|
| Fuente de verdad | `packages/ui/src/tokens.ts` + `theme.css` (21 variables `--ui-*`) | **Ninguna app genera Tailwind desde los tokens**: el bloque `brand` está copiado a mano en `apps/core`, `apps/procv/frontend` y `apps/projobs` (`tailwind.config.js`) |
| Color primario | Esmeralda: `#047857` como `primary-500` | La escala está rota: el salto 400→500 es abrupto (`#34d399` → `#047857`) y 800 = 900 (`#022c22`) |
| Neutros | `tokens.ts` usa grises con tinte verde (`#f4f5f3`, `#202520`); los componentes usan `slate-*` de Tailwind | Dos familias de neutros a la vez |
| `theme-color` | Core y ProCV: índigo `#4f46e5` y `#1e1b4b`; ProJobs: `#047857` y `#111210` | La barra del navegador móvil no coincide con la marca en 2 de 3 apps |
| Tipografía | `tokens.ts`: Inter. Core y ProJobs: Manrope (Google Fonts). ProCV: fuente del sistema | Tres tipografías distintas |
| Colores escritos a mano | Core: 73 `emerald`, 514 `slate`. ProCV: **149 `blue` + 305 `gray`** + 895 `slate` + 35 `emerald`. ProJobs: casi todo con tokens `brand` | ProCV se ve como otro producto (azul y gris frente a esmeralda y slate) |
| Componentes compartidos | `ProHeader` (en Core 11 archivos, ProCV 3, ProJobs 1), `ProFooter` (Core 7, ProJobs 1, **ProCV 0**), `Button`, `Card`, `Input`, `Select`, `Badge`, `Container`, `AdSlot` | ProJobs tiene primitivas propias (`components/primitives.tsx`) que duplican las de `packages/ui` |
| Modo oscuro | `darkMode: "class"` en las 3 apps + `useTheme` | Funciona, pero cada app define sus propias superficies oscuras |
| Logo | `ProSolutionsLogo.tsx` (SVG en línea) | Bien; falta el sistema de submarcas (ProCV, ProJobs…) y los favicons coherentes |

**Conclusión:** la marca (esmeralda + neutros fríos) ya es la correcta y no hay que cambiarla. Hay que **normalizarla y forzarla técnicamente**.

---

## 2. Principios

1. **Contención del color:** el esmeralda solo marca la acción primaria, la selección y el foco. El resto de la interfaz es neutro.
2. **Una jerarquía por pantalla:** un solo botón primario visible por vista.
3. **La densidad depende de la tarea:** las zonas públicas son espaciosas; los paneles de trabajo (pipeline, editor) son compactos.
4. **Accesibilidad AA como mínimo:** texto ≥ 4,5:1, elementos de interfaz ≥ 3:1, foco siempre visible y objetivos táctiles de al menos 44 px.
5. **Rendimiento visual:** fuente variable autoalojada, iconos SVG (`lucide-react`) y sin imágenes decorativas pesadas.

---

## 3. Tokens

Fuente única: `packages/ui/src/tokens.ts`. A partir de ella se **generan** `theme.css` (variables CSS para claro y oscuro) y un **preset de Tailwind** (`@prosolutions/ui/tailwind-preset`), que las apps importan en lugar de copiar valores.

### 3.1 Paletas base (primitivas)
**Brand (esmeralda):**
`50 #ECFDF5 · 100 #D1FAE5 · 200 #A7F3D0 · 300 #6EE7B7 · 400 #34D399 · 500 #10B981 · 600 #059669 · 700 #047857 · 800 #065F46 · 900 #064E3B · 950 #022C22`

**Neutral (slate, fría):**
`0 #FFFFFF · 50 #F8FAFC · 100 #F1F5F9 · 200 #E2E8F0 · 300 #CBD5E1 · 400 #94A3B8 · 500 #64748B · 600 #475569 · 700 #334155 · 800 #1E293B · 900 #0F172A · 950 #020617`

**Semánticos:** success `#15803D` / `#4ADE80` · warning `#B45309` / `#FBBF24` · danger `#B91C1C` / `#F87171` · info `#0369A1` / `#38BDF8` (claro / oscuro)

### 3.2 Tokens semánticos (lo único que usan los componentes)
| Token | Claro | Oscuro | Uso | Contraste |
|---|---|---|---|---|
| `--bg` | `#F8FAFC` | `#020617` | Fondo de la app | — |
| `--surface` | `#FFFFFF` | `#0F172A` | Tarjetas, paneles | — |
| `--surface-raised` | `#FFFFFF` + sombra | `#1E293B` | Menús, popovers, modales | — |
| `--surface-sunken` | `#F1F5F9` | `#0B1222` | Inputs deshabilitados, zonas secundarias | — |
| `--border` | `#E2E8F0` | `#1E293B` | Divisores, bordes de tarjeta | — |
| `--border-strong` | `#7C8BA1` | `#5B6B82` | Bordes de input, checkbox, radio (WCAG 1.4.11) | 3,5:1 sobre blanco / 3,3:1 sobre `#0F172A` |
| `--text` | `#0F172A` | `#F1F5F9` | Texto principal | 17,9:1 / 16,3:1 |
| `--text-secondary` | `#475569` | `#CBD5E1` | Texto de apoyo | 7,6:1 / 12,0:1 |
| `--text-muted` | `#64748B` | `#94A3B8` | Metadatos, placeholders | 4,8:1 / 7,0:1 |
| `--accent` | `#047857` | `#34D399` | Botón primario, enlaces, selección | Blanco sobre `#047857`: 5,5:1. `#022C22` sobre `#34D399`: 7,9:1. `#34D399` sobre `#0F172A`: 9,3:1 |
| `--accent-hover` | `#065F46` | `#6EE7B7` | Hover del primario | — |
| `--accent-soft` | `#ECFDF5` | `rgba(52,211,153,.12)` | Fondo de chips o filas seleccionadas | — |
| `--on-accent` | `#FFFFFF` | `#022C22` | Texto sobre el acento | — |
| `--focus-ring` | `#059669` | `#34D399` | Anillo de 2 px con 2 px de separación | 3,8:1 sobre blanco / 9,3:1 sobre `#0F172A` |
| `--success / --warning / --danger / --info` | Ver §3.1 | Ver §3.1 | Estados | ≥ 4,5:1 sobre `--surface` |

**Regla:** queda prohibido usar clases de paleta cruda (`bg-blue-600`, `text-gray-500`, `emerald-*`) en las apps. Solo se permiten las semánticas (`bg-surface`, `text-muted`, `bg-accent`…). Lo comprueba una regla de ESLint en CI.

### 3.3 Tipografía
- **Familia única: Inter Variable**, autoalojada (`woff2`, solo el subconjunto latino y latino extendido, `font-display: swap`), con `font-feature-settings: "cv11", "ss01"` y **`tnum`** en cifras (salarios, calculadoras, tablas).
  - Motivo: es legible en interfaces densas (pipeline, editor), tiene numerales tabulares y es la que ya declara `tokens.ts`.
  - **Se retira Manrope.**
- Respaldo: `-apple-system, "Segoe UI", Roboto, sans-serif`.

| Token | Tamaño / interlineado | Peso | Tracking | Uso |
|---|---|---|---|---|
| `display` | 48/52 (móvil 36/40) | 700 | −0,025em | Titular de la home |
| `h1` | 36/40 (móvil 30/36) | 700 | −0,02em | Título de página |
| `h2` | 24/32 | 600 | −0,015em | Sección |
| `h3` | 20/28 | 600 | −0,01em | Tarjeta o bloque |
| `body-lg` | 18/28 | 400 | 0 | Introducciones, guías |
| `body` | 16/24 | 400 | 0 | Texto base (mínimo en móvil) |
| `body-sm` | 14/20 | 400 / 500 | 0 | Interfaz densa, tablas |
| `caption` | 12/16 | 500 | 0,01em | Metadatos, badges |
| `mono` | 13/20 | 400 | 0 | Código, IDs |

### 3.4 Espaciado, radios, sombras, movimiento
- **Espaciado (base 4 px):** `0, 1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48, 16=64, 20=80, 24=96`.
- **Layout:**
  - Contenedor de 1200 px (contenido de lectura: 720 px).
  - Márgenes laterales de 16 px en móvil, 24 px en tablet y 32 px en escritorio.
  - Retícula de 12 columnas con 24 px de separación.
- **Radios:** `sm 6px` (inputs, chips) · `md 10px` (botones, tarjetas compactas) · `lg 14px` (tarjetas, paneles) · `xl 20px` (modales, hero) · `full` (avatares, píldoras).
- **Sombras (claro):**
  - `sm: 0 1px 2px rgba(15,23,42,.06)`
  - `md: 0 4px 12px -2px rgba(15,23,42,.08), 0 2px 4px -2px rgba(15,23,42,.06)`
  - `lg: 0 16px 40px -8px rgba(15,23,42,.18)`
  - En oscuro se usa **elevación por superficie** (`--surface-raised`) más un borde de 1 px, no sombras.
- **Movimiento:** `fast 120ms` (hover), `base 180ms` (estados, popovers), `slow 280ms` (modales, paneles) · curva `cubic-bezier(.2,.8,.2,1)`. Se respeta `prefers-reduced-motion` (sin desplazamientos, solo opacidad).
- **Z-index:** `dropdown 1000 · sticky 1100 · overlay 1200 · modal 1300 · toast 1400`.
- **Breakpoints:** `sm 640 · md 768 · lg 1024 · xl 1280`.

### 3.5 Tema
`<html data-theme="light|dark">`. Por defecto sigue `prefers-color-scheme`; la preferencia del usuario se guarda en ProIdentity (`/api/preferences/me`), de modo que **el mismo tema se aplica en todos los subdominios**. `theme-color` se genera desde `--bg`: `#F8FAFC` y `#020617`.

---

## 4. Componentes compartidos (`packages/ui` v2)

Todos con estados *default / hover / active / focus-visible / disabled / loading*, con soporte de teclado completo y probados con `@testing-library` y axe.

| Componente | Variantes y notas |
|---|---|
| `Button` | `primary` (acento), `secondary` (superficie + borde), `ghost`, `danger`, `link`; tamaños `sm 32` / `md 40` / `lg 48` px; con icono a la izquierda o derecha; `loading` con spinner y ancho estable |
| `IconButton` | Cuadrado; `aria-label` obligatorio |
| `Input`, `Textarea`, `Select`, `Combobox`, `Checkbox`, `Radio`, `Switch` | Label siempre visible, ayuda, error (`aria-describedby`), contador opcional |
| `Field` | Envoltorio de label, control, ayuda y error |
| `Card` | `flat` (borde), `raised` (sombra) e `interactive` (hover y foco, toda la tarjeta clicable) |
| `Badge` / `Tag` | `neutral`, `accent`, `success`, `warning`, `danger`, `info`; `Tag` es eliminable (habilidades) |
| `Avatar` / `CompanyLogo` | Iniciales como respaldo; tamaños de 24 a 64 |
| `Tabs`, `SegmentedControl` | Para filtros de vista y secciones |
| `Dialog`, `Drawer`, `Popover`, `Menu`, `Tooltip` | Basados en primitivas accesibles (Radix UI) |
| `Toast` | Uno solo por app, en la esquina inferior; `role="status"` |
| `EmptyState` | Icono, título, texto y hasta 2 acciones (patrón ya usado en el catálogo vacío de ProJobs) |
| `Skeleton` | Para listas y fichas; respeta la reducción de movimiento |
| `DataTable` | Ordenable; densidad `comfortable` o `compact`; cifras tabulares |
| `Pagination`, `Breadcrumbs` | — |
| `StatCard` | KPI para ProAdmin y métricas de empresa |
| `StageTracker` | Etapas de la postulación (hoy en ProJobs → se mueve a `packages/ui`) |
| `MatchMeter` | Afinidad con motivos (habilidades cumplidas y faltantes) |
| `AdSlot` | Tamaño reservado (evita CLS); solo en ProAcademy y ProTools |
| `AppShell` | `ProHeader` + navegación de área + contenido + `ProFooter` (§5) |

Las primitivas propias de ProJobs (`apps/projobs/src/components/primitives.tsx`) se sustituyen por estas. ProCV migra sus 450+ clases de color escritas a mano.

---

## 5. Estructura de navegación

### 5.1 Cabecera global (`ProHeader`, igual en todos los subdominios)
```
[Logo ProSolutions]  Empleos · Crear CV · Guías · Herramientas          [Para empresas]  [Tema]  [Entrar | Avatar ▾]
```
- Los enlaces son tareas, no nombres de producto: "Empleos" lleva a ProJobs, "Crear CV" a ProCV, "Guías" a ProAcademy y "Herramientas" a ProTools. Los nombres de módulo aparecen como submarca en cada sección ("ProJobs" bajo el título), no como menú.
- **Menú del avatar:** Mi panel · Mi perfil · Mis CV · Mis postulaciones · Guardados · (si es reclutador) Panel de empresa · (si es admin) Administración · Seguridad y sesiones · Preferencias · Cerrar sesión.
- **En móvil:** cabecera compacta, menú en un `Drawer` y barra inferior en el área de candidato (Inicio, Empleos, CV, Postulaciones, Perfil).

### 5.2 Mapa por audiencia
| Audiencia | Rutas | Navegación del área |
|---|---|---|
| **Pública** | `/` (home), `/empleos`, `/empleos/{slug}`, `/empleos/{cargo}-en-{ciudad}`, `/empresas/{slug}`, `/crear-cv`, `/plantillas`, `/guias`, `/guias/{slug}`, `/herramientas`, `/herramientas/{slug}`, `/para-empresas`, `/privacidad`, `/terminos` | Cabecera global + pie con mapa del sitio (Empleos por ciudad, Guías populares, Herramientas) |
| **Candidato** | `/panel` (resumen: completitud del perfil, postulaciones activas, vacantes recomendadas), `/perfil`, `/cv` (lista) → editor de ProCV, `/postulaciones`, `/guardados`, `/alertas` | Navegación lateral en escritorio y barra inferior en móvil |
| **Empresa (ProRecruit)** | `/empresa` (resumen y métricas), `/empresa/vacantes`, `/empresa/vacantes/nueva`, `/empresa/vacantes/{id}/candidatos` (pipeline kanban + lista), `/empresa/perfil`, `/empresa/equipo`, `/empresa/plantillas-email` | Navegación lateral con selector de empresa arriba |
| **Admin (ProAdmin)** | `/admin` (KPIs), `/admin/usuarios`, `/admin/empresas`, `/admin/vacantes`, `/admin/reportes`, `/admin/procv`, `/admin/auditoria`, `/admin/accesos` | Navegación lateral; cabecera con indicador de entorno (QA o producción) |

Las rutas del candidato se reparten hoy entre subdominios (ProCV y ProJobs). `AppShell` garantiza la **misma navegación lateral** en ambos, con enlaces absolutos entre subdominios. Los usuarios perciben una sola aplicación.

### 5.3 Pie de página (`ProFooter`)
Cuatro columnas:
- **Producto:** Empleos, Crear CV, Plantillas, Para empresas.
- **Recursos:** Guías, Herramientas.
- **Empresa:** Acerca de, Contacto.
- **Legal:** Privacidad, Términos, Cookies.

Debajo, el lema "Hecho para profesionales de todas las áreas" y el crédito. **ProCV debe incorporarlo** (hoy no lo usa).

---

## 6. Marca

- **Nombre y arquitectura:**
  - Marca madre **ProSolutions**.
  - Submarcas funcionales **ProCV**, **ProJobs**, **ProAcademy** y **ProTools**. ProRecruit se presenta como "ProSolutions para empresas" para no fragmentar.
  - ProAdmin es interno; no se muestra al público.
- **Logo:**
  - Se conserva `ProSolutionsLogo`.
  - Cada submarca usa el mismo isotipo más su nombre en `600` y el color `--text`. Sin colores propios por módulo: **un solo acento**.
- **Iconografía:** `lucide-react`, trazo de 1,75 px, tamaños 16, 20 y 24.
- **Ilustración y fotografía:** fotografía real y diversa (oficios, salud, comercio, logística, oficina), no solo escritorios de programador. Los estados vacíos usan iconos, no ilustraciones pesadas.
- **Voz:**
  - Español neutro latinoamericano y tuteo.
  - Frases cortas y verbos de acción ("Postúlate", "Crea tu CV").
  - Sin jerga técnica ni anglicismos innecesarios ("vacante", no "opening").
  - Transparencia: siempre se explica por qué ("Te recomendamos esta vacante porque cumples 4 de 5 requisitos").
- **Favicons y PWA:** isotipo sobre `--accent` en 32, 180 y 512 px y versión *maskable*; un manifest por subdominio con `theme_color` coherente.

---

## 7. Implementación (Etapa 3)

1. `packages/ui`: `tokens.ts` v2 → script `build:tokens` que genera `theme.css` y `tailwind-preset.cjs`, más fuentes autoalojadas en `packages/ui/fonts`.
2. Cada app: `presets: [require('@prosolutions/ui/tailwind-preset')]` y se borra el bloque `brand` duplicado. `theme-color` y manifest se generan desde los tokens.
3. Regla de CI que rechaza clases de paleta cruda (expresión regular sobre `src/**/*.tsx`, con una allowlist temporal por archivo para la migración de ProCV).
4. Migración por orden de impacto: `ProHeader`/`ProFooter`/`AppShell` → ProJobs (primitivas) → Core → ProCV (editor y plantillas de UI; las **plantillas de CV en PDF** mantienen su propia paleta, porque son documentos del usuario, no interfaz).
5. Revisión visual con capturas de Playwright en claro y oscuro, escritorio y móvil, por ruta clave. Se añaden a CI como regresión visual.
