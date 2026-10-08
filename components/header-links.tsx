"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/generate", label: "Generate" },
  { href: "/battle", label: "Arena" },
  { href: "/results", label: "Results" },
];

export default function HeaderLinks() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary navigation"
      className="flex min-w-0 flex-1 items-center justify-center gap-0.5 sm:justify-start sm:gap-1"
    >
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={`inline-flex min-h-11 items-center justify-center rounded-lg px-1 text-xs font-medium transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-3 sm:text-sm ${
            pathname === href
              ? "bg-white/10 text-white"
              : "text-gray-400"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
