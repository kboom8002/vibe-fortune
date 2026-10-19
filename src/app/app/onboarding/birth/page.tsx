"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, AlertTriangle, CheckCircle2, ArrowRight, Clock, Play } from "lucide-react";
import { calculateChart, checkChartConsistency } from "@/lib/manse";

const PILLAR_LABELS: Record<string, string> = {
  year: "연주(年柱)",
  month: "월주(月柱)",
  day: "일주(日柱)",
  hour: "시주(時柱)",
};

const TWELVE_SI_PRESETS = [
  { label: "자시", sub: "23:30~01:29", time: "00:30" },
  { label: "축시", sub: "01:30~03:29", time: "02:00" },
  { label: "인시", sub: "03:30~05:29", time: "04:00" },
  { label: "묘시", sub: "05:30~07:29", time: "06:00" },
  { label: "진시", sub: "07:30~09:29", time: "08:00" },
  { label: "사시", sub: "09:30~11:29", time: "10:00" },
  { label: "오시", sub: "11:30~13:29", time: "12:00" },
  { label: "미시", sub: "13:30~15:29", time: "14:30" },
  { label: "신시", sub: "15:30~17:29", time: "16:00" },
  { label: "유시", sub: "17:30~19:29", time: "18:00" },
  { label: "술시", sub: "19:30~21:29", time: "20:00" },
  { label: "해시", sub: "21:30~23:29", time: "22:00" },
];

