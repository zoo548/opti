import { useState } from "react";
import { ArrowLeft, Clock, Wallet, Zap } from "lucide-react";
import { Recommendation } from "./mockData";
import { OptiHeader } from "./OptiHeader";
import { SHADOW_CARD_BTN, SHADOW_CARD_BTN_HOVER, SHADOW_ICON, sortTabStyle } from "../buttonStyles";

interface ResultsPageProps {
  data: {
    allowed_minutes: number | null;
    baselines: {
      transit_only: { minutes: number; price: number; transfers: number };
      taxi_only: { minutes: number; price: number };
    };
    recommendations: Recommendation[];
  };
  onBack: () => void;
  onSelectCard: (rec: Recommendation) => void;
}

type SortKey = "weighted" | "price" | "time";

const CYAN = "#4CC8F0";
const CARD = "#252A42";
const BG = "#1C2035";
const BORDER = "rgba(255,255,255,0.24)";
const TEXT = "#E8F0FF";
const MUTED = "#FFFFFF";

export function ResultsPage({ data, onBack, onSelectCard }: ResultsPageProps) {
  const [sortKey, setSortKey] = useState<SortKey>("weighted");
  const { baselines, recommendations, allowed_minutes } = data;

  const sorted = [...recommendations].sort((a, b) =>
    sortKey === "weighted" ? a.weighted_minutes - b.weighted_minutes :
    sortKey === "price" ? a.price - b.price :
    a.total_minutes - b.total_minutes
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <OptiHeader
        right={
          <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95" style={{ background: "linear-gradient(180deg, #404A60 0%, #353D52 100%)", boxShadow: SHADOW_ICON, border: `1px solid ${BORDER}` }}>
            <ArrowLeft size={14} style={{ color: MUTED }} />
          </button>
        }
      />

      <div className="px-5 pb-4">
        <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: TEXT }} className="mb-2">경로 분석 결과</p>
        <div className="flex gap-2 flex-wrap">
          {allowed_minutes && <Chip icon={<Clock size={10} />} label={`${allowed_minutes}분 이내`} />}
          <Chip icon={<Zap size={10} />} label={`${recommendations.length}개 경로`} glow />
        </div>
      </div>

      <main className="flex-1 px-4 pb-8 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <BaselineCard icon="🚇" label="대중교통만" minutes={baselines.transit_only.minutes} price={baselines.transit_only.price} accent={CYAN} />
          <BaselineCard icon="🚕" label="택시만" minutes={baselines.taxi_only.minutes} price={baselines.taxi_only.price} accent="#F5A623" />
        </div>

        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          {([["weighted", "추천순"], ["price", "비용순"], ["time", "시간순"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setSortKey(key)}
              className="flex-1 py-2 rounded-xl transition-all active:scale-[0.98]"
              style={{
                ...(sortKey === key ? sortTabStyle(true) : { background: "transparent" }),
                color: sortKey === key ? "#0B0D1F" : MUTED,
                fontSize: "0.8125rem",
                fontWeight: sortKey === key ? 700 : 500,
              }}>
              {label}
            </button>
          ))}
        </div>

        {sorted.map((rec) => (
          <RecommendCard key={rec.rank} rec={rec}
            dimmed={!!rec.over_constraint}
            overLabel={rec.over_label ?? undefined}
            onClick={() => onSelectCard(rec)} />
        ))}
      </main>
    </div>
  );
}

function Chip({ icon, label, glow }: { icon: React.ReactNode; label: string; glow?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: glow ? `rgba(76,200,240,0.1)` : "rgba(255,255,255,0.05)", color: glow ? CYAN : MUTED, fontSize: "0.75rem", fontWeight: 600, border: glow ? `1px solid rgba(76,200,240,0.2)` : `1px solid ${BORDER}` }}>
      {icon}{label}
    </span>
  );
}

