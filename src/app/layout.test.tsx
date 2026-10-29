import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";

import RootLayout from "./layout";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

vi.mock("./_components/navigation", () => ({
  default: () => <nav aria-label="Primary" />,
}));

// The layout renders <html> and <body>, which are not valid inside the <div>
// Testing Library mounts into, so it is rendered to markup and parsed instead.
function renderLayout(children: ReactNode) {
  const markup = renderToStaticMarkup(
    <RootLayout params={Promise.resolve({})}>{children}</RootLayout>,
  );
  return new DOMParser().parseFromString(markup, "text/html");
}

describe("Root layout", () => {
  it("declares the document language", () => {
    const document = renderLayout(<p>Page content</p>);

    expect(document.documentElement.getAttribute("lang")).toBe("en");
  });

  it("applies the configured font variables", () => {
    const document = renderLayout(<p>Page content</p>);

    expect(document.documentElement.className).toContain("--font-geist-sans");
    expect(document.documentElement.className).toContain("--font-geist-mono");
  });

  it("renders the navigation in the header", () => {
    const document = renderLayout(<p>Page content</p>);

    expect(document.querySelector("header nav")?.getAttribute("aria-label")).toBe("Primary");
  });

  it("renders the page content in the main landmark", () => {
    const document = renderLayout(<p>Page content</p>);

    expect(document.querySelector("main")?.textContent).toContain("Page content");
  });
});
