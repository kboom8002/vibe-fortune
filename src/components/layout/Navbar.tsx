"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { href: "/app/daily", label: "일일 분석" },
    { href: "/app/weekly", label: "주간 분석" },
    { href: "/app/monthly", label: "월간 분석" },
    { href: "/app/history", label: "분석 기록" },
    { href: "/app/settings", label: "설정" },
  ];

  return (
    <header className="border-b border-zinc-800/50 backdrop-blur-md bg-zinc-950/80 sticky top-0 z-50 w-full">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent group-hover:opacity-85 transition-opacity">
            TCO-Vibe
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
            v2
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="메인 네비게이션">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "text-sm font-medium transition-colors py-1.5 px-3 rounded-lg",
                  isActive
                    ? "text-indigo-400 bg-indigo-950/30 border border-indigo-900/30"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/40"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/40 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <nav
          className="md:hidden border-t border-zinc-800/50 bg-zinc-950/95 backdrop-blur-md px-6 py-4 space-y-1 animate-in slide-in-from-top-2 duration-200"
          aria-label="모바일 네비게이션"
        >
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block text-sm font-medium transition-colors py-2.5 px-4 rounded-lg",
                  isActive
                    ? "text-indigo-400 bg-indigo-950/30 border border-indigo-900/30"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/40"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
