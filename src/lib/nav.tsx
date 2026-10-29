export const NAV_ITEMS = [
  {
    label: "About",
    href: "/about",
    icon: "ℹ️",
  },
  {
    label: "Chat",
    href: "/chat",
    icon: "💬",
  },
  {
    label: "Image Generation",
    href: "/image",
    icon: "🖼️",
  },
  {
    label: "AI Examples",
    href: "/examples",
    icon: "🤖",
  },
  {
    label: "Cards",
    href: "/cards",
    icon: "🃏",
  },
];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href;
}
