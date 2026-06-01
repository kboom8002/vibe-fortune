"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { ChevronDown, ChevronUp, Sparkles, Shield, Brain, BarChart3, Zap, Heart } from "lucide-react";

export default function Home() {
  const [showPrinciples, setShowPrinciples] = useState(false);

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
            <button
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
                "w-full sm:w-auto border-indigo-500/50 text-indigo-300 hover:bg-indigo-950/50 hover:text-indigo-200 hover:border-indigo-400/60 transition-all flex items-center justify-center gap-2"
              )}
            >
              시스템 원리 보기
              {showPrinciples ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
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
                TCO-Vibe는 사주를 &ldquo;확정된 운명&rdquo;으로 해석하지 않고, 오늘 당신이 가장 효과적으로 움직일 수 있는 
                <strong className="text-indigo-300"> 행동 정책(Action Policy)</strong>으로 변환합니다.
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
                  { element: "木", kr: "목", color: "emerald", meaning: "성장·계획·착수", bias: "확장 지향" },
                  { element: "火", kr: "화", color: "red", meaning: "표현·발표·가시성", bias: "어필 지향" },
                  { element: "土", kr: "토", color: "amber", meaning: "안정·구조·점검", bias: "체계 지향" },
                  { element: "金", kr: "금", color: "zinc", meaning: "결단·경계·정리", bias: "절제 지향" },
                  { element: "水", kr: "수", color: "blue", meaning: "회복·연구·성찰", bias: "휴식 지향" },
                ].map((el) => (
                  <div key={el.element} className={`p-3 rounded-xl bg-${el.color}-950/30 border border-${el.color}-800/30 text-center`}>
                    <div className={`text-2xl mb-1`}>{el.element}</div>
                    <div className="text-xs font-semibold text-zinc-300 mb-1">{el.kr}({el.element})</div>
                    <div className="text-[10px] text-zinc-400">{el.meaning}</div>
                    <div className={`text-[10px] mt-1 text-${el.color}-400`}>{el.bias}</div>
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