function BaselineCard({ icon, label, minutes, price, accent }: { icon: string; label: string; minutes: number; price: number; accent: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ fontSize: "0.9375rem" }}>{icon}</span>
        <span style={{ fontSize: "0.75rem", color: MUTED, fontWeight: 600 }}>{label}</span>
      </div>
      <p className="font-black" style={{ fontSize: "1.5rem", color: accent, lineHeight: 1, textShadow: `0 0 16px ${accent}60` }}>{minutes}분</p>
      <p className="mt-1" style={{ fontSize: "0.8125rem", color: MUTED }}>{price.toLocaleString()}원</p>
    </div>
  );
}

function RecommendCard({ rec, dimmed, overLabel, onClick }: { rec: Recommendation; dimmed: boolean; overLabel?: string; onClick: () => void }) {
  const transitRatio = rec.transit_segment.minutes / rec.total_minutes;
  return (
    <button onClick={onClick} className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98] active:translate-y-[1px]"
      style={{ background: `linear-gradient(180deg, #2E3548 0%, ${CARD} 100%)`, border: `1px solid ${BORDER}`, boxShadow: SHADOW_CARD_BTN, opacity: dimmed ? 0.35 : 1 }}
      onMouseEnter={e => { if (!dimmed) { e.currentTarget.style.boxShadow = SHADOW_CARD_BTN_HOVER; e.currentTarget.style.borderColor = "rgba(76,200,240,0.3)"; } }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = SHADOW_CARD_BTN; e.currentTarget.style.borderColor = BORDER; }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex px-2 py-0.5 rounded-full text-white font-bold" style={{ background: "linear-gradient(180deg, #4AE07A 0%, #34C759 100%)", boxShadow: "0 1px 0 rgba(255,255,255,0.3) inset, 0 2px 6px rgba(52,199,89,0.45)", fontSize: "0.7rem" }}>{rec.rank}순위</span>
          {overLabel && <span className="inline-flex px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(255,59,48,0.12)", color: "#FF3B30", fontSize: "0.7rem" }}>{overLabel}</span>}
        </div>
        <div className="flex items-baseline gap-1">
          <span style={{ fontSize: "1.125rem", fontWeight: 800, color: TEXT }}>{rec.total_minutes}분</span>
          <span style={{ color: MUTED }}>·</span>
          <span style={{ fontSize: "1.125rem", fontWeight: 800, color: TEXT }}>{rec.price.toLocaleString()}원</span>
        </div>
      </div>
      <p style={{ fontSize: "0.875rem", color: MUTED, fontWeight: 600 }} className="mb-3">📍 {rec.transfer_point} 환승</p>
      <div className="mb-3">
        <div className="flex rounded-full overflow-hidden mb-2" style={{ height: "7px" }}>
          <div style={{ flex: transitRatio, background: CYAN, borderRadius: "4px 0 0 4px", boxShadow: `0 0 8px ${CYAN}60` }} />
          <div style={{ flex: 1 - transitRatio, background: "#F5A623", borderRadius: "0 4px 4px 0", boxShadow: "0 0 8px rgba(245,166,35,0.5)" }} />
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1" style={{ fontSize: "0.75rem", color: MUTED }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: CYAN }} />
            {rec.transit_segment.lines[0]?.name} {rec.transit_segment.minutes}분
          </span>
          <span className="flex items-center gap-1" style={{ fontSize: "0.75rem", color: MUTED }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#F5A623" }} />
            택시 {rec.taxi_segment.minutes}분
          </span>
        </div>
      </div>
      <div className="flex gap-4 pt-3" style={{ borderTop: `1px solid rgba(255,255,255,0.14)` }}>
        <span style={{ fontSize: "0.75rem", color: CYAN, fontWeight: 600 }}>🚇 -{rec.savings.vs_transit_minutes}분 단축</span>
        <span style={{ fontSize: "0.75rem", color: "#F5A623", fontWeight: 600 }}>🚕 -{rec.savings.vs_taxi_price.toLocaleString()}원 절약</span>
      </div>
    </button>
  );
}
