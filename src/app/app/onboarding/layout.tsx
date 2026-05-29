import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "온보딩 | TCO-Vibe",
  description: "TCO-Vibe 시스템에 당신의 우주적 흐름을 구성합니다.",
};
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
