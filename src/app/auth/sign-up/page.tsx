"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Simulate or execute Supabase local registration
      document.cookie = "sb-access-token=mock-token; path=/; max-age=86400";
      document.cookie = "sb-user-id=local-user; path=/; max-age=86400";
      
      localStorage.setItem("user-session", JSON.stringify({ userId: "local-user", email, name }));

      router.push("/app/onboarding");
    } catch (err: any) {
      setError(err.message || "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full space-y-8 bg-zinc-900/40 border border-zinc-800/80 p-8 rounded-2xl backdrop-blur-md relative z-10">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            회원가입
          </h2>
          <p className="text-sm text-zinc-400">
            TCO-Vibe 운영 코치 시스템의 새로운 멤버가 됩니다.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-400 text-center">
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSignUp}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                이름 / 닉네임
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                이메일 주소
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="최소 6자리 이상"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl shadow-lg shadow-indigo-500/10 border-0 transition-transform active:scale-[0.98]"
          >
            {loading ? "회원가입 중..." : "가입 및 로그인"}
          </Button>
        </form>

        <div className="text-center pt-4 border-t border-zinc-800/50">
          <p className="text-xs text-zinc-500">
            이미 계정이 있으신가요?{" "}
            <Link href="/auth/sign-in" className="text-indigo-400 hover:text-indigo-300 font-medium">
              로그인하기
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
