"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { calculateChart, calculateMajorLuck, calculateAnnualLuck, calculateAllTenGods, analyzeInteractions, analyzeDivineKillers } from "@/lib/manse";
import {
  Sparkles, ShieldAlert, Flame, Brain, Activity, Calendar, AlertTriangle,
  RotateCcw, BookOpen, XCircle, HelpCircle, Clock, TrendingUp, Zap, Target,
  ArrowRight
} from "lucide-react";

// 오행 컬러 매핑
const ELEMENT_COLORS: Record<string, string> = {
  "목": "text-green-400", "木": "text-green-400",
  "화": "text-rose-400", "火": "text-rose-400",
  "토": "text-amber-400", "土": "text-amber-400",
  "금": "text-zinc-300", "金": "text-zinc-300",
  "수": "text-sky-400", "水": "text-sky-400",
};
const ELEMENT_BG: Record<string, string> = {
  "목": "bg-green-500/10 border-green-500/30", "木": "bg-green-500/10 border-green-500/30",
  "화": "bg-rose-500/10 border-rose-500/30", "火": "bg-rose-500/10 border-rose-500/30",
  "토": "bg-amber-500/10 border-amber-500/30", "土": "bg-amber-500/10 border-amber-500/30",
  "금": "bg-zinc-500/10 border-zinc-500/30", "金": "bg-zinc-500/10 border-zinc-500/30",
  "수": "bg-sky-500/10 border-sky-500/30", "水": "bg-sky-500/10 border-sky-500/30",
};

