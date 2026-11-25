import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { identityRequestMock } = vi.hoisted(() => ({ identityRequestMock: vi.fn() }));
vi.mock("../src/preferencesApi", () => ({ identityRequest: identityRequestMock, saveUserPreferences: vi.fn() }));

import { MfaStep, takeMfaChallengeFromHash } from "../src/components/MfaStep";
import { formatSecret, MfaSettings, qrPath } from "../src/components/MfaSettings";

const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });

describe("MfaStep", () => {
  const fetchMock = vi.fn();
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
  afterEach(() => vi.unstubAllGlobals());

  it("sends the challenge with a 6-digit code and hands back the session", async () => {
    fetchMock.mockResolvedValue(json({ accessToken: "token" }));
    const onSignedIn = vi.fn();
    render(<MfaStep apiUrl="https://id.test/api/auth" challenge="c1" english={false} onSignedIn={onSignedIn} onRestart={vi.fn()} />);

    const submit = screen.getByRole("button", { name: "Verificar e ingresar" });
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "12a3 456" } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith({ accessToken: "token" }));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://id.test/api/auth/mfa/verify");
    expect(JSON.parse(init.body)).toEqual({ challenge: "c1", code: "123456" });
  });

  it("accepts a recovery code and explains invalid codes", async () => {
    fetchMock.mockResolvedValue(json({ code: "mfa_invalid_code" }, 401));
    render(<MfaStep apiUrl="/api/auth" challenge="c1" english={false} onSignedIn={vi.fn()} onRestart={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Usar un código de respaldo" }));
    fireEvent.change(screen.getByLabelText("Código de respaldo"), { target: { value: "ABCDE-FGHIJ" } });
    fireEvent.click(screen.getByRole("button", { name: "Verificar e ingresar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El código no es válido");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).code).toBe("ABCDE-FGHIJ");
  });

  it("takes the Google challenge from the URL fragment and removes it", () => {
    window.history.replaceState(null, "", "/login#mfa=abc.def");
    expect(takeMfaChallengeFromHash()).toBe("abc.def");
    expect(window.location.hash).toBe("");
    expect(takeMfaChallengeFromHash()).toBeNull();
  });
});

describe("MfaSettings", () => {
  beforeEach(() => identityRequestMock.mockReset());

  it("sets up with the app code and shows recovery codes once", async () => {
    identityRequestMock.mockImplementation(async (path: string, init: RequestInit = {}) => {
      if (path === "/api/auth/mfa") return json({ enabled: false, enabledAt: null, recoveryCodesLeft: 0, available: true });
      if (path === "/api/auth/mfa/setup") return json({ secret: "JBSWY3DPEHPK3PXP", otpauthUrl: "otpauth://totp/x" });
      if (path === "/api/auth/mfa/enable") {
        expect(JSON.parse(String(init.body))).toEqual({ code: "654321" });
        return json({ enabled: true, recoveryCodes: ["AAAAA-BBBBB", "CCCCC-DDDDD"] });
      }
      return json({}, 404);
    });
    render(<MfaSettings english={false} />);

    fireEvent.click(await screen.findByRole("button", { name: "Activar verificación en dos pasos" }));
    expect(await screen.findByText("JBSW Y3DP EHPK 3PXP")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Código QR para la app de autenticación" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Código de 6 dígitos"), { target: { value: "654321" } });
    fireEvent.click(screen.getByRole("button", { name: "Activar" }));
    expect(await screen.findByText("AAAAA-BBBBB")).toBeInTheDocument();
    expect(screen.getByText(/No los volveremos a mostrar/)).toBeInTheDocument();
  });

  it("encodes the otpauth URL as a valid QR matrix", () => {
    const url = "otpauth://totp/ProSolutions%3Aana%40example.test?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=ProSolutions&algorithm=SHA1&digits=6&period=30";
    const { size, d } = qrPath(url);
    expect(size).toBeGreaterThanOrEqual(21);
    expect((size - 17) % 4).toBe(0);
    // The three finder patterns: the top-left corner module is always dark.
    expect(d.startsWith("M0 0h1v1h-1z")).toBe(true);
    expect(qrPath(url).d).toBe(d);
  });

  it("formats secrets in groups of four", () => {
    expect(formatSecret("ABCDEFGHIJ")).toBe("ABCD EFGH IJ");
  });
});
