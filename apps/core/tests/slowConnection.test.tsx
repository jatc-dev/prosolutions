import React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SlowConnectionNotice } from "../src/components/SlowConnectionNotice";
import { GoogleSignInButton } from "../src/components/GoogleSignInButton";

describe("SlowConnectionNotice", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("stays hidden for quick requests and explains the wait after 4 seconds", () => {
    const { rerender } = render(<SlowConnectionNotice active english={false} />);
    act(() => vi.advanceTimersByTime(3900));
    expect(screen.queryByRole("status")).toBeNull();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole("status")).toHaveTextContent("puede tardar hasta un minuto");

    rerender(<SlowConnectionNotice active={false} english={false} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("GoogleSignInButton while ProIdentity wakes up", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is visible but disabled until ProIdentity answers, then links to Google", async () => {
    let answer: (value: Response) => void = () => undefined;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { answer = resolve; })));
    render(<GoogleSignInButton next="https://prosolutions.page/dashboard" privacyAccepted />);

    const pending = screen.getByText("Continuar con Google").closest("a")!;
    expect(pending).toHaveAttribute("aria-disabled", "true");
    expect(pending).not.toHaveAttribute("href");

    await act(async () => answer(new Response(JSON.stringify({ google: true }), { status: 200 })));
    const ready = screen.getByText("Continuar con Google").closest("a")!;
    expect(ready).toHaveAttribute("aria-disabled", "false");
    expect(ready.getAttribute("href")).toContain("/google/start?next=");
  });

  it("disappears when Google sign-in is not configured", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ google: false }), { status: 200 })));
    render(<GoogleSignInButton next="https://prosolutions.page/dashboard" privacyAccepted />);
    await act(async () => undefined);
    expect(screen.queryByText("Continuar con Google")).toBeNull();
  });
});
