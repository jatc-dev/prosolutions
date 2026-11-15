import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthenticatedCVLoader } from "../src/modules/procv/components/editor/useAuthenticatedCVLoader";

describe("useAuthenticatedCVLoader", () => {
  it("does not load while authentication is pending", () => {
    const loadCV = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useAuthenticatedCVLoader({
        cvId: "cv-1",
        authLoading: true,
        isAuthenticated: false,
        loadCV,
      }),
    );

    expect(loadCV).not.toHaveBeenCalled();
  });

  it("loads once after authentication completes", () => {
    const loadCV = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ authLoading, isAuthenticated }) =>
        useAuthenticatedCVLoader({
          cvId: "cv-1",
          authLoading,
          isAuthenticated,
          loadCV,
        }),
      { initialProps: { authLoading: true, isAuthenticated: false } },
    );

    rerender({ authLoading: false, isAuthenticated: true });
    rerender({ authLoading: false, isAuthenticated: true });

    expect(loadCV).toHaveBeenCalledTimes(1);
    expect(loadCV).toHaveBeenCalledWith("cv-1");
  });

  it("does not load when authentication resolves as unauthenticated", () => {
    const loadCV = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ authLoading, isAuthenticated }) =>
        useAuthenticatedCVLoader({
          cvId: "cv-1",
          authLoading,
          isAuthenticated,
          loadCV,
        }),
      { initialProps: { authLoading: true, isAuthenticated: false } },
    );

    rerender({ authLoading: false, isAuthenticated: false });

    expect(loadCV).not.toHaveBeenCalled();
  });

  it("allows a different CV id to load once", () => {
    const loadCV = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ cvId }) =>
        useAuthenticatedCVLoader({
          cvId,
          authLoading: false,
          isAuthenticated: true,
          loadCV,
        }),
      { initialProps: { cvId: "cv-1" } },
    );

    act(() => rerender({ cvId: "cv-2" }));

    expect(loadCV.mock.calls.map(([id]) => id)).toEqual(["cv-1", "cv-2"]);
  });
});
