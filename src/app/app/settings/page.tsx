"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Shield, Download, Trash2, User, Lock, Database, Save, CheckCircle, Briefcase, Globe } from "lucide-react";
import { setLocale, getLocale, Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [personalCtx, setPersonalCtx] = useState<any>({});
  const [saved, setSaved] = useState(false);
  const [locale, setLocaleState] = useState<Locale>('ko');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.birthProfile) {
            setProfile({
              name: data.birthProfile.name,
              birthDate: data.birthProfile.birthDateTime,
            });
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching profile from API:", err);
      }
      
      // Fallback to localStorage
      const stored = localStorage.getItem("user-birth-profile");
      if (stored) {
        const p = JSON.parse(stored);
        setProfile({
          name: p.name,
          birthDate: p.birthDateTime,
        });
      }
    };
    fetchProfile();

    // Load personal context
    const storedCtx = localStorage.getItem("personal-context");
    if (storedCtx) {
      try { setPersonalCtx(JSON.parse(storedCtx)); } catch {}
    }

    // Load locale
    setLocaleState(getLocale());
  }, []);

  const handleExport = () => {
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) data[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tco_vibe_fortune_coach_data_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAll = () => {
    if (confirm("정말로 모든 데이터를 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  const handleSavePersonalCtx = () => {
    localStorage.setItem("personal-context", JSON.stringify(personalCtx));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const updateCtx = (key: string, value: string) => {
    setPersonalCtx((prev: any) => ({ ...prev, [key]: value || undefined }));
  };

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setLocaleState(newLocale);
  };

  const LOCALE_OPTIONS: { value: Locale; label: string; flag: string }[] = [
    { value: 'ko', label: '한국어', flag: '🇰🇷' },
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'ja', label: '日本語', flag: '🇯🇵' },
    { value: 'zh', label: '中文', flag: '🇨🇳' },
  ];

  const inputClass = "w-full bg-zinc-900/60 border border-zinc-700/60 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors";
  const selectClass = "w-full bg-zinc-900/60 border border-zinc-700/60 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 transition-colors";
  const labelClass = "text-xs text-zinc-400 uppercase tracking-wider mb-1 block";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-x-hidden font-sans">
      <Navbar />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-glow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-glow pointer-events-none" />

      <div className="max-w-2xl mx-auto w-full px-6 py-12 relative z-10 flex-1">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
            설정 및 개인정보 관리
          </h1>
          <p className="text-sm text-zinc-400">
            데이터 주권과 개인정보 권리를 보호하고 투명하게 통제합니다.
          </p>
        </div>

        <div className="space-y-6">
          {/* Privacy Notice */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              개인정보 보호 안내
            </h2>
            <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
              <div className="flex items-start gap-3">
                <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <p>모든 데이터는 사용자의 기기에만 저장됩니다. 서버 전송은 분석 처리에만 사용되며, 처리 후 즉시 폐기됩니다.</p>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>사주 데이터와 바이브 체크인 기록은 소유자 본인만 접근할 수 있으며, Row Level Security(RLS)에 의해 보호됩니다.</p>
              </div>
              <div className="flex items-start gap-3">
                <Database className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>언제든 전체 데이터 백업(JSON 다운로드) 및 영구 삭제가 가능합니다.</p>
              </div>
            </div>
          </div>

          {/* Profile Summary */}
          {profile && (
            <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-purple-400" />
                프로필 정보
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-500 text-xs uppercase tracking-wider">이름</span>
                  <p className="text-zinc-200 font-medium">{profile.name}</p>
                </div>
                <div>
                  <span className="text-zinc-500 text-xs uppercase tracking-wider">생년월일</span>
                  <p className="text-zinc-200 font-medium">{profile.birthDate}</p>
                </div>
              </div>
            </div>
          )}

          {/* Personal Context */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-400" />
                개인 맥락 (AI 정밀화용)
              </h2>
              {saved && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  저장됨
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              입력한 정보는 기기에만 저장되며, AI 포캐스트를 개인 상황에 맞게 정밀화하는 데만 사용됩니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>직업/역할</label>
                <input className={inputClass} placeholder="예: 스타트업 창업자, 마케터..." value={personalCtx.occupation || ""} onChange={e => updateCtx("occupation", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>업종/분야</label>
                <input className={inputClass} placeholder="예: IT, 교육, 금융..." value={personalCtx.industry || ""} onChange={e => updateCtx("industry", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>경력 단계</label>
                <select className={selectClass} value={personalCtx.careerStage || ""} onChange={e => updateCtx("careerStage", e.target.value)}>
                  <option value="">선택 안 함</option>
                  <option value="entry">초기 커리어</option>
                  <option value="growth">성장기</option>
                  <option value="senior">시니어</option>
                  <option value="executive">임원</option>
                  <option value="freelance">프리랜서</option>
                  <option value="founder">창업자</option>
                  <option value="transition">전환기</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>관계 상태</label>
                <select className={selectClass} value={personalCtx.relationshipStatus || ""} onChange={e => updateCtx("relationshipStatus", e.target.value)}>
                  <option value="">선택 안 함</option>
                  <option value="single">싱글</option>
                  <option value="dating">연애 중</option>
                  <option value="married">기혼</option>
                  <option value="separated">이혼/별거</option>
                  <option value="complicated">복잡한 상황</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>현재 프로젝트</label>
                <input className={inputClass} placeholder="예: SaaS 제품 런칭, 석사 논문, 유튜브 채널..." value={personalCtx.currentProject || ""} onChange={e => updateCtx("currentProject", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>재정 목표</label>
                <input className={inputClass} placeholder="예: 6개월 내 흑자 전환..." value={personalCtx.financialGoal || ""} onChange={e => updateCtx("financialGoal", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>건강 이슈</label>
                <input className={inputClass} placeholder="예: 수면 부족, 목 통증..." value={personalCtx.healthConcern || ""} onChange={e => updateCtx("healthConcern", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>학습 목표</label>
                <input className={inputClass} placeholder="예: Python ML, 영어 회화..." value={personalCtx.learningGoal || ""} onChange={e => updateCtx("learningGoal", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>브랜딩 목표</label>
                <input className={inputClass} placeholder="예: 분야 전문가로 인정받기..." value={personalCtx.brandingGoal || ""} onChange={e => updateCtx("brandingGoal", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>현재 가장 큰 도전</label>
                <input className={inputClass} placeholder="예: 번아웃, 팀 갈등, 자금 확보..." value={personalCtx.biggestChallenge || ""} onChange={e => updateCtx("biggestChallenge", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>운동 습관</label>
                <input className={inputClass} placeholder="예: 주 3회 러닝, 헬스..." value={personalCtx.exerciseHabit || ""} onChange={e => updateCtx("exerciseHabit", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>재정 고민</label>
                <input className={inputClass} placeholder="예: 대출 상환, 투자 판단..." value={personalCtx.financialConcern || ""} onChange={e => updateCtx("financialConcern", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>관계 초점</label>
                <input className={inputClass} placeholder="예: 팀 리더십, 배우자와의 소통..." value={personalCtx.relationshipFocus || ""} onChange={e => updateCtx("relationshipFocus", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>삶의 철학</label>
                <input className={inputClass} placeholder="예: 꾸준함이 최고의 전략..." value={personalCtx.lifePhilosophy || ""} onChange={e => updateCtx("lifePhilosophy", e.target.value)} />
              </div>
            </div>
            <Button onClick={handleSavePersonalCtx} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-500 text-white">
              <Save className="w-4 h-4" />
              개인 맥락 저장
            </Button>
          </div>

          {/* Language / 언어 */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              Language / 언어
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              UI 언어를 선택합니다. 사주 원문(한자)은 모든 언어에서 유지됩니다.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {LOCALE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleLocaleChange(opt.value)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    locale === opt.value
                      ? 'bg-indigo-600/80 text-white border border-indigo-500 shadow-lg shadow-indigo-500/20'
                      : 'bg-zinc-900/60 text-zinc-400 border border-zinc-700/60 hover:border-indigo-500/40 hover:text-zinc-200'
                  }`}
                >
                  <span className="text-lg">{opt.flag}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Data Actions */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              데이터 관리
            </h2>
            <div className="space-y-3">
              <Button onClick={handleExport} variant="outline"
                className="w-full justify-start gap-2 border-zinc-800 hover:border-indigo-500/30 text-zinc-300">
                <Download className="w-4 h-4 text-indigo-400" />
                개인정보 데이터 백업 (JSON 다운로드)
              </Button>
              <Button onClick={handleDeleteAll} variant="destructive"
                className="w-full justify-start gap-2">
                <Trash2 className="w-4 h-4" />
                모든 내역 영구 파기 및 탈퇴
              </Button>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-zinc-600">
            최종 판단과 행동의 책임은 사용자 자신에게 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
