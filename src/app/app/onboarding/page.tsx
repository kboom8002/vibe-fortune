"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, UserPlus, Heart, Sparkles } from "lucide-react";

export default function OnboardingHubPage() {
  const [session, setSession] = useState<{ name?: string } | null>(null);

  useEffect(() => {
    const sess = localStorage.getItem("user-session");
    if (sess) {
      setSession(JSON.parse(sess));
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      <Navbar />

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-16 flex flex-col justify-center relative z-10 space-y-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/40 border border-indigo-900/30 text-indigo-300 text-xs font-medium w-fit">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            온보딩 진행 중
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            반갑습니다,{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {session?.name || "사용자"}
            </span>
            님!
            <br />
            당신의 우주적 흐름을 구성할 시간입니다.
          </h1>
          <p className="text-zinc-400 leading-relaxed max-w-xl text-sm sm:text-base">
            TCO-Vibe는 단순한 미신이나 예언이 아닙니다. 당신의 고유한 생년월일시 정보(사주 Prior)와 현재의 바이오리듬(Vibe Check-in)을 지능적으로 결합하여 행동 최적화 지침을 수립합니다.
          </p>
        </div>

        {/* Steps List */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 hover:border-indigo-500/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 group">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-xs font-mono">
                  1
                </span>
                <h3 className="font-semibold text-lg">생년월일시 프로필 설정</h3>
              </div>
              <p className="text-sm text-zinc-400 pl-9 max-w-md leading-relaxed">
                명리학적 계산 정책(Lichun, 절기법)을 기반으로 고유 사주 팔자, 십성, 대운 주기를 deterministic하게 분석합니다.
              </p>
            </div>
            <Link
              href="/app/onboarding/birth"
              className={cn(
                buttonVariants({}),
                "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0 shadow-lg shadow-indigo-500/10 transition-transform group-hover:translate-x-1 flex items-center justify-center gap-2"
              )}
            >
              시작하기 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/10 border border-zinc-900/30 opacity-60 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500 flex items-center justify-center text-xs font-mono">
                  2
                </span>
                <h3 className="font-semibold text-lg text-zinc-300">오늘의 바이브 체크인</h3>
              </div>
              <p className="text-sm text-zinc-500 pl-9 max-w-md leading-relaxed">
                오늘 느끼는 감정 상태(valence, arousal, energy 등)를 기록합니다. 프로필 설정 완료 후 활성화됩니다.
              </p>
            </div>
            <Button disabled variant="outline" className="border-zinc-800 text-zinc-500">
              대기 중
            </Button>
          </div>
        </div>

        {/* Safety Boundary Banner */}
        <div className="p-6 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 flex items-start gap-4">
          <Heart className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-indigo-200">개인정보 보호 및 안전선 원칙</h4>
            <p className="text-xs text-indigo-300/80 leading-relaxed">
              입력하시는 사주 정보와 바이브 데이터는 오직 당신만의 행동 지침 처방용으로 임시 연산되며 타인에게 공유되지 않습니다. 극단적이거나 위협적인 예언을 배제하여 설계되었습니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
