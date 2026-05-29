"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { TrendingUp, Target, AlertTriangle, Sparkles, ArrowUpRight, ArrowDownRight, Minus, ShieldAlert, Lightbulb, RefreshCw } from "lucide-react";

export default function WeeklyPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/forecast/weekly");
        if (res.ok) {
          setData(await res.json());
        } else {
          const cached = localStorage.getItem("weekly-forecast-cache");
          if (cached) setData(JSON.parse(cached));
          else setError("주간 분석 데이터를 불러올 수 없습니다.");
        }
      } catch {
        const cached = localStorage.getItem("weekly-forecast-cache");
        if (cached) setData(JSON.parse(cached));
        else setError("서버 연결에 실패했습니다. 나중에 다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const mockData = data || {
    conclusion: "이번 주는 확장보다는 정리와 점검에 적합한 주간입니다. 충동적 결정을 유보하고, 기존 프로젝트의 완결도를 높이는 데 집중하세요.",
    coreConcept: { name: "정리", state: "consolidation", confidence: 0.82 },
    gapAnalysis: "근거(Evidence) 확보 수준이 낮습니다. 데이터 기반 의사결정을 강화하세요.",
    targets: {
      evidence: ["고객 피드백 3건 이상 수집", "경쟁사 분석 리포트 업데이트"],
      boundary: ["과도한 야근 주의", "SNS 노출 최소화"],
      conversion: ["리드 2건 → 미팅 전환", "제안서 1건 발송"],
    },
    riskTrajectory: [
      { day: "월", level: "low" },
      { day: "화", level: "medium" },
      { day: "수", level: "medium" },
      { day: "목", level: "high" },
      { day: "금", level: "medium" },
      { day: "토", level: "low" },
      { day: "일", level: "low" },
    ],
    actionPolicy: {
      required: ["기존 프로젝트 마감 우선", "데이터 백업 및 정리"],
      forbidden: ["신규 대규모 투자 결정", "감정적 대응 (특히 목요일)"],
    },
    reflection: "지난 주 보류했던 의사결정 중, 이번 주에 처리할 수 있는 것은 무엇인가요?",
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-x-hidden font-sans">
      <Navbar />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-glow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-glow pointer-events-none" />

      <div className="max-w-4xl mx-auto w-full px-6 py-12 relative z-10 flex-1">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
            주간 운영 리뷰
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

          {/* Core Concept */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              핵심 컨셉 상태
            </h3>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-indigo-400">{mockData.coreConcept.name}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-indigo-950/30 border border-indigo-900/30 text-indigo-400">
                {mockData.coreConcept.state}
              </span>
              <span className="text-xs text-zinc-500">신뢰도 {Math.round(mockData.coreConcept.confidence * 100)}%</span>
            </div>
          </div>

          {/* Gap Analysis */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              갭 분석
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{mockData.gapAnalysis}</p>
          </div>

          {/* Targets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-2xl bg-zinc-900/20 border border-zinc-800 space-y-3">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">근거 확보 목표</h4>
              <ul className="space-y-2">
                {mockData.targets.evidence.map((t: string, i: number) => (
                  <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-zinc-900/20 border border-zinc-800 space-y-3">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">경계선 목표</h4>
              <ul className="space-y-2">
                {mockData.targets.boundary.map((t: string, i: number) => (
                  <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-zinc-900/20 border border-zinc-800 space-y-3">
              <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">전환 목표</h4>
              <ul className="space-y-2">
                {mockData.targets.conversion.map((t: string, i: number) => (
                  <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Risk Trajectory */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rose-400" />
              주간 리스크 궤적
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {mockData.riskTrajectory.map((d: any, i: number) => (
                <div key={i} className="text-center space-y-2">
                  <span className="text-xs text-zinc-500 font-medium">{d.day}</span>
                  <div className={`mx-auto w-8 h-8 rounded-lg flex items-center justify-center ${
                    d.level === "high" ? "bg-rose-500/20 text-rose-400" :
                    d.level === "medium" ? "bg-amber-500/20 text-amber-400" :
                    "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    {d.level === "high" ? <ArrowUpRight className="w-4 h-4" /> :
                     d.level === "medium" ? <Minus className="w-4 h-4" /> :
                     <ArrowDownRight className="w-4 h-4" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reflection */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              성찰 질문
            </h3>
            <p className="text-sm text-zinc-400 italic leading-relaxed">&ldquo;{mockData.reflection}&rdquo;</p>
          </div>
        </div>
      </div>
    </div>
  );
}
