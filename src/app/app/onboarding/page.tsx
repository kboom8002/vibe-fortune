"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { calculateChart } from "@/lib/manse";
import { ArrowRight, Heart, Sparkles, CheckCircle2, Play, Info } from "lucide-react";

export default function OnboardingHubPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ name?: string } | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [profileSummary, setProfileSummary] = useState<string>("");

  useEffect(() => {
    try {
      const sess = localStorage.getItem("user-session");
      if (sess) {
        setSession(JSON.parse(sess));
      }
      const storedProfile = localStorage.getItem("user-birth-profile");
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        setHasProfile(true);
        setProfileSummary(`${parsed.name || "사용자"} (${(parsed.birthDateTime || parsed.birthDate || "").slice(0, 10)})`);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleQuickDemoStart = () => {
    try {
      const sampleBirthDateTime = "1990-05-01T14:30:00+09:00";
      const sampleProfile = {
        id: "sample-profile-id",
        userId: "local-user",
        name: session?.name || "샘플 체험자",
        birthDate: "1990-05-01",
        birthTime: "14:30",
        birthDateTime: sampleBirthDateTime,
        timezone: "Asia/Seoul",
        gender: "male" as const,
        createdAt: new Date().toISOString(),
      };
      const chart = calculateChart({
        birthDateTime: sampleBirthDateTime,
        timezone: "Asia/Seoul",
        gender: "male",
      });
      localStorage.setItem("user-birth-profile", JSON.stringify(sampleProfile));
      localStorage.setItem("user-manse-chart", JSON.stringify(chart));
    } catch {
      // ignore
    }
    router.push("/app/daily");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-hidden pb-20 md:pb-0">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      <Navbar />

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 sm:py-16 flex flex-col justify-center relative z-10 space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/40 border border-indigo-900/30 text-indigo-300 text-xs font-medium w-fit">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            초기 설정 허브 (Onboarding Hub)
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
            반갑습니다,{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {session?.name || "사용자"}
            </span>
            님!
            <br />
            1분 만에 나만의 운영 보드를 시작하세요.
          </h1>
          <p className="text-zinc-400 leading-relaxed max-w-xl text-sm sm:text-base">
            TCO-Vibe는 사주 구조(Prior)와 현재 컨디션(Vibe Check-in)을 결합해 오늘의 행동 정책을 설계합니다. 직접 생년월일을 입력하거나 샘플 프로필로 3초 만에 체험할 수 있습니다.
          </p>

          {!hasProfile && (
            <div className="pt-1">
              <Button
                type="button"
                onClick={handleQuickDemoStart}
                variant="outline"
                className="border-emerald-500/40 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/40 hover:text-emerald-200 gap-2 text-xs sm:text-sm"
              >
                <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                <span>샘플 프로필(1990.05.01 미시)로 3초 만에 시작하기</span>
              </Button>
            </div>
          )}
        </div>

        {/* Steps List */}
        <div className="space-y-4">
          <div
            className={cn(
              "p-6 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 group",
              hasProfile
                ? "bg-emerald-950/15 border-emerald-800/40"
                : "bg-zinc-900/40 border-zinc-800/70 hover:border-indigo-500/30"
            )}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {hasProfile ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 flex items-center justify-center text-xs font-mono">
                    1
                  </span>
                )}
                <h3 className="font-semibold text-lg">생년월일시 프로필 설정</h3>
                {hasProfile && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    등록 완료: {profileSummary}
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-400 pl-9 max-w-md leading-relaxed">
                한국 표준(`standard_kr`, 입춘·절기 경계) 만세력 엔진으로 고유 사주 팔자, 십성, 대운 주기를 오차 없이 계산합니다. 출생 시각을 몰라도 설정 가능합니다.
              </p>
            </div>
            <Link
              href="/app/onboarding/birth"
              className={cn(
                buttonVariants({ variant: hasProfile ? "outline" : "default" }),
                hasProfile
                  ? "border-zinc-700 text-zinc-300 hover:bg-zinc-900"
                  : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0 shadow-lg shadow-indigo-500/10",
                "transition-transform group-hover:translate-x-0.5 flex items-center justify-center gap-2 shrink-0"
              )}
            >
              <span>{hasProfile ? "프로필 수정" : "프로필 설정하기"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div
            className={cn(
              "p-6 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6",
              hasProfile
                ? "bg-indigo-950/25 border-indigo-500/40"
                : "bg-zinc-900/20 border-zinc-800/50 opacity-70"
            )}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "w-6 h-6 rounded-full border flex items-center justify-center text-xs font-mono",
                    hasProfile
                      ? "bg-indigo-500/20 border-indigo-400 text-indigo-300"
                      : "bg-zinc-800 border-zinc-700 text-zinc-500"
                  )}
                >
                  2
                </span>
                <h3 className="font-semibold text-lg text-zinc-100">오늘의 바이브 체크인 (1-Tap)</h3>
              </div>
              <p className="text-sm text-zinc-400 pl-9 max-w-md leading-relaxed">
                원탭 상태 프리셋 또는 슬라이더로 현재 컨디션을 입력하고 오늘의 맞춤형 행동 정책 보드를 즉시 생성합니다.
              </p>
            </div>
            {hasProfile ? (
              <Link
                href="/app/daily"
                className={cn(
                  buttonVariants({}),
                  "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 shrink-0"
                )}
              >
                <span>체크인 시작하기</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Button disabled variant="outline" className="border-zinc-800 text-zinc-500 shrink-0">
                1단계 후 활성화
              </Button>
            )}
          </div>
        </div>

        {/* Calculation Policy & Safety Notice */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/70 flex items-start gap-3.5">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-zinc-200">만세력 계산 정책 안내</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                기본 계산 정책은 한국 표준(`standard_kr`) 절기법을 따르며, 유파(야자시·진태양시 보정 여부)에 따라 일부 기둥이 다를 경우 사용자가 직접 보유 명식을 함께 입력해 비교·보존할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 flex items-start gap-3.5">
            <Heart className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-indigo-200">개인정보 보호 및 안전선 원칙</h4>
              <p className="text-xs text-indigo-300/80 leading-relaxed">
                입력하신 출생 정보와 바이브 데이터는 본인 소유의 코칭 연산에만 사용되며, 확정적 예언이나 공포 유발 문구는 Safety Gate에서 원천 차단됩니다.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
