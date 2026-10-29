import { describe, expect, it } from "vite-plus/test";

import { isActivePath, NAV_ITEMS } from "./nav";

describe("NAV_ITEMS", () => {
  it("links every top-level page", () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      "/about",
      "/chat",
      "/image",
      "/examples",
      "/cards",
    ]);
  });

  it("gives every item a label and an icon", () => {
    for (const item of NAV_ITEMS) {
      expect(item.label).not.toBe("");
      expect(item.icon).not.toBe("");
    }
  });

  it("uses a unique href per item", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);

    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("isActivePath", () => {
  it("is true for the exact path", () => {
    expect(isActivePath("/cards", "/cards")).toBe(true);
  });

  it("is false for a different path", () => {
    expect(isActivePath("/chat", "/cards")).toBe(false);
  });

  it("only treats an exact match as active, not a nested route", () => {
    expect(isActivePath("/cards/set-1", "/cards")).toBe(false);
  });
});
