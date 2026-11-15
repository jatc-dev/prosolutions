import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RefreshRateLimitedError,
  refreshAccessToken,
  resetRefreshCoordinatorForTests,
} from "../src/services/authRefresh";

describe("refreshAccessToken", () => {
  beforeEach(() => {
    resetRefreshCoordinatorForTests();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("shares one refresh request between concurrent callers", async () => {
    let resolveResponse: ((_response: Response) => void) | undefined;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveResponse = resolve;
        }),
    );

    const first = refreshAccessToken();
    const second = refreshAccessToken();
    resolveResponse?.(new Response(JSON.stringify({ accessToken: "access-token" }), { status: 200 }));

    await expect(Promise.all([first, second])).resolves.toEqual(["access-token", "access-token"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("honors a 429 cooldown and recovers after it expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ retryAfterSeconds: 2 }), {
          status: 429,
          headers: { "Retry-After": "2" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: "recovered-token" }), { status: 200 }),
      );

    const first = refreshAccessToken();
    await expect(first).rejects.toBeInstanceOf(RefreshRateLimitedError);
    await expect(refreshAccessToken()).rejects.toMatchObject({ status: 429, retryAfterMs: 2000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);
    await expect(refreshAccessToken()).resolves.toBe("recovered-token");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a definitive 401 or loop after a network error", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Invalid refresh token" }), { status: 401 }))
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: "next-token" }), { status: 200 }));

    await expect(refreshAccessToken()).rejects.toThrow("Session refresh failed");
    await expect(refreshAccessToken()).rejects.toThrow("network unavailable");
    await expect(refreshAccessToken()).resolves.toBe("next-token");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
