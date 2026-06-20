"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Sparkles, Heart, Flame, Brain, AlertTriangle, TrendingUp } from "lucide-react";
import { calculateChart } from "@/lib/manse";
import FortuneLoadingScreen from "@/components/FortuneLoadingScreen";

export default function DailyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [valence, setValence] = useState(5);
  const [arousal, setArousal] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [focus, setFocus] = useState(5);
  const [socialLoad, setSocialLoad] = useState(5);
  const [oneLineEvent, setOneLineEvent] = useState("");
  const [currentFocus, setCurrentFocus] = useState("business_finance");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user-birth-profile");
    if (!stored) {
      router.push("/app/onboarding");
      return;
    }
    setProfile(JSON.parse(stored));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const vibeCheckIn = {
        valence, arousal, energy, focus, socialLoad,
        oneLineEvent, currentFocus,
        timestamp: new Date().toISOString(),
      };

      // Try to get chart from stored chart first, then calculate
      let chartResult;
      const storedChart = localStorage.getItem("user-manse-chart");
      if (storedChart) {
        chartResult = JSON.parse(storedChart);
      } else if (profile?.chartResult) {
        chartResult = profile.chartResult;
      } else {
        // Calculate from birth profile — handle both data formats
        // Onboarding stores `birthDateTime` (full ISO string)
        // Fallback: try `birthDate` + `birthTime` (legacy format)
        let birthDateTimeStr = profile?.birthDateTime;
        if (!birthDateTimeStr) {
          const bd = profile?.birthDate || "1990-01-01";
          const bt = profile?.birthTime || "12:00";
          birthDateTimeStr = `${bd}T${bt}:00`;
        }
        chartResult = calculateChart({
          birthDateTime: birthDateTimeStr,
          timezone: profile?.timezone || "Asia/Seoul",
          gender: profile?.gender || "male",
        });
      }

      const requestId = `daily-${Date.now()}`;
      const forecastRequest = {
        id: requestId, type: "daily",
        birthProfile: profile, chartResult, vibeCheckIn,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem("last-forecast-request", JSON.stringify(forecastRequest));
      localStorage.setItem("last-vibe-checkin", JSON.stringify(vibeCheckIn));
      localStorage.setItem("user-manse-chart", JSON.stringify(chartResult));

      // Save to vibe history for trend tracking
      const vibeEntry = { energy, valence, arousal, focus, socialLoad, date: new Date().toISOString() };
      const vibeHistory = JSON.parse(localStorage.getItem("vibe-history") || "[]");
      vibeHistory.push(vibeEntry);
      localStorage.setItem("vibe-history", JSON.stringify(vibeHistory));

      router.push(`/app/result/${requestId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "분석 요청 중 오류가 발생했습니다.";
      setError(message);
      // Scroll to top so user can see the error
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  const focusDomains = [
    { value: "business_finance", label: "비즈니스 & 금융", icon: Flame, color: "text-amber-400" },
    { value: "relationship_love", label: "인간관계 & 연애", icon: Heart, color: "text-rose-400" },
    { value: "health_energy", label: "건강 & 에너지", icon: TrendingUp, color: "text-emerald-400" },
    { value: "learning_writing_research", label: "학습 & 연구 & 집필", icon: Brain, color: "text-sky-400" },
    { value: "reputation_branding", label: "명성 & 퍼스널 브랜딩", icon: Sparkles, color: "text-purple-400" },
    { value: "risk_legal_safety", label: "위험 관리 & 법률", icon: AlertTriangle, color: "text-orange-400" },
  ];

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">
        <FortuneLoadingScreen stage="chart" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-x-hidden font-sans">
      <Navbar />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-glow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-glow pointer-events-none" />

      <div className="max-w-2xl mx-auto w-full px-6 py-12 relative z-10 flex-1">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
            오늘, 당신의 바이브는 어떤가요?
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-lg mx-auto">
            {profile?.name || "사용자"}님의 현재 몸과 마음 상태를 기록해 주시면, 사주 구조(Prior)와 결합하여 맞춤형 처방을 산출합니다.
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-xs text-red-400 text-center mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              실시간 상태 진단
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">정서가 (Valence)</span>
                <span className="text-xs text-indigo-400 font-mono">{valence} / 10</span>
              </div>
              <Slider min={0} max={10} value={[valence]} onValueChange={(val: number | readonly number[]) => setValence(Array.isArray(val) ? val[0] : val)} aria-label="정서가" />
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>매우 침울 / 절망</span>
                <span>매우 행복 / 긍정</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">각성도 (Arousal)</span>
                <span className="text-xs text-indigo-400 font-mono">{arousal} / 10</span>
              </div>
              <Slider min={0} max={10} value={[arousal]} onValueChange={(val: number | readonly number[]) => setArousal(Array.isArray(val) ? val[0] : val)} aria-label="각성도" />
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>무기력 / 졸림</span>
                <span>매우 긴장 / 흥분</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">활력 (Energy)</span>
                <span className="text-xs text-indigo-400 font-mono">{energy} / 10</span>
              </div>
              <Slider min={0} max={10} value={[energy]} onValueChange={(val: number | readonly number[]) => setEnergy(Array.isArray(val) ? val[0] : val)} aria-label="활력" />
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>방전됨 / 극심한 피로</span>
                <span>에너지 넘침</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">집중력 (Focus)</span>
                <span className="text-xs text-indigo-400 font-mono">{focus} / 10</span>
              </div>
              <Slider min={0} max={10} value={[focus]} onValueChange={(val: number | readonly number[]) => setFocus(Array.isArray(val) ? val[0] : val)} aria-label="집중력" />
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>산만함 / 브레인 포그</span>
                <span>고도의 몰입 상태</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">관계 부하 (Social Load)</span>
                <span className="text-xs text-indigo-400 font-mono">{socialLoad} / 10</span>
              </div>
              <Slider min={0} max={10} value={[socialLoad]} onValueChange={(val: number | readonly number[]) => setSocialLoad(Array.isArray(val) ? val[0] : val)} aria-label="관계 부하" />
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>혼자 있고 싶음</span>
                <span>적극적 소통 가능</span>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              운영 보드 집중 분야
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {focusDomains.map((domain) => {
                const Icon = domain.icon;
                const isSelected = currentFocus === domain.value;
                return (
                  <button key={domain.value} type="button" onClick={() => setCurrentFocus(domain.value)} aria-pressed={isSelected}
                    className={`p-4 rounded-xl text-left transition-all border ${isSelected ? "bg-zinc-800/60 border-indigo-500/50 ring-1 ring-indigo-500/20" : "bg-zinc-900/30 border-zinc-800/50 hover:border-zinc-700"}`}>
                    <Icon className={`w-5 h-5 ${domain.color} mb-2`} />
                    <span className="text-xs font-medium text-zinc-300 block">{domain.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="oneLineEvent" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              오늘의 주요 이벤트 / 핵심 맥락 (선택)
            </label>
            <input id="oneLineEvent" type="text" value={oneLineEvent} onChange={(e) => setOneLineEvent(e.target.value)}
              placeholder="예: 중요한 거래 봉투 협상 예정, 파트너와 다툼이 있었다"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600" />
          </div>

          <Button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium py-4 rounded-xl shadow-lg shadow-indigo-500/10 border-0 transition-transform active:scale-[0.98] flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            {loading ? "운영 보드 연산 중..." : "오늘의 자기운영 보드 산출"}
          </Button>
        </form>
      </div>
    </div>
  );
}
