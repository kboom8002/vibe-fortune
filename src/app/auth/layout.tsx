import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "로그인 | TCO-Vibe",
  description: "TCO-Vibe 운영 코치 시스템에 접속합니다.",
};
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
