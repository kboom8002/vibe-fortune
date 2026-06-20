"use client";
import React from "react";

const ELEMENT_COLORS: Record<string, string> = {
  wood: "#22c55e", fire: "#ef4444",
  earth: "#f59e0b", metal: "#94a3b8", water: "#3b82f6",
};

const ELEMENT_BG: Record<string, string> = {
  wood: "rgba(34,197,94,0.08)", fire: "rgba(239,68,68,0.08)",
  earth: "rgba(245,158,11,0.08)", metal: "rgba(148,163,184,0.08)", water: "rgba(59,130,246,0.08)",
};

interface Sensory {
  color: string; light: string; space: string;
  rhythm: string; ritual: string; scent?: string; food?: string;
}

interface PrescriptionItem {
  element: string;
  label: string;
  rationale: string;
  actions: string[];
  sensory: Sensory;
}

interface Props {
  homomorphic: PrescriptionItem;
  complementary: PrescriptionItem;
}

function PrescriptionCard({ item, type }: { item: PrescriptionItem; type: "homo" | "comp" }) {
  const color = ELEMENT_COLORS[item.element] || "#94a3b8";
  const bg = ELEMENT_BG[item.element] || "rgba(148,163,184,0.08)";
  const title = type === "homo" ? "同形 처방 — 현재 기운 증폭" : "相補 처방 — 부족한 기운 보충";
  const subtitle = type === "homo" ? "현재 강한 기운의 방향을 더 밀어줍니다" : "결핍된 기운을 보충합니다";

  return (
    <div style={{
      background: bg,
      border: `1px solid ${color}33`,
      borderRadius: "16px",
      padding: "20px",
    }}>
      <div style={{ color, fontSize: "11px", fontWeight: 700, marginBottom: "4px" }}>{title}</div>
      <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "12px" }}>{subtitle}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <span style={{
          fontSize: "18px", fontWeight: 700, color,
          background: `${color}22`, padding: "4px 12px", borderRadius: "99px",
        }}>{item.label}</span>
      </div>
      <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: "1.7", marginBottom: "14px" }}>
        {item.rationale}
      </p>
      <div style={{ marginBottom: "14px" }}>
        <div style={{ color: "#e2e8f0", fontSize: "12px", fontWeight: 600, marginBottom: "8px" }}>실천 행동</div>
        {item.actions.map((a, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: "8px",
            marginBottom: "6px", color: "#cbd5e1", fontSize: "13px",
          }}>
            <span style={{ color, flexShrink: 0 }}>•</span>
            <span>{a}</span>
          </div>
        ))}
      </div>
      <div style={{
        background: "rgba(0,0,0,0.2)", borderRadius: "10px", padding: "12px",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px",
      }}>
        <div><span style={{ color, fontSize: "11px" }}>🎨 색상</span><div style={{ color: "#94a3b8", fontSize: "12px" }}>{item.sensory.color}</div></div>
        <div><span style={{ color, fontSize: "11px" }}>💡 조명</span><div style={{ color: "#94a3b8", fontSize: "12px" }}>{item.sensory.light}</div></div>
        <div><span style={{ color, fontSize: "11px" }}>🏠 공간</span><div style={{ color: "#94a3b8", fontSize: "12px" }}>{item.sensory.space}</div></div>
        <div><span style={{ color, fontSize: "11px" }}>🎵 리듬</span><div style={{ color: "#94a3b8", fontSize: "12px" }}>{item.sensory.rhythm}</div></div>
        <div style={{ gridColumn: "1/-1" }}><span style={{ color, fontSize: "11px" }}>🧘 의식</span><div style={{ color: "#94a3b8", fontSize: "12px" }}>{item.sensory.ritual}</div></div>
        {item.sensory.scent && <div><span style={{ color, fontSize: "11px" }}>🌿 향</span><div style={{ color: "#94a3b8", fontSize: "12px" }}>{item.sensory.scent}</div></div>}
        {item.sensory.food && <div><span style={{ color, fontSize: "11px" }}>🍵 음식</span><div style={{ color: "#94a3b8", fontSize: "12px" }}>{item.sensory.food}</div></div>}
      </div>
    </div>
  );
}

export function VibePrescriptionPanel({ homomorphic, complementary }: Props) {
  return (
    <div>
      <h3 style={{
        fontSize: "16px", fontWeight: 700, color: "#e2e8f0",
        marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px",
      }}>🔮 Vibe 처방</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        <PrescriptionCard item={homomorphic} type="homo" />
        <PrescriptionCard item={complementary} type="comp" />
      </div>
    </div>
  );
}
