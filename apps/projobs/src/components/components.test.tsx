import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { JobSummary } from "../../server/src/contracts";
import { JobCard } from "./JobCard";
import { StageTracker } from "./StageTracker";

const job: JobSummary = {
  id: "6f1c1b0e-0000-4000-8000-000000000001",
  slug: "frontend-react",
  title: "Frontend Developer",
  summary: "React y TypeScript",
  company: { id: "c1", slug: "acme", name: "Acme Labs", logoUrl: null, industry: "Software" },
  employmentType: "full_time",
  workplace: "remote",
  seniority: "senior",
  location: { city: null, country: "CO" },
  salary: { min: 3000, max: 4000, currency: "USD", period: "month" },
  skills: ["react", "typescript"],
  publishedAt: new Date().toISOString(),
  match: { score: 80, matchedSkills: ["react"], missingSkills: ["typescript"] },
  viewer: { saved: false, applied: true },
};

describe("JobCard", () => {
  it("shows key facts, match and applied state", () => {
    render(<JobCard job={job} href="/empleos/frontend-react" />);
    expect(screen.getByRole("link", { name: "Frontend Developer" })).toHaveAttribute("href", "/empleos/frontend-react");
    expect(screen.getByText("Acme Labs")).toBeInTheDocument();
    expect(screen.getByText("Remoto")).toBeInTheDocument();
    expect(screen.getByText("80% afinidad")).toBeInTheDocument();
    expect(screen.getByText(/Postulado/)).toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("selects in place (split view) and toggles save without navigating", () => {
    const onSelect = vi.fn();
    const onToggleSave = vi.fn();
    render(<JobCard job={job} href="/empleos/frontend-react" onSelect={onSelect} onToggleSave={onToggleSave} />);
    fireEvent.click(screen.getByRole("link", { name: "Frontend Developer" }));
    expect(onSelect).toHaveBeenCalledWith(job);
    fireEvent.click(screen.getByRole("button", { name: "Guardar Frontend Developer" }));
    expect(onToggleSave).toHaveBeenCalledWith(job);
  });
});

describe("StageTracker", () => {
  it("marks completed pipeline steps for the current stage", () => {
    render(
      <MemoryRouter>
        <StageTracker stage="interview" />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("Etapa actual: Entrevista")).toBeInTheDocument();
    expect(screen.getByText("Contratado")).toHaveClass("text-ui-muted");
    expect(screen.getByText("Entrevista")).toHaveClass("font-semibold");
  });
});
