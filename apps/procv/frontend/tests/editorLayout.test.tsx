import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorLayout } from "../src/modules/procv/components/editor/useEditorLayout";

type Listener = () => void;
let wide = true;
let listeners: Listener[] = [];

function installMatchMedia() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() { return query.includes("1024") ? wide : false; },
    media: query,
    addEventListener: (_: string, listener: Listener) => listeners.push(listener),
    removeEventListener: (_: string, listener: Listener) => { listeners = listeners.filter((item) => item !== listener); },
  }));
}

function resize(toWide: boolean) {
  wide = toWide;
  act(() => listeners.forEach((listener) => listener()));
}

function Probe() {
  const layout = useEditorLayout();
  return (
    <div>
      <span data-testid="state">{`${layout.isSplit ? "split" : "single"}|form:${layout.formVisible}|preview:${layout.previewVisible}`}</span>
      <button onClick={layout.togglePreview}>toggle</button>
    </div>
  );
}

const state = () => screen.getByTestId("state").textContent;

describe("CV editor layout", () => {
  beforeEach(() => {
    listeners = [];
    localStorage.clear();
    installMatchMedia();
    vi.stubGlobal("scrollTo", vi.fn());
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 0; });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows form and preview side by side on wide screens and remembers hiding the preview", () => {
    wide = true;
    const { unmount } = render(<Probe />);
    expect(state()).toBe("split|form:true|preview:true");
    fireEvent.click(screen.getByText("toggle"));
    expect(state()).toBe("split|form:true|preview:false");
    unmount();
    render(<Probe />);
    expect(state()).toBe("split|form:true|preview:false");
  });

  it("starts on the form on narrow screens and switches views one at a time", () => {
    wide = false;
    render(<Probe />);
    expect(state()).toBe("single|form:true|preview:false");
    fireEvent.click(screen.getByText("toggle"));
    expect(state()).toBe("single|form:false|preview:true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(state()).toBe("single|form:true|preview:false");
  });

  it("never leaves the form hidden when the window shrinks", () => {
    wide = true;
    render(<Probe />);
    expect(state()).toBe("split|form:true|preview:true");
    resize(false);
    expect(state()).toBe("single|form:true|preview:false");
    fireEvent.click(screen.getByText("toggle"));
    resize(true);
    expect(state()).toBe("split|form:true|preview:true");
  });
});
