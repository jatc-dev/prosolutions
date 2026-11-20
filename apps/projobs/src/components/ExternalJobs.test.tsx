import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExternalJobsResponse } from "../../server/src/contracts";
import { ExternalJobs } from "./ExternalJobs";

function mockApi(body: ExternalJobsResponse) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("ExternalJobs", () => {
  it("renders nothing while the integration is off", async () => {
    const fetchMock = mockApi({ enabled: false, sources: [], items: [], total: 0 });
    const { container } = render(<ExternalJobs q="contador" location="" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("lists partner offers with attribution and an outbound, non-endorsed link", async () => {
    const fetchMock = mockApi({
      enabled: true,
      sources: [
        { id: "careerjet", name: "Careerjet", url: "https://www.careerjet.com.co" },
        { id: "remotive", name: "Remotive", url: "https://remotive.com" },
      ],
      total: 2,
      items: [
        { id: "abc", title: "Auxiliar contable", company: "Comercial Andina", location: "Bogotá", snippet: "Causación de facturas.", salary: "$2.000.000", postedAt: null, url: "https://jobviewtrack.com/job-1", source: "careerjet" },
        { id: "def", title: "Agente de soporte", company: "Acme", location: "Remoto · LATAM", snippet: "Chat y correo.", salary: null, postedAt: null, url: "https://remotive.com/remote-jobs/x/1", source: "remotive" },
      ],
    });
    render(<ExternalJobs q="contador" location="Bogotá" />);
    expect(await screen.findByText("Auxiliar contable")).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/external-jobs?q=contador&location=Bogot%C3%A1&page=1");
    expect(screen.getByRole("link", { name: "Careerjet" })).toHaveAttribute("href", "https://www.careerjet.com.co");
    expect(screen.getByRole("link", { name: "Remotive" })).toHaveAttribute("href", "https://remotive.com");
    expect(screen.getByText(/Publicada en Remotive/)).toBeInTheDocument();
    const link = screen.getAllByRole("link", { name: /Ver oferta/ })[0]!;
    expect(link).toHaveAttribute("href", "https://jobviewtrack.com/job-1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("nofollow");
    expect(screen.queryByRole("button", { name: "Ver más vacantes" })).not.toBeInTheDocument();
  });
});
