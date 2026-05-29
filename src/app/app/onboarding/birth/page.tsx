"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, AlertTriangle } from "lucide-react";
import { calculateChart } from "@/lib/manse";

export default function BirthProfileSetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "unspecified">("unspecified");
  const [timezone, setTimezone] = useState("Asia/Seoul");
  
  // Custom manual chart inputs
  const [showManualChart, setShowManualChart] = useState(false);
  const [providedChart, setProvidedChart] = useState({
    yearPillar: "",
    monthPillar: "",
    dayPillar: "",
    hourPillar: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!name || !birthDate) {
        throw new Error("\uc774\ub984\uacfc \uc0dd\ub144\uc6d4\uc77c\uc740 \ud544\uc218 \uc785\ub825 \ud56d\ubaa9\uc785\ub2c8\ub2e4.");
      }

      // Construct birthDateTime ISO string (defaults to 12:00 if time is missing)
      const timeStr = birthTime ? `${birthTime}:00` : "12:00:00";
      const birthDateTimeStr = `${birthDate}T${timeStr}+09:00`; // standard KST offset

      // Compute chart using deterministic manse engine!
      const computedChart = calculateChart({
        birthDateTime: birthDateTimeStr,
        timezone,
        gender,
      });

      // Save Birth Profile and Chart to local storage or DB
      const birthProfile = {
        id: crypto.randomUUID(),
        userId: "local-user",
        name,
        birthDateTime: birthDateTimeStr,
        timezone,
        gender,
        providedChart: showManualChart ? providedChart : undefined,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem("user-birth-profile", JSON.stringify(birthProfile));
      localStorage.setItem("user-manse-chart", JSON.stringify(computedChart));

      // Redirect to Daily Loop!
      router.push("/app/daily");
    } catch (err: any) {
      setError(err.message || "\ud504\ub85c\ud544 \uc124\uc815 \uacfc\uc815\uc5d0\uc11c \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-hidden">
      <Navbar />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      <main className="flex-1 flex flex-col justify-center items-center px-6 py-12">
      <div className="max-w-xl w-full space-y-8 bg-zinc-900/40 border border-zinc-800/80 p-8 rounded-3xl backdrop-blur-md relative z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-zinc-800 text-zinc-400">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              {"\uc0dd\ub144\uc6d4\uc77c\uc2dc \uc124\uc815"}
            </h2>
            <p className="text-xs text-zinc-400">
              {"\ub9cc\uc138\ub825\uc744 \uc815\ud655\ud558\uac8c \uc0b0\ucd9c\ud558\uae30 \uc704\ud55c \uc0dd\uc2dc \uc815\ubcf4\ub97c \uc785\ub825\ud569\ub2c8\ub2e4."}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-xs text-red-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                {"\uc774\ub984 / \ubcc4\uba85"}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={"\ubd84\uc11d\ubc1b\uc73c\uc2e4 \uc774\ub984\uc744 \uc801\uc5b4\uc8fc\uc138\uc694"}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Birth Date and Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  {"\ud0dc\uc5b4\ub09c \ub0a0\uc9dc (\uc591\ub825)"}
                </label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-zinc-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  {"\ud0dc\uc5b4\ub09c \uc2dc\uac01 (\uc120\ud0dd)"}
                </label>
                <input
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-zinc-300"
                />
              </div>
            </div>

            {/* Gender and Timezone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  {"\uc0dd\ubb3c\ud559\uc801 \uc131\ubcc4"}
                </label>
                <select
                  value={gender}
                  onChange={(e: any) => setGender(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-zinc-300 appearance-none"
                >
                  <option value="unspecified">{"\uc120\ud0dd \uc548 \ud568 (\ub300\uc6b4 \ubc29\ud5a5 \uacbd\uace0 \ud45c\uc2dc\ub428)"}</option>
                  <option value="male">{"\ub0a8\uc131"}</option>
                  <option value="female">{"\uc5ec\uc131"}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  {"\uae30\uc900 \ud0c0\uc784\uc874"}
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-zinc-300 appearance-none"
                >
                  <option value="Asia/Seoul">{"\ub300\ud55c\ubbfc\uad6d (KST, Asia/Seoul)"}</option>
                  <option value="UTC">{"\ud611\uc815 \uc138\uacc4\uc2dc (UTC)"}</option>
                </select>
              </div>
            </div>

            {/* Calculation policy notice */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/40 text-[11px] text-zinc-500 leading-relaxed">
              <span className="font-semibold text-zinc-400">{"\uba85\ub9ac\ud559 \uc5f0\uc0b0 \ud45c\uc900 \uc9c0\uce68 (standard_kr)"}</span>
              <br />
              {"\ubcf8 \uc2dc\uc2a4\ud15c\uc740 24\uc808\uae30 \uc815\uae30\ubc95(\u5b9a\u6c23\u6cd5)\uc744 \ud65c\uc6a9\ud558\uc5ec \uc6d4\uc8fc\ub97c \uad6c\ubd84\ud558\uace0, \uc785\ucd98(\u7acb\u6625) \uc808\uae30\ub97c \ubd84 \ub2e8\uc704\ub85c \uc5c4\uaca9\ud788 \ud310\uc815\ud558\uc5ec \uc5f0\uc8fc\ub97c \uad6c\ubd84\ud569\ub2c8\ub2e4. \uc57c\uc790\uc2dc(\u591c\u5b50\u6642) \ubc0f \uc9c4\ud0dc\uc591\uc2dc \ubcf4\uc815\uc740 \uae30\ubcf8\uc801\uc73c\ub85c \ube44\uc801\uc6a9\ub429\ub2c8\ub2e4."}
            </div>

            {/* Manual Chart Toggle */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showManualChart}
                  onChange={(e) => setShowManualChart(e.target.checked)}
                  className="rounded border-zinc-800 bg-zinc-950 text-indigo-500 focus:ring-0 w-4 h-4"
                />
                <span className="text-xs text-zinc-400 font-medium">{"\uc9c1\uc811 \uc0ac\uc8fc \ud314\uc790 \uae30\ub465 \uc785\ub825\ud558\uae30 (\uc120\ud0dd)"}</span>
              </label>
            </div>

            {showManualChart && (
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-850 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="text-[11px] text-zinc-400 font-medium">
                  {"\uc2a4\uc2a4\ub85c \uc54c\uace0 \uc788\ub294 \uc0ac\uc8fc \uae30\ub465\uc774 \uc788\ub294 \uacbd\uc6b0 \uc785\ub825\ud574 \uc8fc\uc138\uc694. \uacc4\uc0b0 \uacb0\uacfc\uc640 \ub300\uc870\ud558\uc5ec \uc815\ud569\uc131\uc744 \ud655\uc778\ud569\ub2c8\ub2e4. (\uc608: \u5e9a\u5348)"}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">{"\uc5f0\uc8fc"}</label>
                    <input
                      type="text"
                      placeholder={"\uc5f0\uc8fc"}
                      value={providedChart.yearPillar}
                      onChange={(e) => setProvidedChart({ ...providedChart, yearPillar: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">{"\uc6d4\uc8fc"}</label>
                    <input
                      type="text"
                      placeholder={"\uc6d4\uc8fc"}
                      value={providedChart.monthPillar}
                      onChange={(e) => setProvidedChart({ ...providedChart, monthPillar: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">{"\uc77c\uc8fc"}</label>
                    <input
                      type="text"
                      placeholder={"\uc77c\uc8fc"}
                      value={providedChart.dayPillar}
                      onChange={(e) => setProvidedChart({ ...providedChart, dayPillar: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">{"\uc2dc\uc8fc"}</label>
                    <input
                      type="text"
                      placeholder={"\uc2dc\uc8fc"}
                      value={providedChart.hourPillar}
                      onChange={(e) => setProvidedChart({ ...providedChart, hourPillar: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 text-center"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl shadow-lg shadow-indigo-500/10 border-0 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? "\uc0ac\uc8fc \uba85\uc2dd \ubd84\uc11d \uc911..." : "\uba85\uc2dd \uacc4\uc0b0 \ubc0f \ud504\ub85c\ud544 \uc800\uc7a5"}
          </Button>
        </form>
      </div>
      </main>
    </div>
  );
}
