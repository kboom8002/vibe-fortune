import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col justify-between selection:bg-indigo-500 selection:text-white font-sans overflow-x-hidden relative">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none" />

      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 relative z-10">
        <div className="max-w-3xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/50 border border-indigo-800/40 text-indigo-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            초개인화 사주 x 바이브 라이프 코칭 시스템
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight sm:leading-none">
            당신의 우주적 흐름과
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              현재의 바이브를 융합하다
            </span>
          </h1>

          <p className="text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
            전통 명리학의 정교한 절기 계산법과 당신이 느끼는 실시간 감정 상태(Vibe Check-in)를 분석하여 오늘 최적의 의사결정과 행동 지침(Action Policy)을 처방합니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/app/daily"
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium shadow-lg shadow-indigo-500/20 border-0 transition-transform active:scale-[0.98] flex items-center justify-center"
              )}
            >
              분석 시작하기
            </Link>
            <Link
              href="/docs"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full sm:w-auto border-zinc-800 hover:bg-zinc-900/50 hover:text-white transition-colors flex items-center justify-center"
              )}
            >
              시스템 원리 보기
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mt-24">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-sm hover:border-indigo-500/30 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:bg-indigo-500 group-hover:text-zinc-950 transition-colors">
              ☯
            </div>
            <h3 className="text-lg font-semibold mb-2">결정론적 만세력 엔진</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              정확한 24절기 입춘 경계 계산을 바탕으로 사주 팔자, 대운, 세운을 오차 없이 계산합니다.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-sm hover:border-purple-500/30 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:bg-purple-500 group-hover:text-zinc-950 transition-colors">
              ⚡
            </div>
            <h3 className="text-lg font-semibold mb-2">실시간 바이브 융합</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              오늘의 기분, 활력도, 포커스, 소셜 로드를 측정해 정적 사주 풀이를 넘어서는 유동적 처방을 도출합니다.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-sm hover:border-pink-500/30 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4 group-hover:bg-pink-500 group-hover:text-zinc-950 transition-colors">
              🛡️
            </div>
            <h3 className="text-lg font-semibold mb-2">다중 안전 가드 레일</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              절망감을 주거나 위협적인 예측을 원천 배제하며, 모든 가이드는 정신적·신체적 웰빙을 위한 안전선 내에서 제공됩니다.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900/60 py-8 px-6 text-center text-xs text-zinc-500">
        <p>© 2026 TCO-Vibe Fortune Coach v2. All rights reserved.</p>
        <p className="mt-2 text-zinc-600">모든 사주 풀이 및 행동 지침은 참고 사항이며, 최종 판단과 행동의 책임은 사용자 자신에게 있습니다.</p>
      </footer>
    </div>
  );
}
