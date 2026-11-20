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
    const fetchMock = mockApi({ enabled: false, source: null, items: [], total: 0 });
    const { container } = render(<ExternalJobs q="contador" location="" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("lists partner offers with attribution and an outbound, non-endorsed link", async () => {
    const fetchMock = mockApi({
      enabled: true,
      source: { name: "Careerjet", url: "https://www.careerjet.com.co" },
      total: 1,
      items: [{ id: "abc", title: "Auxiliar contable", company: "Comercial Andina", location: "Bogotá", snippet: "Causación de facturas.", salary: "$2.000.000", postedAt: null, url: "https://jobviewtrack.com/job-1", source: "careerjet" }],
    });
    render(<ExternalJobs q="contador" location="Bogotá" />);
    expect(await screen.findByText("Auxiliar contable")).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/external-jobs?q=contador&location=Bogot%C3%A1&page=1");
    expect(screen.getByText("Empleos por Careerjet")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Ver oferta/ });
    expect(link).toHaveAttribute("href", "https://jobviewtrack.com/job-1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("nofollow");
    expect(screen.queryByRole("button", { name: "Ver más vacantes" })).not.toBeInTheDocument();
  });
});
