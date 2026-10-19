"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import {
  Sparkles,
  Heart,
  Flame,
  Brain,
  AlertTriangle,
  TrendingUp,
  Moon,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Zap,
} from "lucide-react";
import { calculateChart } from "@/lib/manse";
import FortuneLoadingScreen from "@/components/FortuneLoadingScreen";

interface VibePreset {
  id: string;
  label: string;
  desc: string;
  valence: number;
  arousal: number;
  energy: number;
  focus: number;
  socialLoad: number;
  sleepHours: number;
}

const VIBE_PRESETS: VibePreset[] = [
  {
    id: "flow",
    label: "🔥 몰입·최상",
    desc: "에너지·집중 최상",
    valence: 8,
    arousal: 6,
    energy: 8,
    focus: 9,
    socialLoad: 3,
    sleepHours: 7.5,
  },
  {
    id: "calm",
    label: "🌿 평온·균형",
    desc: "안정적 리듬",
    valence: 7,
    arousal: 4,
    energy: 7,
    focus: 7,
    socialLoad: 4,
    sleepHours: 7.5,
  },
  {
    id: "pressure",
    label: "⚡ 긴장·압박",
    desc: "마감·일정 압박",
    valence: 4,
    arousal: 8,
    energy: 5,
    focus: 6,
    socialLoad: 7,
    sleepHours: 6,
  },
  {
    id: "burnout",
    label: "🪫 방전·번아웃",
    desc: "회복·수면 시급",
    valence: 3,
    arousal: 3,
    energy: 2,
    focus: 3,
    socialLoad: 7,
    sleepHours: 5,
  },
  {
    id: "social_fatigue",
    label: "🤝 관계·소통 피로",
    desc: "대인 부하 과다",
    valence: 4,
    arousal: 6,
    energy: 4,
    focus: 4,
    socialLoad: 9,
    sleepHours: 6.5,
  },
];

const CONTEXT_PROMPT_CHIPS = [
  "중요한 계약·협상 미팅 앞두고 있음",
  "할 일은 많은데 체력·수면이 부족함",
  "핵심 문서·연구 초안에 깊이 몰입하고 싶음",
  "관계 소통에서 감정 소모를 줄이고 싶음",
];

