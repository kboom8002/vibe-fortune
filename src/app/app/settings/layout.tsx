import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "설정 및 개인정보 관리 | TCO-Vibe",
  description: "데이터 주권과 개인정보 권리를 보호하고 투명하게 통제합니다.",
};
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
