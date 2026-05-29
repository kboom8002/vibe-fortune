"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  ShieldAlert,
  Flame,
  Brain,
  Activity,
  Calendar,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  XCircle,
  HelpCircle,
  Clock
} from "lucide-react";

export default function ForecastResultPage() {
  const router = useRouter();
  const params = useParams();
  const [forecast, setForecast] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [chart, setChart] = useState<any>(null);
  const [vibe, setVibe] = useState<any>(null);

  useEffect(() => {
    // Load cached values
    const storedProfile = localStorage.getItem("user-birth-profile");
    const storedChart = localStorage.getItem("user-manse-chart");
    const storedVibe = localStorage.getItem("user-vibe-checkin");
    const storedForecast = localStorage.getItem("last-generated-forecast");

    if (storedProfile) setProfile(JSON.parse(storedProfile));
    if (storedChart) setChart(JSON.parse(storedChart));
    if (storedVibe) setVibe(JSON.parse(storedVibe));

    // Fallback if no forecast was generated in localStorage yet
    if (storedForecast) {
      setForecast(JSON.parse(storedForecast));
    } else if (storedChart && storedVibe) {
      // Synthesize a beautiful forecast directly on client if server API wasn't triggered
      const parsedChart = JSON.parse(storedChart);
      const parsedVibe = JSON.parse(storedVibe);

      const requiredActions = [
        "오늘 당장 마감해야 하는 핵심 업무 1개 정의하고 마감하기",
        "동료 혹은 비즈니스 파트너와 차분하고 정합성 있는 대화 조율",
      ];
      const forbiddenActions = [
        "사전 조율되지 않은 즉흥적인 투자 계약이나 구두 확약",
        "몸을 혹사시키는 늦은 시간 야근 및 카페인 과다 섭취",
      ];
      const deferredActions = [
        "새로운 대규모 마케팅 캠페인 기획 및 착수",
        "중요도가 떨어지는 세부 행정 회의 참석",
      ];
      const boundaryNotes = [
        "투자 및 계약 시 조급하게 서두르지 말고 명문 서면 계약서 작성 필수",
        "활력이 조금 낮아진 상태이므로 휴식시간 2시간을 무조건 사수할 것",
      ];

      setForecast({
        id: params.id,
        mode: "daily",
        outputJson: {
          summary: `오늘 일간 ${parsedChart.dayMaster.stem}의 안정적인 토(土) 기류 아래, 기분지수(${parsedVibe.valence})를 유지하며 핵심에 집중하십시오.`,
          conceptStateDescription: "목적지향적 정리와 점검(Consolidation)이 고도로 조율되는 하루입니다.",
          actionPolicyExplanation: "불필요한 충동 확장을 억제하고 현재 진행 중인 파이프라인의 완성도를 높이는 것이 이롭습니다.",
        },
        outputMarkdown: "",
        grade: "A",
        requiredActions,
        forbiddenActions,
        deferredActions,
        boundaryNotes,
        createdAt: new Date().toISOString(),
      });
    }
  }, [params.id]);

  if (!forecast || !chart) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <Clock className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm">운영 보드를 연산하고 있습니다...</p>
        </div>
      </div>
    );
  }

  const { outputJson } = forecast;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col justify-between relative overflow-x-hidden font-sans">
      <Navbar />
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      <main className="py-12 px-6 flex-1">
      <div className="max-w-4xl w-full mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                TCO-Vibe
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-indigo-300 font-mono font-medium">
                일일 운영 보드
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              분석 대상: {profile?.name || "사용자"} | 기준일자: {forecast.createdAt ? forecast.createdAt.split("T")[0] : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/app/daily"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-zinc-800 hover:bg-zinc-900/50 text-zinc-300 gap-2"
              )}
            >
              <RotateCcw className="w-4 h-4" /> 다시 진단하기
            </Link>
            <Link
              href={`/app/run-receipt/${forecast.id}`}
              className={cn(
                buttonVariants({ variant: "default" }),
                "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/10 gap-2 border-0"
              )}
            >
              <BookOpen className="w-4 h-4" /> 실행 기록 남기기
            </Link>
          </div>
        </div>

        {/* Boundary Alert Banner */}
        {forecast.boundaryNotes && forecast.boundaryNotes.length > 0 && (
          <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-900/30 flex items-start gap-4">
            <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h4 className="font-semibold text-amber-200 text-sm">운영 보드 안전선 준수 알림</h4>
              <ul className="list-disc pl-4 text-xs text-amber-300/85 leading-relaxed space-y-1">
                {forecast.boundaryNotes.map((note: string, idx: number) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Top Grade and summary card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400">한 줄 결론</span>
              <p className="text-lg sm:text-xl font-bold leading-relaxed text-zinc-100">
                "{outputJson?.summary || "오늘의 우주적 기류 아래, 핵심 가치에 고도로 몰입하십시오."}"
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-400 pt-4 border-t border-zinc-800/50">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>운영모드: <strong>{forecast.mode || "Consolidation"}</strong></span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
              <div>일간(DM): <strong>{chart.dayMaster.stem}({chart.dayMaster.element})</strong></div>
            </div>
          </div>

          {/* Core Concept State Card */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md flex flex-col justify-between text-center relative overflow-hidden group hover:border-indigo-500/20 transition-all">
            <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-2xl group-hover:bg-indigo-500/10 transition-all" />
            <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400">오늘의 추천 등급</span>
            <div className="text-6xl font-extrabold bg-gradient-to-br from-indigo-300 via-purple-400 to-pink-400 bg-clip-text text-transparent py-4">
              {forecast.grade || "A"}
            </div>
            <div className="text-xs text-zinc-400 leading-relaxed">
              사주 구조적 기회와 현재의 높은 포커스 상태가 융합되어 도출된 권장 효율 등급입니다.
            </div>
          </div>
        </div>

        {/* Checklist of Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Do Checklist */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              필수 행동 (Do)
            </h3>
            <ul className="space-y-4">
              {forecast.requiredActions?.map((action: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-zinc-300 leading-relaxed font-medium">{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Don't Checklist */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400" />
              금지 행동 (Don't)
            </h3>
            <ul className="space-y-4">
              {forecast.forbiddenActions?.map((action: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                    !
                  </span>
                  <span className="text-sm text-zinc-300 leading-relaxed font-medium">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Deferred Actions and Concept State */}
        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            보류 행동 및 세부 상태 해설
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <p className="text-sm text-zinc-400 leading-relaxed">
                <strong className="text-zinc-200">개념 분석:</strong> {outputJson?.conceptStateDescription || ""}
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                <strong className="text-zinc-200">행동 조율:</strong> {outputJson?.actionPolicyExplanation || ""}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 block">오늘 보류해야 할 일</span>
              <ul className="space-y-2">
                {forecast.deferredActions?.map((action: string, idx: number) => (
                  <li key={idx} className="text-xs text-zinc-400 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}
