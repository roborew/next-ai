import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { limitMock, slidingWindowArgs, constructorConfigs, redisMock } = vi.hoisted(() => {
  const limitMock = vi.fn();
  const slidingWindowArgs: unknown[][] = [];
  const constructorConfigs: Array<Record<string, unknown>> = [];
  const redisMock = { marker: "redis" };

  return { limitMock, slidingWindowArgs, constructorConfigs, redisMock };
});

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(
    // Must be a regular function to be usable with `new`.
    vi.fn(function (config: Record<string, unknown>) {
      constructorConfigs.push(config);
      return { limit: limitMock };
    }),
    {
      slidingWindow: vi.fn((...args: unknown[]) => {
        slidingWindowArgs.push(args);
        return "sliding-window-limiter";
      }),
    },
  ),
}));

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: vi.fn(() => redisMock) },
}));

import { enforceRateLimit } from "./rate-limit";

beforeEach(() => {
  limitMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("enforceRateLimit", () => {
  it("allows a request under the limit", async () => {
    limitMock.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });

    await expect(enforceRateLimit("chat", "user-1")).resolves.toBeNull();
    expect(limitMock).toHaveBeenCalledWith("user-1");
  });

  it("returns 429 with Retry-After when the limit is exceeded", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
    limitMock.mockResolvedValue({ success: false, reset: Date.now() + 30_000 });

    const result = await enforceRateLimit("chat", "user-1");

    expect(result?.status).toBe(429);
    expect(result?.headers.get("Retry-After")).toBe("30");
    await expect(result?.json()).resolves.toEqual({
      error: "Too many requests. Please try again shortly.",
    });
  });

  it("never returns a Retry-After below one second", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
    limitMock.mockResolvedValue({ success: false, reset: Date.now() });

    const result = await enforceRateLimit("chat", "user-1");

    expect(result?.headers.get("Retry-After")).toBe("1");
  });

  it("configures the chat and cards buckets with the shared Redis client", () => {
    expect(slidingWindowArgs).toEqual([
      [10, "1 m"],
      [5, "1 m"],
    ]);
    expect(constructorConfigs.map((config) => config.prefix)).toEqual([
      "ratelimit:chat",
      "ratelimit:cards",
    ]);
    expect(constructorConfigs[0].redis).toBe(redisMock);
    expect(constructorConfigs[1].redis).toBe(redisMock);
  });
});