export default function BirthProfileSetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthTimeUnknown, setBirthTimeUnknown] = useState(false);
  const [birthLocation, setBirthLocation] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "unspecified">("male");
  const [timezone, setTimezone] = useState("Asia/Seoul");

  // Custom manual chart inputs
  const [showManualChart, setShowManualChart] = useState(false);
  const [providedChart, setProvidedChart] = useState({
    yearPillar: "",
    monthPillar: "",
    dayPillar: "",
    hourPillar: "",
  });

  // Chart consistency check state
  const [consistencyNotice, setConsistencyNotice] = useState<{
    status: "matched" | "mismatched" | "not_provided" | "calculation_failed";
    mismatchedFields?: ("year" | "month" | "day" | "hour")[];
    canonicalSource: "calculated" | "user_provided";
    note?: string;
    calculatedChart?: any;
  } | null>(null);
  const [selectedCanonicalSource, setSelectedCanonicalSource] = useState<"calculated" | "user_provided">("user_provided");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill existing profile if present
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user-birth-profile");
      if (stored) {
        const p = JSON.parse(stored);
        if (p.name) setName(p.name);
        if (p.birthDate) {
          setBirthDate(p.birthDate);
        } else if (p.birthDateTime) {
          setBirthDate(p.birthDateTime.slice(0, 10));
        }
        if (p.birthTime) {
          setBirthTime(p.birthTime);
        } else if (p.birthDateTime && p.birthDateTime.length >= 16) {
          setBirthTime(p.birthDateTime.slice(11, 16));
        }
        if (p.gender) setGender(p.gender);
        if (p.timezone) setTimezone(p.timezone);
        if (p.birthLocation) setBirthLocation(p.birthLocation);
        if (p.providedChart) {
          setShowManualChart(true);
          setProvidedChart({
            yearPillar: p.providedChart.yearPillar || "",
            monthPillar: p.providedChart.monthPillar || "",
            dayPillar: p.providedChart.dayPillar || "",
            hourPillar: p.providedChart.hourPillar || "",
          });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Live 4-Pillar Preview as user types birthDate / birthTime
  const livePreviewChart = useMemo(() => {
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
    try {
      const effectiveTime = birthTimeUnknown || !birthTime ? "12:00:00" : `${birthTime}:00`;
      const offsetStr = timezone === "UTC" ? "Z" : "+09:00";
      return calculateChart({
        birthDateTime: `${birthDate}T${effectiveTime}${offsetStr}`,
        timezone,
        gender,
      });
    } catch {
      return null;
    }
  }, [birthDate, birthTime, birthTimeUnknown, timezone, gender]);

  const handleFillSample = () => {
    setName("홍길동");
    setBirthDate("1990-05-01");
    setBirthTime("14:30");
    setBirthTimeUnknown(false);
    setGender("male");
    setTimezone("Asia/Seoul");
    setBirthLocation("서울");
  };

  const handleProceedWithSource = (source: "calculated" | "user_provided") => {
    try {
      const storedProfile = localStorage.getItem("user-birth-profile");
      const storedChart = localStorage.getItem("user-manse-chart");
      if (storedProfile && storedChart) {
        const profileObj = JSON.parse(storedProfile);
        const chartObj = JSON.parse(storedChart);
        if (chartObj.chartConsistency) {
          chartObj.chartConsistency.canonicalSource = source;
        }
        profileObj.canonicalSource = source;
        localStorage.setItem("user-birth-profile", JSON.stringify(profileObj));
        localStorage.setItem("user-manse-chart", JSON.stringify(chartObj));
      }
    } catch {
      // ignore storage errors
    }
    router.push("/app/daily");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setConsistencyNotice(null);

    try {
      if (!name || !birthDate) {
        throw new Error("이름과 생년월일은 필수 입력 항목입니다.");
      }

      const effectiveBirthTime = birthTimeUnknown ? "" : birthTime;
      const timeStr = effectiveBirthTime ? `${effectiveBirthTime}:00` : "12:00:00";
      const offsetStr = timezone === "UTC" ? "Z" : "+09:00";
      const birthDateTimeStr = `${birthDate}T${timeStr}${offsetStr}`;
      const birthDateTimeIso = new Date(birthDateTimeStr).toISOString();

      const hasManualChart =
        showManualChart &&
        Boolean(
          providedChart.yearPillar.trim() ||
          providedChart.monthPillar.trim() ||
          providedChart.dayPillar.trim() ||
          providedChart.hourPillar.trim()
        );

      const cleanProvidedChart = hasManualChart
        ? {
            yearPillar: providedChart.yearPillar.trim() || undefined,
            monthPillar: providedChart.monthPillar.trim() || undefined,
            dayPillar: providedChart.dayPillar.trim() || undefined,
            hourPillar: providedChart.hourPillar.trim() || undefined,
          }
        : undefined;

      // 1. Compute chart deterministically via local manse engine
      let computedChart = calculateChart({
        birthDateTime: birthDateTimeStr,
        timezone,
        gender,
      });

      if (!effectiveBirthTime && !computedChart.warnings.includes("BIRTH_TIME_MISSING")) {
        computedChart.warnings.push("BIRTH_TIME_MISSING");
      }

      // 2. Call POST /api/profile/birth (graceful fallback if 401/offline in guest mode)
      let savedProfile: any = {
        id: crypto.randomUUID(),
        userId: "local-user",
        name,
        birthDate,
        birthTime: effectiveBirthTime || undefined,
        birthDateTime: birthDateTimeStr,
        timezone,
        gender,
        birthLocation: birthLocation.trim() || undefined,
        providedChart: cleanProvidedChart,
        createdAt: new Date().toISOString(),
      };

      try {
        const res = await fetch("/api/profile/birth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            birthDateTime: birthDateTimeIso,
            timezone,
            gender,
            birthLocation: birthLocation.trim() || undefined,
            providedChart: cleanProvidedChart,
          }),
        });
        if (res.ok) {
          const apiData = await res.json();
          if (apiData.birthProfile) savedProfile = { ...savedProfile, ...apiData.birthProfile };
          if (apiData.chart) computedChart = apiData.chart;
        }
      } catch {
        // Fallback to local calculation in guest/offline mode
      }

      // 3. Check chart consistency when providedChart is entered
      const consistency = checkChartConsistency(computedChart, cleanProvidedChart);
      (computedChart as any).chartConsistency = consistency;

      // Save Birth Profile and Chart to localStorage
      localStorage.setItem("user-birth-profile", JSON.stringify(savedProfile));
      localStorage.setItem("user-manse-chart", JSON.stringify(computedChart));

      // If user provided chart and it mismatched, display ChartConsistencyNotice before redirecting
      if (hasManualChart && consistency.status === "mismatched") {
        setSelectedCanonicalSource(consistency.canonicalSource);
        setConsistencyNotice({
          ...consistency,
          calculatedChart: computedChart,
        });
        return;
      }

      // Redirect to Daily Loop!
      router.push("/app/daily");
    } catch (err: any) {
      setError(err.message || "프로필 설정 과정에서 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-hidden pb-20 md:pb-0">
      <Navbar />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-10">
        <div className="max-w-2xl w-full space-y-6 bg-zinc-900/40 border border-zinc-800/80 p-6 sm:p-8 rounded-3xl backdrop-blur-md relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-zinc-800 text-zinc-400">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  출생 프로필 설정
                </h2>
                <p className="text-xs text-zinc-400">
                  한국 표준(`standard_kr`) 절기법으로 사주 4주와 용신을 즉시 계산합니다.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFillSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/50 border border-indigo-800/50 text-indigo-300 hover:bg-indigo-900/50 text-xs font-medium transition-colors self-start sm:self-auto"
            >
              <Play className="w-3 h-3 fill-indigo-400" />
              <span>샘플 자동 채우기</span>
            </button>
          </div>

          {error && (
            <div role="alert" className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-xs text-red-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Live 4-Pillar Preview Card */}
          {livePreviewChart && (
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  실시간 만세력 4주 프리뷰
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-mono">
                  일간 {livePreviewChart.dayMaster.stem}({livePreviewChart.dayMaster.element}) · 용신 {livePreviewChart.dayMaster.yongSin || "water"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {(["year", "month", "day", "hour"] as const).map((key) => {
                  const p = livePreviewChart.pillars[key];
                  return (
                    <div key={key} className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                      <div className="text-[10px] text-zinc-500 mb-0.5">{PILLAR_LABELS[key]}</div>
                      <div className="text-base font-bold text-zinc-100">{p.label}</div>
                      <div className="text-[10px] text-indigo-400 mt-0.5">
                        {livePreviewChart.tenGods?.[`${key}Stem`] || "일간"} / {livePreviewChart.tenGods?.[`${key}Branch`] || ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ChartConsistencyNotice Alert Banner */}
          {consistencyNotice && consistencyNotice.status === "mismatched" && (
            <div
              role="alert"
              className="p-5 rounded-2xl bg-amber-950/30 border border-amber-800/60 space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-amber-200">
                    사주 명식 정합성 안내 (Chart Consistency Notice)
                  </h3>
                  <p className="text-xs text-amber-300/80 leading-relaxed">
                    입력하신 사주 기둥과 `standard_kr` 만세력 엔진 계산 결과 간에 차이가 발견되었습니다. 유파(절기 시각, 야자시, 진태양시 보정 여부)에 따라 차이가 발생할 수 있으며, 두 값을 모두 보존합니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs bg-zinc-950/70 p-3 rounded-xl border border-zinc-800">
                {(["year", "month", "day", "hour"] as const).map((p) => {
                  const isDiff = consistencyNotice.mismatchedFields?.includes(p);
                  const calcLabel = consistencyNotice.calculatedChart?.pillars?.[p]?.label || "—";
                  const userKey = `${p}Pillar` as keyof typeof providedChart;
                  const userLabel = providedChart[userKey]?.trim() || "(미입력)";
                  return (
                    <div
                      key={p}
                      className={`p-2 rounded-lg border ${
                        isDiff
                          ? "bg-amber-950/40 border-amber-700/60 text-amber-200"
                          : "bg-zinc-900/40 border-zinc-800/60 text-zinc-400"
                      }`}
                    >
                      <div className="text-[10px] font-semibold mb-1">{PILLAR_LABELS[p]}</div>
                      <div className="text-[11px] text-zinc-300">계산: <strong>{calcLabel}</strong></div>
                      <div className="text-[11px] text-indigo-300">입력: <strong>{userLabel}</strong></div>
                      {isDiff && <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">불일치</span>}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-amber-200">
                  코칭 기준 명식(Canonical Source) 선택
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCanonicalSource("user_provided")}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      selectedCanonicalSource === "user_provided"
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-200"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                      내가 입력한 명식 우선 사용 (권장)
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      보유하신 명식을 기준으로 해석하되 계산 차트도 함께 보존합니다.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCanonicalSource("calculated")}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      selectedCanonicalSource === "calculated"
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-200"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                      시스템 계산 명식(`standard_kr`) 우선 사용
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      결정론적 만세력 엔진 결과를 기준으로 해석합니다.
                    </p>
                  </button>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => handleProceedWithSource(selectedCanonicalSource)}
                className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <span>선택한 기준으로 일간 체크인 계속하기</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  이름 또는 닉네임 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  성별 (대운 순행/역행 산출용)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "male", label: "남성" },
                    { value: "female", label: "여성" },
                    { value: "unspecified", label: "선택안함" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setGender(option.value as any)}
                      className={`py-3 px-3 rounded-xl text-xs font-medium border transition-all ${
                        gender === option.value
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Birth Date & Birth Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  생년월일 (양력) <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    태어난 시간 (선택)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setBirthTimeUnknown(!birthTimeUnknown);
                      if (!birthTimeUnknown) setBirthTime("");
                    }}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                      birthTimeUnknown
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {birthTimeUnknown ? "✓ 시간 모름 (정오 기준)" : "시간 모름 선택"}
                  </button>
                </div>
                <input
                  type="time"
                  disabled={birthTimeUnknown}
                  value={birthTime}
                  onChange={(e) => {
                    setBirthTime(e.target.value);
                    setBirthTimeUnknown(false);
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            {/* 12-Si Quick-Select Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  12시진 빠른 선택 (대략적인 시간대만 아실 때 탭하세요)
                </span>
                {birthTimeUnknown && (
                  <span className="text-[11px] text-amber-400">
                    * 생시 미상 시 삼주(연·월·일주) 중심으로 분석됩니다
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {TWELVE_SI_PRESETS.map((si) => {
                  const isSelected = !birthTimeUnknown && birthTime === si.time;
                  return (
                    <button
                      key={si.label}
                      type="button"
                      onClick={() => {
                        setBirthTime(si.time);
                        setBirthTimeUnknown(false);
                      }}
                      className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                        isSelected
                          ? "bg-indigo-600/25 border-indigo-500 text-indigo-200"
                          : "bg-zinc-950/80 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      <div className="text-xs font-semibold">{si.label}</div>
                      <div className="text-[9px] text-zinc-500">{si.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location & Timezone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  출생 지역 (선택)
                </label>
                <input
                  type="text"
                  value={birthLocation}
                  onChange={(e) => setBirthLocation(e.target.value)}
                  placeholder="예: 서울, 부산"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  타임존 (Timezone)
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="Asia/Seoul">Asia/Seoul (KST, UTC+9)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST, UTC+9)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>

            {/* Manual Chart Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowManualChart(!showManualChart)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {showManualChart ? "기존 보유 사주 명식 입력 닫기" : "이미 알고 있는 사주 명식(4주)이 있으신가요? (정합성 비교)"}
              </button>
            </div>

            {showManualChart && (
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-3 animate-in fade-in duration-200">
                <p className="text-xs text-zinc-400">
                  보유하신 사주 기둥을 한자 2글자(예: 庚午, 庚辰, 丙寅, 乙未)로 입력하시면 시스템 계산값과 자동 대조합니다.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: "yearPillar", label: "연주 (Year)" },
                    { key: "monthPillar", label: "월주 (Month)" },
                    { key: "dayPillar", label: "일주 (Day)" },
                    { key: "hourPillar", label: "시주 (Hour)" },
                  ].map((item) => (
                    <div key={item.key}>
                      <label className="block text-[10px] text-zinc-500 uppercase mb-1">{item.label}</label>
                      <input
                        type="text"
                        maxLength={2}
                        placeholder="예: 甲子"
                        value={providedChart[item.key as keyof typeof providedChart]}
                        onChange={(e) =>
                          setProvidedChart({
                            ...providedChart,
                            [item.key]: e.target.value,
                          })
                        }
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-center text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 font-semibold text-base shadow-lg shadow-indigo-500/20 rounded-xl border-0 transition-transform active:scale-[0.99]"
              >
                {loading ? "만세력 차트 계산 및 저장 중..." : "저장하고 오늘의 바이브 체크인으로 이동"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
