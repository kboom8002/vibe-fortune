"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { RlhfTransparencyBanner } from "@/components/RlhfTransparencyBanner";
import {
  Sparkles,
  Calendar,
  TrendingUp,
  ShieldAlert,
  History,
  Settings,
  ArrowRight,
  CheckCircle2,
  UserCheck,
  Clock,
  Activity,
} from "lucide-react";

export default function AppHomePage() {
  const [hasProfile, setHasProfile] = useState(false);
  const [profileName, setProfileName] = useState<string>("게스트");
  const [hasTodayCheckIn, setHasTodayCheckIn] = useState(false);
  const [lastForecastId, setLastForecastId] = useState<string | null>(null);
  const [receiptCount, setReceiptCount] = useState<number>(0);
  const [primaryRisk, setPrimaryRisk] = useState<string | null>(null);

  useEffect(() => {
    try {
      const profileStr = localStorage.getItem("user-birth-profile");
      if (profileStr) {
        const parsed = JSON.parse(profileStr);
        setHasProfile(true);
        if (parsed.name) setProfileName(parsed.name);
      }

      const lastReqStr = localStorage.getItem("last-forecast-request");
      if (lastReqStr) {
        const parsedReq = JSON.parse(lastReqStr);
        setHasTodayCheckIn(true);
        setLastForecastId(parsedReq.id || "latest");
      }

      const receiptsStr =
        localStorage.getItem("user-run-receipts") ||
        localStorage.getItem("run-receipts");
      if (receiptsStr) {
        const parsedReceipts = JSON.parse(receiptsStr);
        if (Array.isArray(parsedReceipts)) {
          setReceiptCount(parsedReceipts.length);
        }
      }

      const riskStr = localStorage.getItem("last-risk-vector");
      if (riskStr) {
        const parsedRisk = JSON.parse(riskStr);
        if (parsedRisk.primaryRisk) {
          setPrimaryRisk(parsedRisk.primaryRisk);
        }
      }
    } catch (e) {
      console.warn("Failed to load dashboard status from localStorage:", e);
    }
  }, []);

  const RISK_LABELS: Record<string, string> = {
    overextension: "과잉 확장 (Overextension)",
    scopeLeak: "범위 누수 (Scope Leak)",
    overclaim: "과장 확약 (Overclaim)",
    burnout: "번아웃 고갈 (Burnout)",
    relationshipDryness: "관계 건조화 (Dryness)",
    emotionalOverreaction: "감정 과잉반응 (Overreaction)",
    legalSafetyRisk: "법적·안전 리스크 (Safety)",
    missedOpportunity: "기회 유실 (Missed Opp.)",
    overcommitRisk: "과잉 확장 (Overcommit)",
    conflictEscalationRisk: "갈등확대 (Conflict Escalation)",
    impulsiveSpendRisk: "충동지출 (Impulsive Spend)",
    burnoutDepletionRisk: "번아웃 고갈 (Burnout)",
    ruminationRisk: "반추/집착 (Rumination)",
    boundaryLeakRisk: "경계 누수 (Boundary Leak)",
    PrematureClosureRisk: "조기단정 (Premature Closure)",
    avoidanceDelayRisk: "회피지연 (Avoidance Delay)",
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 pb-24 md:pb-16 font-sans">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-950/50 via-zinc-900/90 to-zinc-900/90 border border-indigo-500/25 rounded-3xl p-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              TCO-Vibe Fortune Coach v2
            </div>
            <h1 className="text-2xl font-bold text-zinc-50">
              안녕하세요, {profileName}님
            </h1>
            <p className="text-xs text-zinc-400">
              결정론적 만세력 차트와 실시간 바이브 체크인을 결합해 오늘의 행동 정책을 설계합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {!hasProfile ? (
              <Link
                href="/app/onboarding/birth"
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition"
              >
                <UserCheck className="w-4 h-4" />
                출생 정보 설정하기
              </Link>
            ) : (
              <Link
                href="/app/daily"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/25"
              >
                <Sparkles className="w-4 h-4" />
                오늘의 바이브 체크인
              </Link>
            )}
            {lastForecastId && (
              <Link
                href={`/app/result/${lastForecastId}`}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition"
              >
                최근 리포트 보기
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        <RlhfTransparencyBanner />

        {/* Status Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-zinc-400">만세력 프로필 상태</div>
              <div className="text-sm font-bold text-zinc-100 mt-0.5">
                {hasProfile ? "등록 완료" : "미등록 (온보딩 필요)"}
              </div>
            </div>
            <CheckCircle2
              className={`w-5 h-5 ${
                hasProfile ? "text-emerald-400" : "text-zinc-600"
              }`}
            />
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-zinc-400">누적 실행 영수증</div>
              <div className="text-sm font-bold text-zinc-100 mt-0.5">
                {receiptCount}건 기록됨
              </div>
            </div>
            <Clock className="w-5 h-5 text-indigo-400" />
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-zinc-400">최근 주요 리스크 축</div>
              <div className="text-sm font-bold text-amber-300 mt-0.5 truncate max-w-[180px]">
                {primaryRisk
                  ? RISK_LABELS[primaryRisk] || primaryRisk
                  : "체크인 대기 중"}
              </div>
            </div>
            <Activity className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/app/daily"
            className="group p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 hover:border-indigo-500/40 transition flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300">
                  {hasTodayCheckIn ? "오늘 체크인 완료" : "1-Tap 10초 진단"}
                </span>
              </div>
              <h2 className="text-base font-bold text-zinc-50 group-hover:text-indigo-300 transition">
                일간 바이브 체크인 & 행동 정책
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                무드·에너지·수면·집중 영역을 입력하고 오늘 반드시 실행할 행동과 보류할 결정을 확인합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-indigo-400 font-medium">
              <span>체크인 시작하기</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/app/risk"
            className="group p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 hover:border-amber-500/40 transition flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300">
                  8대 리스크 벡터
                </span>
              </div>
              <h2 className="text-base font-bold text-zinc-50 group-hover:text-amber-300 transition">
                리스크 대시보드 & 안전 경계
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                과잉 확장·범위 누수·번아웃 등 8대 운영 리스크 지표와 TCO 오퍼레이터 개입 상태를 점검합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-amber-400 font-medium">
              <span>리스크 벡터 분석 보기</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/app/weekly"
            className="group p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 hover:border-emerald-500/40 transition flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Calendar className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300">
                  7일 운영 회고
                </span>
              </div>
              <h2 className="text-base font-bold text-zinc-50 group-hover:text-emerald-300 transition">
                주간 리듬 리뷰 & 주간 행동 정책
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                요일별 에너지 흐름과 실행 영수증(Run-Receipt) 요약을 기반으로 주간 핵심 행동 지침을 수립합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-emerald-400 font-medium">
              <span>주간 리포트 열기</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/app/monthly"
            className="group p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 hover:border-purple-500/40 transition flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <TrendingUp className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300">
                  월운 전략 플랜
                </span>
              </div>
              <h2 className="text-base font-bold text-zinc-50 group-hover:text-purple-300 transition">
                월간 테마 & 경계 정책 (Boundary Policy)
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                이번 달의 전략 프레임, 주차별 실행 계획, 검증 지표(Evidence Target) 및 리스크 경계 수칙을 확인합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-purple-400 font-medium">
              <span>월간 플랜 열기</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Bottom Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/app/history"
            className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between transition"
          >
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-zinc-400" />
              <div>
                <div className="text-sm font-semibold text-zinc-100">
                  실행 영수증 히스토리
                </div>
                <div className="text-[11px] text-zinc-400">
                  과거 코칭 조언 준수 여부와 체감 피드백 기록
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500" />
          </Link>

          <Link
            href="/app/settings"
            className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between transition"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-zinc-400" />
              <div>
                <div className="text-sm font-semibold text-zinc-100">
                  프로필 & RLHF 개인화 설정
                </div>
                <div className="text-[11px] text-zinc-400">
                  출생 정보 수정, 학습 바이어스 초기화 및 데이터 관리
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500" />
          </Link>
        </div>
      </main>
    </div>
  );
}
