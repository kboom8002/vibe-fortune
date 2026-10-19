"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  LayoutDashboard,
  Sparkles,
  Calendar,
  ShieldAlert,
  History,
  Settings,
  UserCheck,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user-birth-profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name) setProfileName(parsed.name);
      }
    } catch {
      // ignore
    }
  }, [pathname]);

  const links = [
    { href: "/app", label: "운영 홈", exact: true },
    { href: "/app/daily", label: "일일 분석" },
    { href: "/app/weekly", label: "주간 분석" },
    { href: "/app/monthly", label: "월간 분석" },
    { href: "/app/risk", label: "리스크" },
    { href: "/app/lifetime", label: "인생 총운" },
    { href: "/app/history", label: "분석 기록" },
    { href: "/app/vibe-history", label: "Vibe 기록" },
    { href: "/app/settings", label: "설정" },
  ];

  const bottomDockLinks = [
    { href: "/app", label: "홈", icon: LayoutDashboard, exact: true },
    { href: "/app/daily", label: "일일 보드", icon: Sparkles },
    { href: "/app/weekly", label: "주간/월간", icon: Calendar },
    { href: "/app/risk", label: "리스크", icon: ShieldAlert },
    { href: "/app/history", label: "기록", icon: History },
  ];

  const checkActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      <header className="border-b border-zinc-800/60 backdrop-blur-xl bg-zinc-950/85 sticky top-0 z-50 w-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent group-hover:opacity-85 transition-opacity">
                TCO-Vibe
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 font-mono">
                v2
              </span>
            </Link>

            {profileName && (
              <Link
                href="/app/onboarding/birth"
                title="출생 프로필 수정"
                className="hidden lg:inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:border-indigo-500/40 hover:text-indigo-300 transition-colors"
              >
                <UserCheck className="w-3 h-3 text-emerald-400" />
                <span>{profileName}님</span>
              </Link>
            )}
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="메인 네비게이션">
            {links.map((link) => {
              const isActive = checkActive(link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "text-xs lg:text-sm font-medium transition-all py-1.5 px-2.5 lg:px-3 rounded-lg whitespace-nowrap",
                    isActive
                      ? "text-indigo-300 bg-indigo-950/50 border border-indigo-800/50 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50"
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
              const isActive = checkActive(link.href, link.exact);
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

      {/* Mobile Bottom Dock Navigation (Ergonomic 1-Thumb Access) */}
      <nav
        aria-label="모바일 하단 빠른 네비게이션"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl px-2 py-1.5 flex items-center justify-around"
      >
        {bottomDockLinks.map((item) => {
          const Icon = item.icon;
          const isActive =
            checkActive(item.href, item.exact) ||
            (item.href === "/app/weekly" && pathname.startsWith("/app/monthly")) ||
            (item.href === "/app/daily" && pathname.startsWith("/app/result"));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-medium transition-colors",
                isActive
                  ? "text-indigo-400 bg-indigo-950/40"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/app/settings"
          aria-current={pathname.startsWith("/app/settings") ? "page" : undefined}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-medium transition-colors",
            pathname.startsWith("/app/settings")
              ? "text-indigo-400 bg-indigo-950/40"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Settings className="w-4 h-4" />
          <span>설정</span>
        </Link>
      </nav>
    </>
  );
}