export default function ForecastResultPage() {
  const router = useRouter();
  const params = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [chart, setChart] = useState<any>(null);
  const [majorLuck, setMajorLuck] = useState<any>(null);
  const [annualLuck, setAnnualLuck] = useState<any>(null);
  const [tenGods, setTenGods] = useState<Record<string, string> | null>(null);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [divineKillers, setDivineKillers] = useState<any[]>([]);
  const [vibe, setVibe] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState("");

  useEffect(() => {
    const storedProfile = localStorage.getItem("user-birth-profile");
    const storedVibe = localStorage.getItem("last-vibe-checkin");
    const storedRequest = localStorage.getItem("last-forecast-request");

    if (!storedProfile) {
      router.push("/app/onboarding");
      return;
    }

    const profileData = JSON.parse(storedProfile);
    setProfile(profileData);
    if (storedVibe) setVibe(JSON.parse(storedVibe));

    // 1. 사주 차트 즉시 계산 (결정론적)
    try {
      const birthDate = profileData.birthDate || "1990-01-01";
      const birthTime = profileData.birthTime || "12:00";
      const chartResult = calculateChart({
        birthDateTime: birthDate + "T" + birthTime + ":00",
        timezone: profileData.timezone || "Asia/Seoul",
        gender: profileData.gender || "male",
      });
      setChart(chartResult);
      localStorage.setItem("user-manse-chart", JSON.stringify(chartResult));

      // 대운 계산
      try {
        const ml = calculateMajorLuck({
          chart: chartResult,
          gender: profileData.gender || "male",
        });
        setMajorLuck(ml);
      } catch (e) { console.warn("대운 계산 실패:", e); }

      // 세운 계산
      try {
        const now = new Date();
        const al = calculateAnnualLuck({
          year: now.getFullYear(),
        });
        setAnnualLuck(al);
      } catch (e) { console.warn("세운 계산 실패:", e); }

      // 십신 계산
      try { setTenGods(calculateAllTenGods(chartResult)); } catch (e) { console.warn("십신 계산 실패:", e); }
      // 합충형파해
      try { setInteractions(analyzeInteractions(chartResult)); } catch (e) { console.warn("합충 계산 실패:", e); }
      // 신살
      try { setDivineKillers(analyzeDivineKillers(chartResult)); } catch (e) { console.warn("신살 계산 실패:", e); }

      // 2. LLM 기반 포캐스트 비동기 호출
      if (storedVibe) {
        fetchForecast(profileData, chartResult, JSON.parse(storedVibe));
      }
    } catch (err) {
      console.error("사주 계산 오류:", err);
    }
  }, [router]);

  const fetchForecast = async (profileData: any, chartResult: any, vibeData: any) => {
    setLlmLoading(true);
    setLlmError("");
    try {
      const res = await fetch("/api/forecast/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDate: new Date().toISOString().split("T")[0],
          currentFocus: [vibeData.currentFocus || "business_finance"],
          vibeCheckIn: vibeData,
          birthProfile: profileData,
          providedChart: chartResult,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.forecastOutput) {
          setForecast(data.forecastOutput);
          localStorage.setItem("last-generated-forecast", JSON.stringify(data.forecastOutput));
        } else {
          // API 성공했지만 output이 없을 때 fallback
          generateLocalForecast(chartResult, vibeData);
        }
      } else {
        generateLocalForecast(chartResult, vibeData);
      }
    } catch {
      generateLocalForecast(chartResult, vibeData);
    } finally {
      setLlmLoading(false);
    }
  };

  // LLM 없이도 사주 기반 로컬 포캐스트 생성
  const generateLocalForecast = (chartResult: any, vibeData: any) => {
    const dm = chartResult.dayMaster;
    const energy = vibeData?.energy ?? 5;
    const focus = vibeData?.focus ?? 5;
    const valence = vibeData?.valence ?? 5;

    const gradeScore = Math.round((energy + focus + valence) / 3);
    const grade = gradeScore >= 7 ? "S" : gradeScore >= 5 ? "A" : gradeScore >= 3 ? "B" : "C";

    setForecast({
      summary: `오늘 일간 ${dm.stem}(${dm.element})의 기류 아래, 현재 기분지수(${valence}/10)와 활력(${energy}/10)을 고려하여 핵심 가치에 집중하는 것이 이롭습니다.`,
      conceptState: gradeScore >= 5 ? "expansion" : "consolidation",
      conceptStateDescription: gradeScore >= 5
        ? "확장과 전진에 적합한 컨디션입니다. 새로운 시도를 적극 추진하세요."
        : "내면 정리와 기존 업무 마무리에 집중하는 것이 효과적입니다.",
      actionPolicyExplanation: `${dm.element} 오행 기운과 현재 바이브 상태를 종합하면, ${gradeScore >= 5 ? "적극적 행동이 권장됩니다" : "신중한 접근이 유리합니다"}.`,
      grade,
      requiredActions: [
        "핵심 업무 1가지를 정의하고 완결하기",
        `${dm.element === "木" || dm.element === "목" ? "새로운 아이디어를 적극 제안" : "기존 계획의 완성도를 높이기"}`,
      ],
      forbiddenActions: [
        "사전 조율 없는 대규모 투자 결정이나 구두 확약",
        `${energy < 5 ? "무리한 야근 및 체력 소모" : "중요하지 않은 회의에 과도한 시간 소비"}`,
      ],
      deferredActions: [
        "긴급하지 않은 행정 업무 처리",
        "장기 계획 재수립 (주말로 이연)",
      ],
      boundaryNotes: energy < 4 ? [
        "활력이 낮은 상태입니다. 반드시 2시간 이상 휴식을 확보하세요.",
      ] : [],
    });
  };

  // 로딩 중 (차트 계산 전)
  if (!chart) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <Clock className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm">사주 차트를 계산하고 있습니다...</p>
        </div>
      </div>
    );
  }

  const pillars = chart.pillars;
  const dm = chart.dayMaster;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-x-hidden font-sans">
      <Navbar />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-glow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-glow pointer-events-none" />

      <main className="py-12 px-6 flex-1">
        <div className="max-w-4xl w-full mx-auto space-y-8 relative z-10">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/80 pb-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                일일 운영 보드
              </h1>
              <p className="text-xs text-zinc-400">
                {profile?.name || "사용자"} | {new Date().toLocaleDateString("ko-KR")} | 일간(DM): {dm.stem}({dm.element})
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/app/daily" className={cn(buttonVariants({ variant: "outline" }), "border-zinc-800 hover:bg-zinc-900/50 text-zinc-300 gap-2")}>
                <RotateCcw className="w-4 h-4" /> 다시 진단
              </Link>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════ */}
          {/* 사주 팔자 차트 (즉시 표시) */}
          {/* ═══════════════════════════════════════════════ */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Calendar className="w-4 h-4 text-indigo-400" />
              사주 팔자 (四柱八字)
            </h2>

            <div className="grid grid-cols-4 gap-4 text-center">
              {(["year", "month", "day", "hour"] as const).map((pillar) => {
                const p = pillars[pillar];
                const stemEl = p.stemElement || "";
                const branchEl = p.branchElement || "";
                const label = pillar === "year" ? "년주" : pillar === "month" ? "월주" : pillar === "day" ? "일주" : "시주";
                return (
                  <div key={pillar} className="space-y-2">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{label}</span>
                    <div className={`p-4 rounded-2xl border ${ELEMENT_BG[stemEl] || "bg-zinc-800/30 border-zinc-700/50"}`}>
                      <div className={`text-2xl font-bold ${ELEMENT_COLORS[stemEl] || "text-zinc-300"}`}>{p.stem}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">{stemEl} ({p.stemPolarity === "양" ? "+" : "-"})</div>
                    </div>
                    <div className={`p-4 rounded-2xl border ${ELEMENT_BG[branchEl] || "bg-zinc-800/30 border-zinc-700/50"}`}>
                      <div className={`text-2xl font-bold ${ELEMENT_COLORS[branchEl] || "text-zinc-300"}`}>{p.branch}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">{branchEl}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 오행 분포 */}
            {chart.elementProfile && (
              <div className="mt-4 space-y-3">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">오행 분포</h3>
                <div className="flex gap-2">
                  {Object.entries(chart.elementProfile as Record<string, number>).map(([element, count]) => (
                    <div key={element} className={`flex-1 p-3 rounded-xl text-center border ${ELEMENT_BG[element] || "bg-zinc-800/30 border-zinc-700/50"}`}>
                      <div className={`text-lg font-bold ${ELEMENT_COLORS[element] || "text-zinc-300"}`}>{element}</div>
                      <div className="text-xs text-zinc-500">{count as number}개</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 대운 & 세운 */}
          {(majorLuck || annualLuck) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {majorLuck && majorLuck.periods && (
                <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    현재 대운
                  </h3>
                  {(() => {
                    const now = new Date().getFullYear();
                    const current = majorLuck.periods.find((p: any) => now >= p.startAge + (parseInt(profile?.birthDate?.split("-")[0]) || 1990) && now < p.startAge + (parseInt(profile?.birthDate?.split("-")[0]) || 1990) + 10);
                    if (current) {
                      return (
                        <div className="flex items-center gap-4">
                          <div className={`p-4 rounded-2xl border text-center ${ELEMENT_BG[current.stemElement] || "bg-zinc-800/30 border-zinc-700/50"}`}>
                            <div className={`text-xl font-bold ${ELEMENT_COLORS[current.stemElement] || "text-zinc-300"}`}>{current.stem}{current.branch}</div>
                            <div className="text-[10px] text-zinc-500">{current.stemElement} · {current.branchElement}</div>
                          </div>
                          <div className="text-xs text-zinc-400">
                            <p>{current.startAge}세 ~ {current.startAge + 9}세</p>
                            <p className="text-zinc-500">대운 진행 중</p>
                          </div>
                        </div>
                      );
                    }
                    return <p className="text-xs text-zinc-500">대운 산출 중...</p>;
                  })()}
                </div>
              )}
              {annualLuck && (
                <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    {new Date().getFullYear()}년 세운
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl border text-center ${ELEMENT_BG[annualLuck.stemElement] || "bg-zinc-800/30 border-zinc-700/50"}`}>
                      <div className={`text-xl font-bold ${ELEMENT_COLORS[annualLuck.stemElement] || "text-zinc-300"}`}>{annualLuck.stem}{annualLuck.branch}</div>
                      <div className="text-[10px] text-zinc-500">{annualLuck.stemElement} · {annualLuck.branchElement}</div>
                    </div>
                    <div className="text-xs text-zinc-400">
                      <p>올해의 흐름을 지배하는 기운</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ═══════════════════════════════════════════════ */}
          {/* 십신 (Ten Gods) */}
          {/* ═══════════════════════════════════════════════ */}
          {tenGods && (
            <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Target className="w-4 h-4 text-purple-400" />
                십신 (十神) 분석
              </h2>
              <div className="grid grid-cols-4 gap-3 text-center text-xs">
                {(["year", "month", "day", "hour"] as const).map((p) => {
                  const label = p === "year" ? "년주" : p === "month" ? "월주" : p === "day" ? "일주" : "시주";
                  const stemKey = p + "Stem";
                  const branchKey = p + "Branch";
                  return (
                    <div key={p} className="space-y-1">
                      <span className="text-[10px] text-zinc-500 font-semibold">{label}</span>
                      <div className="p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                        <span className="text-indigo-300 font-medium">{tenGods[stemKey]}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
                        <span className="text-purple-300 font-medium">{tenGods[branchKey]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 합충형파해 + 신살 */}
          {(interactions.length > 0 || divineKillers.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {interactions.length > 0 && (
                <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    합충형파해 ({interactions.length}건)
                  </h3>
                  <div className="space-y-2">
                    {interactions.slice(0, 8).map((inter: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          inter.type.includes("합") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          inter.type.includes("충") ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                          "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {inter.type}
                        </span>
                        <span className="text-zinc-400">{inter.description || `${inter.involved?.join(" · ")}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {divineKillers.length > 0 && (
                <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    신살 ({divineKillers.length}건)
                  </h3>
                  <div className="space-y-2">
                    {divineKillers.map((dk: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          dk.name.includes("귀인") ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                          "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {dk.name}
                        </span>
                        <span className="text-zinc-400">{dk.description || `${dk.position} ${dk.branch}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* LLM 분석 결과 (비동기) */}
          {/* ═══════════════════════════════════════════════ */}
          {llmLoading && (
            <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md text-center space-y-4">
              <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-zinc-400">AI가 오늘의 운영 지침을 분석하고 있습니다...</p>
            </div>
          )}

          {forecast && (
            <>
              {/* 안전선 알림 */}
              {forecast.boundaryNotes && forecast.boundaryNotes.length > 0 && (
                <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-900/30 flex items-start gap-4">
                  <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-amber-200 text-sm">안전선 준수 알림</h4>
                    <ul className="list-disc pl-4 text-xs text-amber-300/85 leading-relaxed space-y-1">
                      {forecast.boundaryNotes.map((note: string, idx: number) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* 총운 요약 + 등급 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
                  <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400">오늘의 총운</span>
                  <p className="text-lg sm:text-xl font-bold leading-relaxed text-zinc-100">
                    &ldquo;{forecast.summary}&rdquo;
                  </p>
                  <div className="flex items-center gap-4 text-xs text-zinc-400 pt-4 border-t border-zinc-800/50">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span>컨셉: <strong>{forecast.conceptState || "consolidation"}</strong></span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                    <div>일간: <strong>{dm.stem}({dm.element})</strong></div>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md flex flex-col justify-between text-center relative overflow-hidden group hover:border-indigo-500/20 transition-all">
                  <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-2xl group-hover:bg-indigo-500/10 transition-all" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400">추천 등급</span>
                  <div className="text-6xl font-extrabold bg-gradient-to-br from-indigo-300 via-purple-400 to-pink-400 bg-clip-text text-transparent py-4">
                    {forecast.grade || "A"}
                  </div>
                  <div className="text-xs text-zinc-400">사주 구조 × 바이브 상태 종합 등급</div>
                </div>
              </div>

              {/* 행동 지침 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6">
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" /> 필수 행동 (Do)
                  </h3>
                  <ul className="space-y-4">
                    {forecast.requiredActions?.map((action: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">{idx + 1}</span>
                        <span className="text-sm text-zinc-300 leading-relaxed font-medium">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6">
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-400" /> 금지 행동 (Don't)
                  </h3>
                  <ul className="space-y-4">
                    {forecast.forbiddenActions?.map((action: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">!</span>
                        <span className="text-sm text-zinc-300 leading-relaxed font-medium">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 세부 해설 */}
              <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" /> 세부 분석
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      <strong className="text-zinc-200">개념 분석:</strong> {forecast.conceptStateDescription}
                    </p>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      <strong className="text-zinc-200">행동 조율:</strong> {forecast.actionPolicyExplanation}
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 block">보류 사항</span>
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
            </>
          )}

          {/* 면책 조항 */}
          <div className="text-center pt-4">
            <p className="text-xs text-zinc-600">
              최종 판단과 행동의 책임은 사용자 자신에게 있습니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
