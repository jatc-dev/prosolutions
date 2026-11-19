import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { IDENTITY_ORIGIN, openConsentPreferences } from "@prosolutions/ui";
import { ABOUT_PAGE, getLegalDocument, type LegalSlug } from "../../content/legal";
import { MarkdownContent } from "../../content/markdown";
import { SITE } from "../../content/site";
import { PublicLayout, formatDate } from "../PublicLayout";
import { headForPath, useDocumentHead } from "../seo";

export function LegalPage({ slug }: { slug: LegalSlug }) {
  const doc = getLegalDocument(slug)!;
  useDocumentHead(headForPath(doc.path));
  return (
    <PublicLayout noAds breadcrumbs={[{ name: doc.title, path: doc.path }]}>
      <article className="mx-auto max-w-3xl px-4 pb-12 pt-8 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-ui-text sm:text-4xl">{doc.title}</h1>
        <p className="mt-3 text-sm text-ui-subtle">
          Vigente desde el <time dateTime={doc.updatedAt}>{formatDate(doc.updatedAt)}</time>
        </p>
        {slug === "cookies" && (
          <button
            type="button"
            onClick={openConsentPreferences}
            className="mt-5 rounded-ui-md border border-ui-border-strong px-4 py-2 text-sm font-semibold text-ui-text hover:bg-ui-soft"
          >
            Cambiar mis preferencias de cookies
          </button>
        )}
        <div className="mt-6">
          <MarkdownContent source={doc.body} />
        </div>
        <OperatorDetails />
      </article>
    </PublicLayout>
  );
}

/** Registered operator details; fields that are not confirmed yet are omitted. */
function OperatorDetails() {
  const { operator } = SITE;
  return (
    <section aria-label="Datos del responsable" className="mt-10 rounded-ui-lg border border-ui-border bg-ui-soft p-5 text-sm leading-6 text-ui-muted">
      <p className="font-semibold text-ui-text">Responsable</p>
      <p>
        {SITE.name}, operado por {operator.name}
        {operator.taxId ? ` · NIT ${operator.taxId}` : ""}
      </p>
      {operator.address && <p>{operator.address}</p>}
      <p>{operator.city}</p>
      <p>
        Correo: <a href={`mailto:${SITE.contactEmail}`} className="underline">{SITE.contactEmail}</a>
      </p>
    </section>
  );
}

export function AboutPage() {
  useDocumentHead(headForPath(ABOUT_PAGE.path));
  return (
    <PublicLayout noAds breadcrumbs={[{ name: "Nosotros", path: ABOUT_PAGE.path }]}>
      <article className="mx-auto max-w-3xl px-4 pb-12 pt-8 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-ui-text sm:text-4xl">{ABOUT_PAGE.title}</h1>
        <div className="mt-4">
          <MarkdownContent source={ABOUT_PAGE.body} />
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/tools/" className="rounded-ui-md bg-ui-accent px-4 py-2 text-sm font-semibold text-ui-on-accent hover:bg-ui-accent-hover">
            Probar las herramientas
          </Link>
          <Link to="/contacto/" className="rounded-ui-md border border-ui-border-strong px-4 py-2 text-sm font-semibold text-ui-text hover:bg-ui-soft">
            Contáctanos
          </Link>
        </div>
      </article>
    </PublicLayout>
  );
}

export const CONTACT_TOPICS = [
  { value: "soporte", label: "Soporte técnico o de cuenta" },
  { value: "empresas", label: "Empresas y reclutadores" },
  { value: "datos-personales", label: "Datos personales (Habeas Data)" },
  { value: "prensa", label: "Prensa y alianzas" },
  { value: "otro", label: "Otro" },
] as const;

export interface ContactForm {
  topic: string;
  name: string;
  email: string;
  message: string;
  acceptPrivacyPolicy: boolean;
  website: string;
}

