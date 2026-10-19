"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { OperatorTracePanel } from "@/components/OperatorTracePanel";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Lock,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface CanonicalRiskState {
  overextension: number;
  scopeLeak: number;
  overclaim: number;
  burnout: number;
  relationshipDryness: number;
  emotionalOverreaction: number;
  legalSafetyRisk: number;
  missedOpportunity: number;
  primaryRisk: string;
  secondaryRisk: string;
}

const DEFAULT_RISK_VECTOR: CanonicalRiskState = {
  overextension: 0.58,
  scopeLeak: 0.52,
  overclaim: 0.36,
  burnout: 0.64,
  relationshipDryness: 0.45,
  emotionalOverreaction: 0.42,
  legalSafetyRisk: 0.28,
  missedOpportunity: 0.39,
  primaryRisk: "burnout",
  secondaryRisk: "overextension",
};

const RISK_META: Record<
  string,
  { label: string; desc: string; mitigation: string }
> = {
  overextension: {
    label: "과잉 확장 (Overextension)",
    desc: "현재 가용 에너지·시간 용량을 초과해 일정이나 프로젝트를 벌일 위험",
    mitigation: "신규 요청은 즉시 수락하지 말고 2시간 유예 후 가용 슬롯을 먼저 확인하세요.",
  },
  scopeLeak: {
    label: "범위 누수 (Scope Leak)",
    desc: "업무·관계 경계가 흐려져 핵심 과제가 아닌 부차적 일에 에너지를 뺏길 위험",
    mitigation: "오늘의 핵심 과업 1건과 거절 기준(Boundary Rule)을 사전에 명시하세요.",
  },
  overclaim: {
    label: "과장 확약 (Overclaim)",
    desc: "충분한 검증 없이 성과나 납기를 낙관적으로 약속할 위험",
    mitigation: "최종 확정 전 사실 근거 1가지와 버퍼 일정을 먼저 점검하세요.",
  },
  burnout: {
    label: "번아웃 고갈 (Burnout)",
    desc: "수면 부족이나 과부하로 인해 인지·신체 에너지가 급격히 소진될 위험",
    mitigation: "고밀도 의사결정을 줄이고 최소 1개의 회복 블록을 강제 확보하세요.",
  },
  relationshipDryness: {
    label: "관계 건조화 (Relationship Dryness)",
    desc: "효율과 성과에만 몰두해 대인 소통이 사무적이거나 냉각될 위험",
    mitigation: "핵심 협업자나 소중한 사람에게 짧은 감사·안부 1건을 먼저 전하세요.",
  },
  emotionalOverreaction: {
    label: "감정 과잉반응 (Emotional Overreaction)",
    desc: "피로·각성 상태에서 불필요한 대립이나 날 선 반응이 증폭될 위험",
    mitigation: "민감한 피드백이나 반박 메시지는 초안 작성 후 발송을 보류하세요.",
  },
  legalSafetyRisk: {
    label: "법적·안전 리스크 (Legal & Safety)",
    desc: "집중력 저하 상태에서 계약 조건·규정·안전 수칙을 누락할 위험",
    mitigation: "중요 서류 서명이나 재무 결정은 24시간 냉각기와 교차 검토를 거치세요.",
  },
  missedOpportunity: {
    label: "기회 유실 (Missed Opportunity)",
    desc: "과도한 신중함이나 회피 지연으로 핵심 타이밍을 놓칠 위험",
    mitigation: "가장 중요한 과제를 15분 분량의 첫 단계로 쪼개어 오전에 착수하세요.",
  },
  // Legacy alias support
  overcommitRisk: {
    label: "과잉 확장 (Overextension)",
    desc: "처리 용량을 초과해 일정이나 요청을 수락할 위험",
    mitigation: "신규 요청은 즉시 수락하지 말고 2시간 유예 후 가용 슬롯을 먼저 확인하세요.",
  },
  burnoutDepletionRisk: {
    label: "번아웃 고갈 (Burnout)",
    desc: "수면 부족이나 과부하로 인해 인지·신체 에너지가 급격히 소진될 위험",
    mitigation: "고밀도 의사결정을 줄이고 최소 1개의 회복 블록을 강제 확보하세요.",
  },
};

