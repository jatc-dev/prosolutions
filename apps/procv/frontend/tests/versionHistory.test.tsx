import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
vi.mock("../src/shared/services/api", () => ({ api: { get: (...args: unknown[]) => get(...args) } }));

import { VersionHistoryDialog, relativeTime } from "../src/modules/procv/components/editor/components/VersionHistoryDialog";

const versions = [
  { id: "v2", createdAt: "2026-11-25T15:00:00Z" },
  { id: "v1", createdAt: "2026-11-24T10:00:00Z" },
];

function mockApi(list = versions) {
  get.mockImplementation(async (url: string) => {
    if (url.endsWith("/versions")) return { data: { versions: list } };
    const id = url.split("/").pop();
    return { data: { version: { id, data: { personal: { fullName: `Ana ${id}` } } } } };
  });
}

describe("version history", () => {
  afterEach(() => {
    get.mockReset();
    vi.restoreAllMocks();
  });

  it("lists the versions, previews the selected one and restores it after confirming", async () => {
    mockApi();
    const onRestore = vi.fn(async () => undefined);
    const onClose = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <VersionHistoryDialog
        cvId="cv-1"
        onClose={onClose}
        onRestore={onRestore}
        renderPreview={(data) => <p>{data.personal.fullName}</p>}
      />,
    );
    await act(async () => undefined);

    expect(screen.getByText(/cada 30 minutos/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /2026|nov/i })).toHaveLength(2);
    expect(screen.getByText("Ana v2")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: /2026|nov/i })[1]);
    await act(async () => undefined);
    expect(screen.getByText("Ana v1")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Restaurar esta versión" }));
    });
    expect(onRestore).toHaveBeenCalledWith("v1");
    expect(onClose).toHaveBeenCalled();
  });

  it("explains when there are no versions yet", async () => {
    mockApi([]);
    render(<VersionHistoryDialog cvId="cv-1" onClose={vi.fn()} onRestore={vi.fn()} renderPreview={() => null} />);
    await act(async () => undefined);
    expect(screen.getByText(/Aún no hay versiones anteriores/)).toBeTruthy();
  });

  it("describes dates relative to now", () => {
    const now = new Date("2026-11-25T12:00:00Z");
    expect(relativeTime(new Date("2026-11-25T11:55:00Z"), now)).toBe("hace 5 minutos");
    expect(relativeTime(new Date("2026-11-25T09:00:00Z"), now)).toBe("hace 3 horas");
    expect(relativeTime(new Date("2026-11-24T12:00:00Z"), now)).toBe("hace 1 día");
  });
});
