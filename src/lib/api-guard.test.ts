import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

import { requireSession } from "./api-guard";

beforeEach(() => {
  getSessionMock.mockReset();
});

describe("requireSession", () => {
  it("returns the session and reads it from the request headers", async () => {
    const request = new Request("http://localhost/api/chat", {
      headers: { cookie: "session=abc" },
    });
    const session = { user: { id: "user-1" } };
    getSessionMock.mockResolvedValue(session);

    await expect(requireSession(request)).resolves.toBe(session);
    expect(getSessionMock).toHaveBeenCalledWith({ headers: request.headers });
  });

  it("returns a 401 response when there is no session", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await requireSession(new Request("http://localhost/api/chat"));

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
    await expect((result as Response).json()).resolves.toEqual({ error: "Unauthorized" });
  });
});
