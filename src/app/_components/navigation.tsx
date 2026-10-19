"use client";

import { isActivePath, NAV_ITEMS } from "@/src/lib/nav";
import Link from "next/link";
import { usePathname } from "next/navigation";

const linkClass =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[11px] font-semibold text-slate-300 transition hover:bg-navy-800 hover:text-white lg:mt-1 lg:w-full lg:text-[13px]";

export default function Navigation() {
  const pathname = usePathname();
  return (
    <nav className="flex space-x-4">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${linkClass} ${active ? "bg-navy-800 text-white" : ""}`}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
