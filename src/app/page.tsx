"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { calculateChart } from "@/lib/manse";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
  Brain,
  BarChart3,
  Zap,
  Heart,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Play,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [showPrinciples, setShowPrinciples] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user-birth-profile");
      if (stored) setHasProfile(true);
    } catch {
      // ignore
    }
  }, []);

  const handleInstantSampleStart = () => {
    try {
      const sampleBirthDateTime = "1990-05-01T14:30:00+09:00";
      const sampleProfile = {
        id: "sample-profile-id",
        userId: "local-user",
        name: "샘플 체험자",
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
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col justify-between selection:bg-indigo-500 selection:text-white font-sans overflow-x-hidden relative pb-16 md:pb-0">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none" />

      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 sm:py-20 relative z-10">
        <div className="max-w-3xl text-center space-y-7">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            사주(Structural Prior) × 실시간 바이브(Vibe) 자기운영 AI 코치
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight">
            사주와 오늘의 Vibe를
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              행동 정책으로 바꾸는 운영 보드
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
            운세는 확정된 예언이 아닌 구조적 사전 확률(Prior)입니다. 정교한 24절기 만세력 연산과 오늘의 컨디션 체크인을 결합해 지금 실행할 행동과 보류할 결정을 명확히 처방합니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              href={hasProfile ? "/app/daily" : "/app/onboarding/birth"}
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-indigo-500/20 border-0 transition-transform active:scale-[0.98] flex items-center justify-center gap-2 px-6"
              )}
            >
              <span>오늘의 운영 보드 만들기</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {!hasProfile && (
              <button
                type="button"
                onClick={handleInstantSampleStart}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full sm:w-auto border-emerald-500/40 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/40 hover:text-emerald-200 hover:border-emerald-400/60 transition-all flex items-center justify-center gap-2"
                )}
              >
                <Play className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                <span>3초 샘플 즉시 체험</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowPrinciples(!showPrinciples);
                if (!showPrinciples) {
                  setTimeout(() => {
                    document.getElementById("system-principles")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }
              }}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full sm:w-auto border-zinc-800 text-zinc-300 hover:bg-zinc-900/60 hover:text-zinc-100 transition-all flex items-center justify-center gap-2"
              )}
            >
              시스템 원리 보기
              {showPrinciples ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Interactive Example Daily Board Preview (08_UI_UX_SPEC §5.1) */}
        <div className="max-w-4xl w-full mt-14 p-6 sm:p-8 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                미리보기 (Example Daily Board)
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                일간 丙火(병화) · 용신 水 · 활력 4/10 · 각성 8/10
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                모드: Consolidation (내실·경계 점검)
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                등급 A
              </span>
            </div>
          </div>

          <p className="text-base sm:text-lg font-semibold text-zinc-100 leading-relaxed">
            &ldquo;오늘은 확장 신호보다 범위 누수(Scope Leak)를 차단하고, 핵심 과제 1건의 근거를 확정하는 편이 가장 안전하고 효과적입니다.&rdquo;
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-emerald-900/40 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>반드시 할 일 (Required Actions)</span>
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-300 leading-relaxed">
                <li>• 오전 집중 구간에 핵심 제안서 수치 근거 1건 마감하기</li>
                <li>• 회의 전 포함 범위와 제외 범위(Boundary) 3줄 명시하기</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-rose-900/40 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                <XCircle className="w-4 h-4" />
                <span>하지 말아야 할 일 (Forbidden)</span>
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-300 leading-relaxed">
                <li>• 야간 피로 상태에서의 충동적 계약·지출 확약 금지</li>
                <li>• 검증되지 않은 성과의 성급한 대외 공표 지양</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-sky-900/40 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
                <Clock className="w-4 h-4" />
                <span>최적 실행 시간대 & 학습 루프</span>
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-300 leading-relaxed">
                <li>• <strong>10:00–12:00</strong>: 핵심 과제 몰입 및 근거 확보</li>
                <li>• <strong>21:00–22:30</strong>: 디지털 디톡스 및 Run-Receipt 기록</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mt-16">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-sm hover:border-indigo-500/30 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:bg-indigo-500 group-hover:text-zinc-950 transition-colors">
              ☯
            </div>
            <h3 className="text-lg font-semibold mb-2">결정론적 만세력 엔진</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              정확한 24절기 입춘 경계 계산을 바탕으로 사주 팔자, 십성, 대운, 세운을 오차 없이 계산합니다.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-sm hover:border-purple-500/30 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:bg-purple-500 group-hover:text-zinc-950 transition-colors">
              ⚡
            </div>
            <h3 className="text-lg font-semibold mb-2">실시간 바이브 융합</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              오늘의 기분, 활력도, 포커스, 소셜 로드를 원탭으로 측정해 정적 사주 풀이를 넘어서는 유동적 처방을 도출합니다.
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

        {/* System Principles Section */}
        {showPrinciples && (
          <div id="system-principles" className="max-w-5xl w-full mt-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
                시스템 원리
              </h2>
              <p className="text-sm text-zinc-500">TCO-Vibe Fortune Coach의 핵심 동작 원리</p>
            </div>

            {/* Core Thesis */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-purple-950/30 border border-indigo-800/30 backdrop-blur-sm mb-8">
              <h3 className="text-lg font-semibold text-indigo-300 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                핵심 명제
              </h3>
              <p className="text-zinc-300 leading-relaxed text-sm">
                <strong className="text-white">운세는 예언이 아닙니다. 운세는 구조적 prior(사전 확률)입니다.</strong>
                <br />
                TCO-Vibe는 사주를 &ldquo;확정된 운명&rdquo;으로 해석하지 않고, 오늘 당신이 가장 효과적으로 움직일 수 있는{" "}
                <strong className="text-indigo-300">행동 정책(Action Policy)</strong>으로 변환합니다.
              </p>
            </div>

            {/* Processing Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                    <Brain className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-sm">1. 만세력 엔진</h4>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  생년월일시를 정확한 절기 경계로 변환하여 사주 팔자(四柱八字), 대운(大運), 세운(歲運), 일운(日運)을 <strong className="text-zinc-300">결정론적으로</strong> 계산합니다. LLM은 사주를 계산하지 않습니다.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-purple-500/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-sm">2. 바이브 체크인</h4>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  기분(Valence), 에너지(Energy), 각성도(Arousal), 집중력(Focus), 사회적 부하(Social Load)를 측정하여 <strong className="text-zinc-300">현재 상태</strong>를 실시간으로 반영합니다.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-pink-500/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/15 flex items-center justify-center text-pink-400">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-sm">3. TCO 개념 융합</h4>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  사주 구조 + 바이브 상태 → <strong className="text-zinc-300">Context Tensor</strong> → Concept State → Risk Vector → Action Policy 순서로 변환하여 행동 지침을 도출합니다.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-emerald-500/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Heart className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-sm">4. VibeTune 톤 조절</h4>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  바이브 상태에 맞춰 코멘트 톤을 자동 조절합니다. 에너지가 낮으면 <strong className="text-zinc-300">따뜻한 위로</strong>, 높으면 <strong className="text-zinc-300">직설적 코칭</strong>으로 전환합니다.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-amber-500/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-sm">5. 안전 경계 검증</h4>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  모든 출력은 <strong className="text-zinc-300">Safety Gate</strong>를 통과합니다. 확정적 예언, 공포 유발, 관계 조종, 의료/법률/투자 확정 판단은 원천 차단됩니다.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-sm">6. 개인화 학습</h4>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  실행 기록(Run Receipt)과 바이브 이력을 <strong className="text-zinc-300">RAG 컨텍스트</strong>로 축적하여, 시간이 갈수록 더 정밀한 개인 맞춤 조언을 제공합니다.
                </p>
              </div>
            </div>

            {/* Five Element Summary */}
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4 text-center">오행(五行) 해석 프레임워크</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { element: "木", kr: "목", meaning: "성장·계획·착수", bias: "확장 지향", cls: "bg-emerald-950/30 border-emerald-800/30 text-emerald-400" },
                  { element: "火", kr: "화", meaning: "표현·발표·가시성", bias: "어필 지향", cls: "bg-rose-950/30 border-rose-800/30 text-rose-400" },
                  { element: "土", kr: "토", meaning: "안정·구조·점검", bias: "체계 지향", cls: "bg-amber-950/30 border-amber-800/30 text-amber-400" },
                  { element: "金", kr: "금", meaning: "결단·경계·정리", bias: "절제 지향", cls: "bg-zinc-900/60 border-zinc-700/40 text-zinc-300" },
                  { element: "水", kr: "수", meaning: "회복·연구·성찰", bias: "휴식 지향", cls: "bg-sky-950/30 border-sky-800/30 text-sky-400" },
                ].map((el) => (
                  <div key={el.element} className={cn("p-3 rounded-xl border text-center", el.cls)}>
                    <div className="text-2xl mb-1">{el.element}</div>
                    <div className="text-xs font-semibold text-zinc-200 mb-1">{el.kr}({el.element})</div>
                    <div className="text-[10px] text-zinc-400">{el.meaning}</div>
                    <div className="text-[10px] mt-1 font-medium">{el.bias}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900/60 py-8 px-6 text-center text-xs text-zinc-500">
        <p>© 2026 TCO-Vibe Fortune Coach v2. All rights reserved.</p>
        <p className="mt-2 text-zinc-600">모든 사주 풀이 및 행동 지침은 참고 사항이며, 최종 판단과 행동의 책임은 사용자 자신에게 있습니다.</p>
      </footer>
    </div>
  );
}