export default function RiskDashboardPage() {
  const [riskVector, setRiskVector] = useState<CanonicalRiskState>(DEFAULT_RISK_VECTOR);
  const [boundaryNotes] = useState<string[]>([
    "이 코칭 리포트는 자기성찰과 일정·행동 관리를 돕기 위한 참고 자료이며, 의료·법률·투자·정신건강에 대한 최종 판단을 대신하지 않습니다.",
    "고위험 감지 시 공격적 확장보다 기존 경계 유지(Hold) 및 결정 유예(Defer)가 우선 적용됩니다.",
  ]);
  const [operatorNames, setOperatorNames] = useState<string[]>([
    "HOLD_BOUNDARY",
    "DEFER_HIGH_STAKES",
    "ENERGY_CONSERVATION",
  ]);
  const [hasLiveRisk, setHasLiveRisk] = useState(false);

  useEffect(() => {
    try {
      const savedRisk = localStorage.getItem("last-risk-vector");
      if (savedRisk) {
        const parsed = JSON.parse(savedRisk);
        setRiskVector({
          overextension: Number(parsed.overextension ?? parsed.overcommitRisk ?? 0.58),
          scopeLeak: Number(parsed.scopeLeak ?? parsed.boundaryLeakRisk ?? 0.52),
          overclaim: Number(parsed.overclaim ?? parsed.PrematureClosureRisk ?? 0.36),
          burnout: Number(parsed.burnout ?? parsed.burnoutDepletionRisk ?? 0.64),
          relationshipDryness: Number(parsed.relationshipDryness ?? parsed.ruminationRisk ?? 0.45),
          emotionalOverreaction: Number(parsed.emotionalOverreaction ?? parsed.conflictEscalationRisk ?? 0.42),
          legalSafetyRisk: Number(parsed.legalSafetyRisk ?? parsed.impulsiveSpendRisk ?? 0.28),
          missedOpportunity: Number(parsed.missedOpportunity ?? parsed.avoidanceDelayRisk ?? 0.39),
          primaryRisk: parsed.primaryRisk || "burnout",
          secondaryRisk: parsed.secondaryRisk || "overextension",
        });
        setHasLiveRisk(true);
      }

      const lastReq = localStorage.getItem("last-forecast-request");
      if (lastReq) {
        const parsedReq = JSON.parse(lastReq);
        if ((parsedReq?.vibeCheckIn?.arousal ?? 5) >= 7) {
          setOperatorNames(["STRESS_DAMPENER", "HOLD_BOUNDARY", "DEFER_HIGH_STAKES"]);
        }
      }
    } catch (e) {
      console.warn("Failed to load risk vector from localStorage:", e);
    }
  }, []);

  const scoreKeys: (keyof Omit<CanonicalRiskState, "primaryRisk" | "secondaryRisk">)[] = [
    "overextension",
    "scopeLeak",
    "overclaim",
    "burnout",
    "relationshipDryness",
    "emotionalOverreaction",
    "legalSafetyRisk",
    "missedOpportunity",
  ];

  const primaryMeta = RISK_META[riskVector.primaryRisk] || RISK_META.burnout;
  const secondaryMeta = RISK_META[riskVector.secondaryRisk] || RISK_META.overextension;
  const primaryVal = Number((riskVector as any)[riskVector.primaryRisk] ?? riskVector.burnout ?? 0.64);
  const secondaryVal = Number((riskVector as any)[riskVector.secondaryRisk] ?? riskVector.overextension ?? 0.58);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 pb-24 md:pb-16 font-sans">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 border border-amber-500/30 rounded-3xl p-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              8-Axis Operational Risk & Boundary Monitor
            </div>
            <h1 className="text-2xl font-bold text-zinc-50">
              리스크 대시보드 & 안전 경계
            </h1>
            <p className="text-xs text-zinc-400">
              만세력 구조적 긴장도와 실시간 바이브(스트레스·수면·에너지)로 산출된 8대 운영 리스크 벡터입니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/app/daily"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              바이브 재측정
            </Link>
          </div>
        </div>

        {!hasLiveRisk && (
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-3 text-xs text-indigo-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                현재 기본 시뮬레이션 리스크 지표가 표시되고 있습니다. 일간 체크인을 완료하면 실시간 리스크 벡터가 반영됩니다.
              </span>
            </div>
            <Link
              href="/app/daily"
              className="text-indigo-300 hover:text-white font-semibold underline shrink-0"
            >
              체크인 이동
            </Link>
          </div>
        )}

        {/* Primary & Secondary Risk Callout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-3xl bg-rose-950/25 border border-rose-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                1순위 핵심 리스크 (Primary Risk)
              </span>
              <span className="text-sm font-mono font-bold text-rose-400">
                {Math.round((primaryVal <= 1 ? primaryVal * 100 : primaryVal))}%
              </span>
            </div>
            <h2 className="text-base font-bold text-zinc-50">
              {primaryMeta.label}
            </h2>
            <p className="text-xs text-zinc-300">{primaryMeta.desc}</p>
            <div className="pt-2 border-t border-rose-500/20 text-xs text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong>대응 수칙:</strong> {primaryMeta.mitigation}
              </span>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-amber-950/20 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                2순위 보조 리스크 (Secondary Risk)
              </span>
              <span className="text-sm font-mono font-bold text-amber-400">
                {Math.round((secondaryVal <= 1 ? secondaryVal * 100 : secondaryVal))}%
              </span>
            </div>
            <h2 className="text-base font-bold text-zinc-50">
              {secondaryMeta.label}
            </h2>
            <p className="text-xs text-zinc-300">{secondaryMeta.desc}</p>
            <div className="pt-2 border-t border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>대응 수칙:</strong> {secondaryMeta.mitigation}
              </span>
            </div>
          </div>
        </div>

        {/* 8-Axis Risk Vector Bars */}
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/40 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              8대 운영 리스크 벡터 상세 수치
            </h3>
            <span className="text-[11px] text-zinc-400">
              65% 이상: 고위험 경계 / 40~64%: 주의 / 40% 미만: 안정
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {scoreKeys.map((key) => {
              const rawVal = Number(riskVector[key] ?? 0);
              const pct = rawVal <= 1 ? Math.round(rawVal * 100) : Math.round(rawVal);
              const meta = RISK_META[key];
              const isHigh = pct >= 65;
              const isMed = pct >= 40 && pct < 65;
              return (
                <div
                  key={key}
                  className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/90 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-200">
                      {meta.label}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        isHigh
                          ? "text-rose-400"
                          : isMed
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isHigh
                          ? "bg-rose-500"
                          : isMed
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {meta.mitigation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* TCO Operator Trace Panel */}
        <OperatorTracePanel
          activeOperators={operatorNames}
          Mode="Defensive-Balance"
        />

        {/* Safety Boundary Rules */}
        <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
            <Lock className="w-4 h-4 text-indigo-400" />
            Safety Gate & 윤리적 코칭 경계 원칙
          </div>
          <ul className="space-y-2">
            {boundaryNotes.map((note, idx) => (
              <li
                key={idx}
                className="text-xs text-zinc-400 flex items-start gap-2 leading-relaxed"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2 flex justify-end">
            <Link
              href="/app/history"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              실행 영수증 히스토리에서 리스크 방어 기록 확인
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
