"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Shield, Download, Trash2, User, Lock, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user-birth-profile");
    if (stored) setProfile(JSON.parse(stored));
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
