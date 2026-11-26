import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GuestBanner, GUEST_BANNER_DISMISSED_KEY } from "../src/modules/procv/components/editor/components/GuestBanner";

describe("Guest banner", () => {
  afterEach(() => window.sessionStorage.clear());

  it("is one line with the cloud link and can be closed for the session", () => {
    const { unmount } = render(<GuestBanner onClearData={() => undefined} />);
    const banner = screen.getByTestId("guest-banner");
    expect(banner.textContent).toContain("Modo invitado");
    expect(screen.getByRole("link").getAttribute("href")).toBe("/auth");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso de modo invitado" }));
    expect(screen.queryByTestId("guest-banner")).toBeNull();
    expect(window.sessionStorage.getItem(GUEST_BANNER_DISMISSED_KEY)).toBe("1");
    unmount();

    render(<GuestBanner onClearData={() => undefined} />);
    expect(screen.queryByTestId("guest-banner")).toBeNull();
  });
});
