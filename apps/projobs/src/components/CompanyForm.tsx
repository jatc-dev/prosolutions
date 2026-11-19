import { Button, Input, Select } from "@prosolutions/ui";
import { useState, type FormEvent } from "react";
import { COMPANY_SIZES, type EmployerCompany } from "../../server/src/contracts";
import { ApiError, errorMessage } from "../lib/api";
import { useSession } from "../lib/session";
import { ErrorNotice } from "./primitives";

interface CompanyFormProps {
  company?: EmployerCompany;
  onSaved: (company: EmployerCompany) => void;
  onCancel?: () => void;
}

export function CompanyForm({ company, onSaved, onCancel }: CompanyFormProps) {
  const { request } = useSession();
  const [form, setForm] = useState({
    name: company?.name ?? "",
    tagline: company?.tagline ?? "",
    industry: company?.industry ?? "",
    sizeRange: company?.sizeRange ?? "",
    headquarters: company?.headquarters ?? "",
    website: company?.website ?? "",
    logoUrl: company?.logoUrl ?? "",
    description: company?.description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const body = {
      name: form.name.trim(),
      tagline: form.tagline.trim() || null,
      industry: form.industry.trim() || null,
      sizeRange: form.sizeRange || null,
      headquarters: form.headquarters.trim() || null,
      website: form.website.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
      description: form.description.trim() || null,
    };
    try {
      const result = company
        ? await request<{ company: EmployerCompany }>(`/api/employer/companies/${company.id}`, { method: "PATCH", body })
        : await request<{ company: EmployerCompany }>("/api/employer/companies", { method: "POST", body });
      onSaved(result.company);
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setFieldErrors(Object.fromEntries(err.details.map((detail) => [detail.path, "Revisa este campo"])));
      }
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nombre de la empresa" required minLength={2} maxLength={120} value={form.name} onChange={set("name")} error={fieldErrors.name} />
        <Input label="Industria" maxLength={80} value={form.industry} onChange={set("industry")} placeholder="Ej. Comercio minorista" />
        <div className="sm:col-span-2">
          <Input label="Frase corta" maxLength={160} value={form.tagline} onChange={set("tagline")} placeholder="Qué hace tu empresa en una línea" />
        </div>
        <Select label="Tamaño" value={form.sizeRange} onChange={set("sizeRange")}>
          <option value="">Sin especificar</option>
          {COMPANY_SIZES.map((size) => <option key={size} value={size}>{size} personas</option>)}
        </Select>
        <Input label="Sede principal" maxLength={120} value={form.headquarters} onChange={set("headquarters")} placeholder="Ciudad, país" />
        <Input label="Sitio web" type="url" value={form.website} onChange={set("website")} placeholder="https://" error={fieldErrors.website} />
        <Input label="URL del logo (https)" type="url" value={form.logoUrl} onChange={set("logoUrl")} placeholder="https://…/logo.png" error={fieldErrors.logoUrl} />
      </div>
      <div>
        <label htmlFor="company-description" className="mb-1 block text-sm font-medium">Descripción</label>
        <textarea id="company-description" rows={4} maxLength={5000} value={form.description} onChange={set("description")} className="w-full rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/30" />
      </div>
      {error && <ErrorNotice message={error} />}
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={saving || form.name.trim().length < 2}>{saving ? "Guardando…" : company ? "Guardar cambios" : "Crear empresa"}</Button>
      </div>
    </form>
  );
}
