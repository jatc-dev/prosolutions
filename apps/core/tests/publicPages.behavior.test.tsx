import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoreLocaleProvider } from "../src/i18n";
import { ContactPage } from "../src/public/pages/InfoPages";
import { NetSalaryToolPage, SettlementToolPage } from "../src/public/pages/ToolsPages";

const renderPage = (element: JSX.Element, path = "/") => {
  // Anonymous visitor: the header session check fails quietly.
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })));
  return render(
    <CoreLocaleProvider>
      <MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>
    </CoreLocaleProvider>,
  );
};

afterEach(() => vi.unstubAllGlobals());

describe("ProTools in the browser", () => {
  it("calculates net salary and employer cost as the user types", () => {
    renderPage(<NetSalaryToolPage />, "/tools/salario-neto");
    expect(screen.getByText(/Completa los datos/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Salario básico mensual (COP)"), { target: { value: "1.750.905" } });
    const net = screen.getByRole("heading", { name: "Lo que recibe el trabajador cada mes" }).parentElement!;
    // Minimum wage: 1.750.905 + 249.095 transport − 2 × 70.036 (4% + 4%), no withholding.
    expect(within(net).getByText("Auxilio de transporte")).toBeInTheDocument();
    expect(within(net).getByText("Neto a recibir").nextSibling?.textContent).toMatch(/1\.859\.928/);
    expect(screen.getByText("Costo total mensual")).toBeInTheDocument();
    expect(screen.getByText(/Actualización normativa/)).toBeInTheDocument();
    expect(screen.getByText(/Aviso legal/)).toBeInTheDocument();
  });

  it("shows a clear error when the dates are inverted", () => {
    renderPage(<SettlementToolPage />, "/tools/liquidacion");
    fireEvent.change(screen.getByLabelText("Fecha de ingreso"), { target: { value: "2026-06-01" } });
    fireEvent.change(screen.getByLabelText("Fecha de retiro"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("Salario básico mensual (COP)"), { target: { value: "3000000" } });
    expect(screen.getByRole("alert")).toHaveTextContent(/fecha de retiro/);
  });
});

describe("contact form", () => {
  it("validates before sending and posts to ProIdentity", async () => {
    renderPage(<ContactPage />, "/contacto?tema=datos-personales");
    expect(screen.getByLabelText("Tema")).toHaveValue("datos-personales");

    fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    expect(screen.getByText("Escribe tu nombre.")).toBeInTheDocument();
    expect(screen.getByText(/Debes autorizar/)).toBeInTheDocument();

    const fetchMock = vi.fn(async (url: string) =>
      url.includes("/api/public/contact")
        ? { ok: true, status: 201, json: async () => ({ reference: "AB12CD34" }) }
        : { ok: false, status: 401, json: async () => ({}) },
    );
    vi.stubGlobal("fetch", fetchMock);

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ana Pérez" } });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Mensaje"), { target: { value: "Quiero conocer y actualizar mis datos personales." } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("AB12CD34"));
    const [url, init] = fetchMock.mock.calls.find(([called]) => String(called).includes("/api/public/contact"))!;
    expect(url).toMatch(/\/api\/public\/contact$/);
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({ topic: "datos-personales", acceptPrivacyPolicy: true, website: "" });
  });
});
