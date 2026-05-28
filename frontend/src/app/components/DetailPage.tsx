import { ArrowLeft } from "lucide-react";
import { Recommendation } from "./mockData";
import { OptiHeader } from "./OptiHeader";

interface DetailPageProps {
  rec: Recommendation;
  baselines: {
    transit_only: { minutes: number; price: number };
    taxi_only: { minutes: number; price: number };
  };
  onBack: () => void;
}

const CYAN = "#4CC8F0";
const AMBER = "#F5A623";
const CARD = "#252A42";
const BG = "#1C2035";
const BORDER = "rgba(255,255,255,0.1)";
const TEXT = "#E8F0FF";
const MUTED = "#7A8BAA";

export function DetailPage({ rec, baselines, onBack }: DetailPageProps) {
  const transitPct = Math.round((rec.transit_segment.minutes / rec.total_minutes) * 100);
  const taxiPct = 100 - transitPct;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <OptiHeader
        right={
          <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}` }}>
            <ArrowLeft size={14} style={{ color: "#8A9BBF" }} />
          </button>
        }
      />

      <div className="px-5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex px-2 py-0.5 rounded-full text-white font-bold" style={{ background: "#34C759", fontSize: "0.7rem" }}>{rec.rank}순위</span>
          <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: TEXT }}>{rec.transfer_point} 환승</span>
        </div>
        <p style={{ fontSize: "0.75rem", color: MUTED, marginBottom: "12px" }}>총 {rec.total_minutes}분 · {rec.price.toLocaleString()}원</p>

        <div className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex rounded-full overflow-hidden mb-3" style={{ height: "10px" }}>
            <div style={{ flex: transitPct, background: CYAN, borderRadius: "5px 0 0 5px", boxShadow: `0 0 14px ${CYAN}60` }} />
            <div style={{ flex: taxiPct, background: AMBER, borderRadius: "0 5px 5px 0", boxShadow: `0 0 14px ${AMBER}50` }} />
          </div>
          <div className="flex justify-between">
            <span className="flex items-center gap-1.5" style={{ fontSize: "0.75rem", color: MUTED }}>
              <span className="w-2 h-2 rounded-full" style={{ background: CYAN }} />
              대중교통 {rec.transit_segment.minutes}분 · {rec.transit_segment.price.toLocaleString()}원
            </span>
            <span className="flex items-center gap-1.5" style={{ fontSize: "0.75rem", color: MUTED }}>
              <span className="w-2 h-2 rounded-full" style={{ background: AMBER }} />
              택시 {rec.taxi_segment.minutes}분 · {rec.taxi_segment.price.toLocaleString()}원
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 pb-10 flex flex-col gap-3">
        <div className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 700, color: TEXT }} className="mb-4">전체 경로</p>
          <TLNode dot={CYAN} label="출발지" lineColor={CYAN} />
          <TLLine label="🚶 도보" color={MUTED} />
          {rec.transit_segment.lines.map((line, i) => (
            <div key={i}>
              <TLNode dot={CYAN} label={`🚇 ${line.name} (${line.from})`} sub={`${line.to} 방면`} lineColor={CYAN} />
              <TLLine label={`${line.minutes}분`} color={CYAN} />
            </div>
          ))}
          <TLNode dot={AMBER} diamond label={`📍 ${rec.transfer_point} — 환승`} lineColor={AMBER} highlight />
          <TLLine label={`🚕 택시 ${rec.taxi_segment.minutes}분 · ${rec.taxi_segment.price.toLocaleString()}원`} color={AMBER} />
          <TLNode dot="#34C759" label="🏁 도착지" sub={`총 ${rec.total_minutes}분 · ${rec.price.toLocaleString()}원`} lineColor="transparent" last />
        </div>

        <div className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 700, color: TEXT }} className="mb-3">비용 내역</p>
          <div className="flex flex-col gap-2.5">
            <CostRow label="대중교통 요금" amount={rec.transit_segment.price} color={CYAN} />
            <CostRow label="택시 요금" amount={rec.taxi_segment.price} color={AMBER} />
            <div className="pt-2.5" style={{ borderTop: `1px solid rgba(255,255,255,0.05)` }}>
              <CostRow label="합계" amount={rec.price} bold />
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 700, color: TEXT }} className="mb-3">기준선 비교</p>
          <div className="flex flex-col gap-2.5">
            <CompareRow icon="🚇" label="대중교통만"
              sub={`${baselines.transit_only.minutes}분 / ${baselines.transit_only.price.toLocaleString()}원`}
              badge={`-${rec.savings.vs_transit_minutes}분`} badgeColor={CYAN}
              note={`+${(rec.price - baselines.transit_only.price).toLocaleString()}원`}
              glow="rgba(76,200,240,0.08)" border="rgba(76,200,240,0.12)" />
            <CompareRow icon="🚕" label="택시만"
              sub={`${baselines.taxi_only.minutes}분 / ${baselines.taxi_only.price.toLocaleString()}원`}
              badge={`-${rec.savings.vs_taxi_price.toLocaleString()}원`} badgeColor={AMBER}
              note={`+${rec.total_minutes - baselines.taxi_only.minutes}분`}
              glow="rgba(245,166,35,0.08)" border="rgba(245,166,35,0.12)" />
          </div>
        </div>

        <div className="rounded-2xl px-4 py-4 flex items-center justify-between" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: 700, color: TEXT }}>파레토 가중치 점수</p>
            <p style={{ fontSize: "0.75rem", color: MUTED, marginTop: "2px" }}>α=1.99 (시간) · β=11.24 (환승)</p>
          </div>
          <p style={{ fontSize: "2.25rem", fontWeight: 900, color: CYAN, textShadow: `0 0 24px ${CYAN}70`, lineHeight: 1 }}>
            {rec.weighted_minutes.toFixed(1)}
          </p>
        </div>
      </main>
    </div>
  );
}

function TLNode({ dot, diamond, label, sub, lineColor, highlight, last }: { dot: string; diamond?: boolean; label: string; sub?: string; lineColor: string; highlight?: boolean; last?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center" style={{ width: "18px" }}>
        <div style={{ width: "13px", height: "13px", flexShrink: 0, marginTop: "2px", background: dot, borderRadius: diamond ? "3px" : "50%", transform: diamond ? "rotate(45deg)" : undefined, boxShadow: `0 0 8px ${dot}80` }} />
        {!last && <div style={{ flex: 1, width: "2px", background: lineColor, opacity: 0.18, minHeight: "18px", marginTop: "3px" }} />}
      </div>
      <div className="pb-4 flex-1">
        <p style={{ fontSize: "0.875rem", color: highlight ? AMBER : TEXT, fontWeight: 600 }}>{label}</p>
        {sub && <p style={{ fontSize: "0.75rem", color: MUTED, marginTop: "2px" }}>{sub}</p>}
      </div>
    </div>
  );
}

function TLLine({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex gap-3 items-center">
      <div style={{ width: "18px", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "2px", height: "16px", background: color, opacity: 0.18 }} />
      </div>
      <p style={{ fontSize: "0.8125rem", color, opacity: 0.65, fontWeight: 500 }}>{label}</p>
    </div>
  );
}

function CostRow({ label, amount, color, bold }: { label: string; amount: number; color?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span style={{ fontSize: "0.875rem", color: bold ? TEXT : MUTED, fontWeight: bold ? 700 : 500 }}>{label}</span>
      <span style={{ fontSize: bold ? "1rem" : "0.875rem", fontWeight: bold ? 800 : 600, color: color || TEXT }}>{amount.toLocaleString()}원</span>
    </div>
  );
}

function CompareRow({ icon, label, sub, badge, badgeColor, note, glow, border }: { icon: string; label: string; sub: string; badge: string; badgeColor: string; note: string; glow: string; border: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-3 rounded-xl" style={{ background: glow, border: `1px solid ${border}` }}>
      <div>
        <p style={{ fontSize: "0.8125rem", color: "#8A9BBF", fontWeight: 600 }}>{icon} {label}</p>
        <p style={{ fontSize: "0.75rem", color: MUTED }}>{sub}</p>
      </div>
      <div className="text-right">
        <p style={{ fontSize: "1rem", fontWeight: 800, color: badgeColor, textShadow: `0 0 10px ${badgeColor}60` }}>{badge}</p>
        <p style={{ fontSize: "0.75rem", color: MUTED }}>{note}</p>
      </div>
    </div>
  );
}
