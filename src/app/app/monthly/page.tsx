"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { TrendingUp, Shield, Sparkles, AlertTriangle, Calendar, Target, BarChart3, Lightbulb } from "lucide-react";

export default function MonthlyPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const month = new Date().toISOString().substring(0, 7);

        const res = await fetch("/api/forecast/monthly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ month }),
        });

        if (res.ok) {
          const apiData = await res.json();
          if (apiData.forecastOutput) {
            const fo = apiData.forecastOutput;
            const mapped = {
              conclusion: fo.oneLineConclusion || fo.conclusion || "",
              conceptPortfolio: (fo.monthlyConceptPortfolio || []).map((c: string, i: number) => ({
                name: c.split("(")[0]?.trim() || c,
                weight: i === 0 ? 0.4 : 0.3,
                state: c.toLowerCase().includes("consolidation") ? "consolidation" : c.toLowerCase().includes("expansion") ? "expansion" : "cleanup",
              })),
              riskPortfolio: (fo.monthlyRiskPortfolio || []).map((r: string) => ({
                domain: r.split(" ")[0] || "일반",
                level: "medium",
                note: r,
              })),
              threePillars: {
                revenue: { score: 65, advice: (fo.revenuePolicy || [])[0] || "기존 매출원 최적화" },
                relationship: { score: 55, advice: (fo.relationshipPolicy || [])[0] || "핵심 관계에 집중" },
                recovery: { score: 75, advice: (fo.recoveryPolicy || [])[0] || "규칙적 운동과 수면" },
              },
              actionCalendar: (fo.monthlyActionCalendar || []).map((w: any) => ({
                week: w.week,
                focus: w.recommendedFocus || "",
              })),
            };
            localStorage.setItem("monthly-forecast-cache", JSON.stringify(mapped));
            setData(mapped);
          } else {
            generateLocalMonthly();
          }
        } else {
          generateLocalMonthly();
        }
      } catch {
        generateLocalMonthly();
      } finally {
        setLoading(false);
      }
    };

    const generateLocalMonthly = () => {
      const cached = localStorage.getItem("monthly-forecast-cache");
      if (cached) {
        setData(JSON.parse(cached));
        return;
      }

      // Use stored chart for personalized data
      const storedChart = localStorage.getItem("user-manse-chart");
      let dmElement = "토";
      if (storedChart) {
        try { dmElement = JSON.parse(storedChart).dayMaster?.element || "토"; } catch { /* */ }
      }
      const elementMap: Record<string, string> = { "木": "목성(木)", "火": "화성(火)", "土": "토성(土)", "金": "금성(金)", "水": "수성(水)", "목": "목성(木)", "화": "화성(火)", "토": "토성(土)", "금": "금성(金)", "수": "수성(水)" };

      const monthlyData = {
        conclusion: `이번 달은 ${elementMap[dmElement] || "토성(土)"}의 영향으로 내면 탐색과 전략 수립에 적합합니다. 대외적 확장보다 내실 다지기에 집중하세요.`,
        conceptPortfolio: [
          { name: "재정비", weight: 0.4, state: "cleanup" },
          { name: "학습", weight: 0.3, state: "expansion" },
          { name: "관계정리", weight: 0.3, state: "consolidation" },
        ],
        riskPortfolio: [
          { domain: "재무", level: "medium", note: "불필요한 지출 모니터링 필요" },
          { domain: "건강", level: "low", note: "수면 패턴 안정적" },
          { domain: "관계", level: "high", note: "핵심 관계 재정립 시점" },
        ],
        threePillars: {
          revenue: { score: 65, advice: "보수적 운영, 기존 매출원 최적화" },
          relationship: { score: 45, advice: "핵심 인맥 3인에 집중, 확장 자제" },
          recovery: { score: 80, advice: "규칙적 수면과 주 2회 운동 유지" },
        },
        actionCalendar: [
          { week: "1주차", focus: "현황 진단 및 데이터 수집" },
          { week: "2주차", focus: "핵심 프로젝트 정리 및 우선순위 재설정" },
          { week: "3주차", focus: "관계 재정립 미팅 및 소통" },
          { week: "4주차", focus: "월간 회고 및 다음 달 전략 수립" },
        ],
      };
      localStorage.setItem("monthly-forecast-cache", JSON.stringify(monthlyData));
      setData(monthlyData);
    };

    fetchData();
  }, []);

  const mockData = data || {
    conclusion: "",
    conceptPortfolio: [],
    riskPortfolio: [],
    threePillars: {
      revenue: { score: 0, advice: "" },
      relationship: { score: 0, advice: "" },
      recovery: { score: 0, advice: "" },
    },
    actionCalendar: [],
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-x-hidden font-sans">
      <Navbar />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-glow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-glow pointer-events-none" />

      <div className="max-w-4xl mx-auto w-full px-6 py-12 relative z-10 flex-1">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
            월간 분석 포트폴리오
          </h1>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-xs text-red-400 text-center mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Conclusion */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md">
            <p className="text-lg text-zinc-200 leading-relaxed font-medium">{mockData.conclusion}</p>
          </div>

          {/* Concept Portfolio */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              컨셉 포트폴리오
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mockData.conceptPortfolio.map((c: any, i: number) => (
                <div key={i} className="p-6 rounded-2xl bg-zinc-900/20 border border-zinc-800 hover:border-indigo-500/10 transition-all space-y-2">
                  <span className="text-lg font-bold text-indigo-400">{c.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${c.weight * 100}%` }} />
                    </div>
                    <span className="text-xs text-zinc-500">{Math.round(c.weight * 100)}%</span>
                  </div>
                  <span className="text-xs text-zinc-500">{c.state}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Portfolio */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              리스크 포트폴리오
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mockData.riskPortfolio.map((r: any, i: number) => (
                <div key={i} className="p-6 rounded-2xl bg-zinc-900/20 border border-zinc-800 hover:border-purple-500/10 transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-300">{r.domain}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.level === "high" ? "bg-rose-500/20 text-rose-400" :
                      r.level === "medium" ? "bg-amber-500/20 text-amber-400" :
                      "bg-emerald-500/20 text-emerald-400"
                    }`}>{r.level}</span>
                  </div>
                  <p className="text-xs text-zinc-500">{r.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Three Pillars */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              3대 영역 조율
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: "revenue", label: "수익", icon: TrendingUp, color: "text-emerald-400" },
                { key: "relationship", label: "관계", icon: Target, color: "text-purple-400" },
                { key: "recovery", label: "회복", icon: Shield, color: "text-sky-400" },
              ].map(({ key, label, icon: Icon, color }) => {
                const pillar = mockData.threePillars[key as keyof typeof mockData.threePillars];
                return (
                  <div key={key} className="p-6 rounded-2xl bg-zinc-900/20 border border-zinc-800 hover:border-pink-500/10 transition-all space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-sm font-semibold text-zinc-300">{label}</span>
                      <span className="text-xs text-zinc-500 ml-auto">{pillar.score}점</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pillar.score}%` }} />
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">{pillar.advice}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Calendar */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              행동 캘린더
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {mockData.actionCalendar.map((a: any, i: number) => (
                <div key={i} className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{a.week}</span>
                  <p className="text-xs text-zinc-400 leading-relaxed">{a.focus}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