/** Client-side validation mirroring the ProIdentity schema (the server validates again). */
export function validateContact(form: ContactForm): Partial<Record<keyof ContactForm, string>> {
  const errors: Partial<Record<keyof ContactForm, string>> = {};
  if (!CONTACT_TOPICS.some((topic) => topic.value === form.topic)) errors.topic = "Elige un tema.";
  if (form.name.trim().length < 2) errors.name = "Escribe tu nombre.";
  else if (form.name.trim().length > 120) errors.name = "El nombre es demasiado largo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errors.email = "Escribe un correo válido.";
  if (form.message.trim().length < 20) errors.message = "Cuéntanos un poco más (mínimo 20 caracteres).";
  else if (form.message.trim().length > 5000) errors.message = "El mensaje supera los 5.000 caracteres.";
  if (!form.acceptPrivacyPolicy) errors.acceptPrivacyPolicy = "Debes autorizar el tratamiento de tus datos para responderte.";
  return errors;
}

const fieldClass =
  "mt-1 block w-full rounded-ui-md border bg-ui-surface px-3 py-2 text-ui-text shadow-sm focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-focus";

export function ContactPage() {
  useDocumentHead(headForPath("/contacto"));
  const location = useLocation();
  const initialTopic = new URLSearchParams(location.search).get("tema") ?? "soporte";
  const [form, setForm] = useState<ContactForm>({
    topic: CONTACT_TOPICS.some((topic) => topic.value === initialTopic) ? initialTopic : "soporte",
    name: "",
    email: "",
    message: "",
    acceptPrivacyPolicy: false,
    website: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [reference, setReference] = useState("");
  const [serverError, setServerError] = useState("");

  const update = <K extends keyof ContactForm>(key: K, value: ContactForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateContact(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setStatus("sending");
    setServerError("");
    try {
      const response = await fetch(`${IDENTITY_ORIGIN}/api/public/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, name: form.name.trim(), email: form.email.trim(), message: form.message.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus("error");
        setServerError(
          response.status === 429
            ? "Recibimos demasiados mensajes desde tu conexión. Intenta de nuevo en una hora o escríbenos por correo."
            : payload?.message || "No pudimos enviar tu mensaje. Intenta de nuevo o escríbenos por correo.",
        );
        return;
      }
      setReference(String(payload?.reference ?? ""));
      setStatus("sent");
    } catch {
      setStatus("error");
      setServerError("No pudimos conectarnos. Revisa tu conexión o escríbenos por correo.");
    }
  };

  const border = (key: keyof ContactForm) => (errors[key] ? "border-ui-danger" : "border-ui-border");

  return (
    <PublicLayout noAds breadcrumbs={[{ name: "Contacto", path: "/contacto" }]}>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 pb-12 pt-8 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section>
          <h1 className="text-3xl font-bold tracking-tight text-ui-text sm:text-4xl">Contacto</h1>
          <p className="mt-4 leading-7 text-ui-muted">
            Escríbenos y te responderemos al correo que indiques, normalmente en un plazo de tres días hábiles.
          </p>
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-ui-text">Correo institucional</dt>
              <dd>
                <a href={`mailto:${SITE.contactEmail}`} className="text-ui-accent underline">{SITE.contactEmail}</a>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-ui-text">Datos personales (Habeas Data)</dt>
              <dd className="text-ui-muted">
                Consultas en máximo 10 días hábiles y reclamos en máximo 15 días hábiles, según la Ley 1581 de 2012. Detalles en la{" "}
                <Link to="/legal/privacidad/" className="underline">política de privacidad</Link>.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-ui-text">Empresas</dt>
              <dd className="text-ui-muted">Verificación de empresas, publicación de vacantes y alianzas.</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="form-title" className="rounded-ui-lg border border-ui-border bg-ui-surface p-5 shadow-card">
          <h2 id="form-title" className="text-lg font-semibold text-ui-text">Envíanos un mensaje</h2>
          {status === "sent" ? (
            <div role="status" className="mt-4 rounded-ui-md border border-ui-success p-4 text-sm text-ui-text">
              <p className="font-semibold">¡Mensaje recibido!</p>
              <p className="mt-1 text-ui-muted">
                Te responderemos a {form.email}.{reference && reference !== "ok" ? ` Número de referencia: ${reference}.` : ""}
              </p>
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={submit} noValidate>
              <div>
                <label htmlFor="contact-topic" className="block text-sm font-medium text-ui-text">Tema</label>
                <select id="contact-topic" className={`${fieldClass} ${border("topic")}`} value={form.topic} onChange={(event) => update("topic", event.target.value)}>
                  {CONTACT_TOPICS.map((topic) => (
                    <option key={topic.value} value={topic.value}>{topic.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-ui-text">Nombre</label>
                  <input
                    id="contact-name"
                    autoComplete="name"
                    className={`${fieldClass} ${border("name")}`}
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "contact-name-error" : undefined}
                  />
                  {errors.name && <p id="contact-name-error" className="mt-1 text-xs text-ui-danger">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-ui-text">Correo electrónico</label>
                  <input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    className={`${fieldClass} ${border("email")}`}
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "contact-email-error" : undefined}
                  />
                  {errors.email && <p id="contact-email-error" className="mt-1 text-xs text-ui-danger">{errors.email}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-ui-text">Mensaje</label>
                <textarea
                  id="contact-message"
                  rows={6}
                  maxLength={5000}
                  className={`${fieldClass} ${border("message")}`}
                  value={form.message}
                  onChange={(event) => update("message", event.target.value)}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? "contact-message-error" : undefined}
                />
                {errors.message && <p id="contact-message-error" className="mt-1 text-xs text-ui-danger">{errors.message}</p>}
              </div>
              {/* Honeypot: hidden from people and assistive technology. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="contact-website">Sitio web</label>
                <input id="contact-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} />
              </div>
              <div>
                <label className="flex items-start gap-2 text-sm text-ui-text">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.acceptPrivacyPolicy}
                    onChange={(event) => update("acceptPrivacyPolicy", event.target.checked)}
                    aria-invalid={Boolean(errors.acceptPrivacyPolicy)}
                  />
                  <span>
                    Autorizo el tratamiento de mis datos para responder esta solicitud, según la{" "}
                    <Link to="/legal/privacidad/" className="underline">política de privacidad</Link>.
                  </span>
                </label>
                {errors.acceptPrivacyPolicy && <p className="mt-1 text-xs text-ui-danger">{errors.acceptPrivacyPolicy}</p>}
              </div>
              {status === "error" && (
                <p role="alert" className="text-sm text-ui-danger">{serverError}</p>
              )}
              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full rounded-ui-md bg-ui-accent px-4 py-2.5 text-sm font-semibold text-ui-on-accent hover:bg-ui-accent-hover disabled:opacity-60"
              >
                {status === "sending" ? "Enviando…" : "Enviar mensaje"}
              </button>
            </form>
          )}
        </section>
      </div>
    </PublicLayout>
  );
}

export function NotFoundPage() {
  useDocumentHead({
    title: "Página no encontrada | ProSolutions",
    description: "La página que buscas no existe o cambió de dirección.",
    path: "/404",
    robots: "noindex, follow",
  });
  return (
    <PublicLayout noAds>
      <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <p className="text-sm font-semibold text-ui-accent">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ui-text">No encontramos esta página</h1>
        <p className="mt-3 text-ui-muted">Puede que el enlace esté incompleto o que la página haya cambiado de dirección.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="rounded-ui-md bg-ui-accent px-4 py-2 text-sm font-semibold text-ui-on-accent hover:bg-ui-accent-hover">Ir al inicio</Link>
          <Link to="/academy/" className="rounded-ui-md border border-ui-border-strong px-4 py-2 text-sm font-semibold text-ui-text hover:bg-ui-soft">Ver la academia</Link>
          <Link to="/tools/" className="rounded-ui-md border border-ui-border-strong px-4 py-2 text-sm font-semibold text-ui-text hover:bg-ui-soft">Ver herramientas</Link>
        </div>
      </section>
    </PublicLayout>
  );
}
