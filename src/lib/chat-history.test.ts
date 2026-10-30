import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { UIMessage } from "ai";

import { getChatHistory, saveChatHistory } from "./chat-history";

const { selectMock, insertMock, valuesMock, onConflictDoUpdateMock, limitMock, fromMock } =
  vi.hoisted(() => {
    const limitMock = vi.fn();
    const fromMock = vi.fn();
    const valuesMock = vi.fn();
    const onConflictDoUpdateMock = vi.fn();
    return {
      selectMock: vi.fn(),
      insertMock: vi.fn(),
      valuesMock,
      onConflictDoUpdateMock,
      limitMock,
      fromMock,
    };
  });

vi.mock("@/db", () => ({
  db: { select: selectMock, insert: insertMock },
}));

const userId = "user-1";

const message = (id: string): UIMessage => ({
  id,
  role: id.startsWith("u") ? "user" : "assistant",
  parts: [{ type: "text", text: id }],
});

const storedMessages = [message("u-1"), message("a-1")];

const mockSelectResult = (rows: unknown[]) => {
  limitMock.mockResolvedValue(rows);
  fromMock.mockReturnValue({ where: vi.fn().mockReturnValue({ limit: limitMock }) });
  selectMock.mockReturnValue({ from: fromMock });
};

beforeEach(() => {
  selectMock.mockReset();
  insertMock.mockReset();
  valuesMock.mockReset();
  onConflictDoUpdateMock.mockReset();
  fromMock.mockReset();
  limitMock.mockReset();

  onConflictDoUpdateMock.mockResolvedValue(undefined);
  valuesMock.mockReturnValue({ onConflictDoUpdate: onConflictDoUpdateMock });
  insertMock.mockReturnValue({ values: valuesMock });
});

describe("getChatHistory", () => {
  it("returns the stored messages for the user", async () => {
    mockSelectResult([{ messages: storedMessages }]);

    await expect(getChatHistory(userId)).resolves.toEqual(storedMessages);
  });

  it("returns an empty list when the user has no history", async () => {
    mockSelectResult([]);

    await expect(getChatHistory(userId)).resolves.toEqual([]);
  });
});

describe("saveChatHistory", () => {
  it("inserts the messages for a user without history", async () => {
    await saveChatHistory(userId, storedMessages);

    expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({ userId }));
    expect(valuesMock.mock.calls[0][0].messages).toEqual(storedMessages);
  });

  it("keeps only the newest 20 messages", async () => {
    const many = Array.from({ length: 25 }, (_, index) => message(`u-${index}`));

    await saveChatHistory(userId, many);

    const saved = valuesMock.mock.calls[0][0].messages;
    expect(saved).toHaveLength(20);
    expect(saved[0]).toEqual(many[5]);
    expect(saved[19]).toEqual(many[24]);
  });

  it("updates the existing row on conflict, with the same trimmed messages", async () => {
    const many = Array.from({ length: 22 }, (_, index) => message(`u-${index}`));

    await saveChatHistory(userId, many);

    expect(onConflictDoUpdateMock).toHaveBeenCalledTimes(1);
    const config = onConflictDoUpdateMock.mock.calls[0][0];
    expect(config.set.messages).toHaveLength(20);
    expect(config.set.messages[19]).toEqual(many[21]);
  });
});