export default function DailyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [valence, setValence] = useState(5);
  const [arousal, setArousal] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [focus, setFocus] = useState(5);
  const [socialLoad, setSocialLoad] = useState(5);
  const [sleepHours, setSleepHours] = useState(7);
  const [oneLineEvent, setOneLineEvent] = useState("");
  const [selectedFocuses, setSelectedFocuses] = useState<string[]>(["business_finance"]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [hasPreviousVibe, setHasPreviousVibe] = useState(false);
  const [recentForecastId, setRecentForecastId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user-birth-profile");
    if (!stored) {
      router.push("/app/onboarding");
      return;
    }
    setProfile(JSON.parse(stored));

    try {
      const lastReq = localStorage.getItem("last-forecast-request");
      if (lastReq) {
        const parsed = JSON.parse(lastReq);
        if (parsed?.id) setRecentForecastId(parsed.id);
      }
      const lastVibe = localStorage.getItem("last-vibe-checkin");
      if (lastVibe) {
        setHasPreviousVibe(true);
      }
    } catch {
      // ignore
    }
  }, [router]);

  const applyVibePreset = (preset: VibePreset) => {
    setValence(preset.valence);
    setArousal(preset.arousal);
    setEnergy(preset.energy);
    setFocus(preset.focus);
    setSocialLoad(preset.socialLoad);
    setSleepHours(preset.sleepHours);
    setActivePresetId(preset.id);
  };

  const restoreLastVibe = () => {
    try {
      const raw = localStorage.getItem("last-vibe-checkin");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.valence === "number") setValence(parsed.valence);
      if (typeof parsed.arousal === "number") setArousal(parsed.arousal);
      if (typeof parsed.energy === "number") setEnergy(parsed.energy);
      if (typeof parsed.focus === "number") setFocus(parsed.focus);
      if (typeof parsed.socialLoad === "number") setSocialLoad(parsed.socialLoad);
      if (typeof parsed.sleepHours === "number") setSleepHours(parsed.sleepHours);
      if (typeof parsed.oneLineEvent === "string") setOneLineEvent(parsed.oneLineEvent);
      if (Array.isArray(parsed.currentFocus) && parsed.currentFocus.length > 0) {
        setSelectedFocuses(parsed.currentFocus);
      }
      setActivePresetId("restored");
    } catch {
      // ignore
    }
  };

  const toggleFocusDomain = (domainValue: string) => {
    setSelectedFocuses((prev) => {
      if (prev.includes(domainValue)) {
        // Keep at least 1 selected domain
        if (prev.length <= 1) return prev;
        return prev.filter((d) => d !== domainValue);
      } else {
        // Up to 3 domains
        if (prev.length >= 3) {
          return [...prev.slice(1), domainValue];
        }
        return [...prev, domainValue];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const activeFocuses = selectedFocuses.length > 0 ? selectedFocuses : ["business_finance"];

      const vibeCheckIn = {
        valence,
        arousal,
        energy,
        focus,
        socialLoad,
        sleepHours,
        oneLineEvent,
        currentFocus: activeFocuses,
        timestamp: new Date().toISOString(),
      };

      // Call POST /api/vibe-checkin (non-blocking / graceful fallback if 401 in local guest mode)
      let vibeCheckInId: string | undefined = undefined;
      try {
        const res = await fetch("/api/vibe-checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            valence,
            arousal,
            energy,
            focus,
            socialLoad,
            sleepHours,
            oneLineEvent: oneLineEvent.trim() || undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          vibeCheckInId = data.vibeCheckIn?.id;
        }
      } catch {
        // Ignore network/guest errors and proceed with localStorage
      }

      // Try to get chart from stored chart first, then calculate
      let chartResult;
      const storedChart = localStorage.getItem("user-manse-chart");
      if (storedChart) {
        chartResult = JSON.parse(storedChart);
      } else if (profile?.chartResult) {
        chartResult = profile.chartResult;
      } else {
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
        id: requestId,
        type: "daily",
        birthProfile: profile,
        chartResult,
        vibeCheckIn,
        vibeCheckInId,
        sleepHours,
        currentFocus: activeFocuses,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem("last-forecast-request", JSON.stringify(forecastRequest));
      localStorage.setItem("last-vibe-checkin", JSON.stringify(vibeCheckIn));
      localStorage.setItem("user-manse-chart", JSON.stringify(chartResult));

      // Save to vibe history for trend tracking
      const vibeEntry = {
        energy,
        valence,
        arousal,
        focus,
        socialLoad,
        sleepHours,
        date: new Date().toISOString(),
      };
      const vibeHistory = JSON.parse(localStorage.getItem("vibe-history") || "[]");
      vibeHistory.push(vibeEntry);
      localStorage.setItem("vibe-history", JSON.stringify(vibeHistory));

      router.push(`/app/result/${requestId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "분석 요청 중 오류가 발생했습니다.";
      setError(message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  const focusDomains = [
    { value: "business_finance", label: "비즈니스 & 금융", icon: Flame, color: "text-amber-400" },
    { value: "relationship_love", label: "인간관계 & 연애", icon: Heart, color: "text-rose-400" },
    { value: "health_recovery", label: "건강 & 에너지 회복", icon: TrendingUp, color: "text-emerald-400" },
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
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-x-hidden font-sans pb-20 md:pb-0">
      <Navbar />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-glow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-glow pointer-events-none" />

      <div className="max-w-2xl mx-auto w-full px-6 py-10 relative z-10 flex-1">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
            오늘, 당신의 바이브는 어떤가요?
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-lg mx-auto">
            {profile?.name || "사용자"}님의 현재 몸과 마음 상태를 기록해 주시면, 사주 구조(Prior)와 결합하여 맞춤형 행동 정책을 산출합니다.
          </p>
        </div>

        {/* RecentRunReceiptNudge */}
        {recentForecastId && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-950/20 border border-indigo-800/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-xs text-zinc-300">
                이전 운영 보드의 실행 결과를 기록하셨나요? Run-Receipt를 남기면 조언이 더 정교해집니다.
              </span>
            </div>
            <Link
              href={`/app/run-receipt/${recentForecastId}`}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 shrink-0 flex items-center gap-1"
            >
              기록하기 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {error && (
          <div role="alert" className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-xs text-red-400 text-center mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 1-Tap Vibe Preset Bar */}
          <div className="p-6 rounded-3xl bg-zinc-900/40 border border-indigo-500/20 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                  1-Tap 빠른 상태 프리셋 (슬라이더 자동 세팅)
                </span>
              </div>
              {hasPreviousVibe && (
                <button
                  type="button"
                  onClick={restoreLastVibe}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-indigo-300 border border-zinc-700 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  최근 바이브 불러오기
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {VIBE_PRESETS.map((preset) => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyVibePreset(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-indigo-500/15 border-indigo-500/50 text-indigo-200 ring-1 ring-indigo-500/30"
                        : "bg-zinc-950/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{preset.label}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 truncate">{preset.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                실시간 상태 진단 (Vibe Check-in)
              </h2>
              <span className="text-[11px] text-zinc-500">세부 조정이 필요할 때만 슬라이더를 움직이세요</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">정서가 (Valence)</span>
                <span className="text-xs text-indigo-400 font-mono">{valence} / 10</span>
              </div>
              <Slider
                min={0}
                max={10}
                value={[valence]}
                onValueChange={(val: number | readonly number[]) => {
                  setValence(Array.isArray(val) ? val[0] : val);
                  setActivePresetId(null);
                }}
                aria-label="정서가"
              />
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>매우 침울 / 저하</span>
                <span>매우 행복 / 긍정</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">각성도 (Arousal)</span>
                <span className="text-xs text-indigo-400 font-mono">{arousal} / 10</span>
              </div>
              <Slider
                min={0}
                max={10}
                value={[arousal]}
                onValueChange={(val: number | readonly number[]) => {
                  setArousal(Array.isArray(val) ? val[0] : val);
                  setActivePresetId(null);
                }}
                aria-label="각성도"
              />
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>이완 / 졸림</span>
                <span>매우 긴장 / 각성</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">활력 (Energy)</span>
                <span className="text-xs text-indigo-400 font-mono">{energy} / 10</span>
              </div>
              <Slider
                min={0}
                max={10}
                value={[energy]}
                onValueChange={(val: number | readonly number[]) => {
                  setEnergy(Array.isArray(val) ? val[0] : val);
                  setActivePresetId(null);
                }}
                aria-label="활력"
              />
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
              <Slider
                min={0}
                max={10}
                value={[focus]}
                onValueChange={(val: number | readonly number[]) => {
                  setFocus(Array.isArray(val) ? val[0] : val);
                  setActivePresetId(null);
                }}
                aria-label="집중력"
              />
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
              <Slider
                min={0}
                max={10}
                value={[socialLoad]}
                onValueChange={(val: number | readonly number[]) => {
                  setSocialLoad(Array.isArray(val) ? val[0] : val);
                  setActivePresetId(null);
                }}
                aria-label="관계 부하"
              />
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>여유로움 / 독립적</span>
                <span>대인 피로도 높음</span>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-zinc-800/60">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-sky-400" />
                  어젯밤 수면 시간 (Sleep Hours)
                </span>
                <span className="text-xs text-sky-400 font-mono">{sleepHours}시간</span>
              </div>
              <Slider
                min={0}
                max={12}
                step={0.5}
                value={[sleepHours]}
                onValueChange={(val: number | readonly number[]) => {
                  setSleepHours(Array.isArray(val) ? val[0] : val);
                  setActivePresetId(null);
                }}
                aria-label="수면 시간"
              />
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>0시간 (철야/수면 부족)</span>
                <span>7~8시간 (적정)</span>
                <span>12시간+</span>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                중점적으로 조율할 영역을 선택하세요 (복수 가능, 최대 3개)
              </h2>
              <span className="text-xs text-indigo-400 font-mono">{selectedFocuses.length} / 3 선택됨</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {focusDomains.map((domain) => {
                const Icon = domain.icon;
                const isSelected = selectedFocuses.includes(domain.value);
                return (
                  <button
                    key={domain.value}
                    type="button"
                    onClick={() => toggleFocusDomain(domain.value)}
                    aria-pressed={isSelected}
                    className={`p-4 rounded-xl text-left transition-all border ${
                      isSelected
                        ? "bg-zinc-800/60 border-indigo-500/50 ring-1 ring-indigo-500/20"
                        : "bg-zinc-900/30 border-zinc-800/50 hover:border-zinc-700"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${domain.color} mb-2`} />
                    <span className="text-xs font-medium text-zinc-300 block">{domain.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <label htmlFor="oneLineEvent" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              오늘의 주요 이벤트 / 핵심 맥락 (선택)
            </label>
            <input
              id="oneLineEvent"
              type="text"
              value={oneLineEvent}
              onChange={(e) => setOneLineEvent(e.target.value)}
              placeholder="예: 중요한 계약 협상 예정, 프로젝트 마감일"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
            />
            <div className="flex flex-wrap gap-1.5">
              {CONTEXT_PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setOneLineEvent(chip)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    oneLineEvent === chip
                      ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium py-4 rounded-xl shadow-lg shadow-indigo-500/10 border-0 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? "운영 보드 연산 중..." : "오늘의 자기운영 보드 산출"}
          </Button>
        </form>
      </div>
    </div>
  );
}
