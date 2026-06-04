import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock, Zap } from "lucide-react";
import { Recommendation } from "./mockData";
import { OptiHeader } from "./OptiHeader";
import { SHADOW_CARD_BTN, SHADOW_CARD_BTN_HOVER, SHADOW_ICON, sortTabStyle } from "../buttonStyles";
import { fmtMin, roundMin } from "../formatMinutes";

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

/** 카드·baseline과 동일 — API의 total_minutes(총 소요시간) */
function routeMinutes(rec: Recommendation): number {
  return rec.total_minutes;
}

/** 슬라이더 thumb 범위 (0.1분 단위로 반올림) */
function collectTimeExtent(
  recommendations: Recommendation[],
  baselines: ResultsPageProps["data"]["baselines"]
): { min: number; max: number } {
  const times = [
    baselines.transit_only.minutes,
    baselines.taxi_only.minutes,
    ...recommendations.map(routeMinutes),
  ];
  return { min: roundMin(Math.min(...times)), max: roundMin(Math.max(...times)) };
}

function collectPriceExtent(
  recommendations: Recommendation[],
  baselines: ResultsPageProps["data"]["baselines"]
): { min: number; max: number } {
  const prices = [
    baselines.transit_only.price,
    baselines.taxi_only.price,
    ...recommendations.map((r) => r.price),
  ];
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function ResultsPage({ data, onBack, onSelectCard }: ResultsPageProps) {
  const [sortKey, setSortKey] = useState<SortKey>("weighted");
  const { baselines, recommendations } = data;

  const timeExtent = useMemo(
    () => collectTimeExtent(recommendations, baselines),
    [recommendations, baselines]
  );
  const priceExtent = useMemo(
    () => collectPriceExtent(recommendations, baselines),
    [recommendations, baselines]
  );

  const timeBaseline = useMemo(
    () => ({
      taxi: roundMin(baselines.taxi_only.minutes),
      transit: roundMin(baselines.transit_only.minutes),
    }),
    [baselines]
  );

  const [maxTime, setMaxTime] = useState(timeExtent.max);
  const [maxPrice, setMaxPrice] = useState(priceExtent.max);

  useEffect(() => {
    setMaxTime(timeExtent.max);
    setMaxPrice(priceExtent.max);
  }, [timeExtent.max, priceExtent.max]);

  const sorted = [...recommendations].sort((a, b) =>
    sortKey === "weighted"
      ? (a.norm_distance ?? Infinity) - (b.norm_distance ?? Infinity)
      : sortKey === "price"
        ? a.price - b.price
        : a.total_minutes - b.total_minutes
  );

  const filtered = sorted.filter((rec) => {
    return routeMinutes(rec) <= maxTime && rec.price <= maxPrice;
  });

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
          <Chip icon={<Zap size={10} />} label={`${filtered.length}개 경로`} glow />
        </div>
      </div>

      <main className="flex-1 px-4 pb-8 flex flex-col gap-3">
        <div className="rounded-2xl p-4 flex flex-col gap-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <MaxOnlySlider
            label="소요 시간"
            icon={<Clock size={12} style={{ color: CYAN }} />}
            bounds={timeExtent}
            value={maxTime}
            onChange={(v) => setMaxTime(roundMin(v))}
            step={0.1}
            formatBound={fmtMin}
            formatBelow={(v) => `${fmtMin(v)} 이하`}
            labelMin={fmtMin(timeBaseline.taxi)}
            labelMax={fmtMin(timeBaseline.transit)}
            markerValue={timeBaseline.transit}
          />
          <MaxOnlySlider
            label="비용"
            bounds={priceExtent}
            value={maxPrice}
            onChange={setMaxPrice}
            step={100}
            formatBound={(v) => `${v.toLocaleString()}원`}
            formatBelow={(v) => `${v.toLocaleString()}원 이하`}
          />
        </div>

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

        {filtered.length === 0 && (
          <p className="text-center py-6" style={{ fontSize: "0.875rem", color: MUTED }}>
            선택한 시간·비용 이하에 맞는 경로가 없습니다.
          </p>
        )}

        {filtered.map((rec) => (
          <RecommendCard key={rec.rank} rec={rec} onClick={() => onSelectCard(rec)} />
        ))}
      </main>
    </div>
  );
}

function MaxOnlySlider({
  label,
  icon,
  bounds,
  value,
  onChange,
  step,
  formatBound,
  formatBelow,
  labelMin,
  labelMax,
  markerValue,
}: {
  label: string;
  icon?: React.ReactNode;
  bounds: { min: number; max: number };
  value: number;
  onChange: (v: number) => void;
  step: number;
  formatBound: (v: number) => string;
  formatBelow: (v: number) => string;
  /** 하단 라벨 — 미지정 시 bounds min/max (비용 슬라이더) */
  labelMin?: string;
  labelMax?: string;
  /** 기준선 눈금 (대중교통만 소요시간 등) */
  markerValue?: number;
}) {
  const disabled = bounds.min >= bounds.max;
  const span = bounds.max - bounds.min || 1;
  const fillPct = ((value - bounds.min) / span) * 100;
  const markerPct =
    markerValue != null && markerValue > bounds.min && markerValue < bounds.max
      ? ((markerValue - bounds.min) / span) * 100
      : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-1.5" style={{ fontSize: "0.8125rem", fontWeight: 600, color: TEXT }}>
          {icon}
          {label}
        </span>
        <span style={{ fontSize: "0.75rem", color: CYAN, fontWeight: 600 }}>
          {formatBelow(value)}
        </span>
      </div>

      <div className="relative h-7 mx-1">
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.12)" }}
        />
        {markerPct != null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full pointer-events-none"
            style={{ left: `${markerPct}%`, marginLeft: -1, background: "rgba(255,255,255,0.45)" }}
            title={labelMax}
          />
        )}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full"
          style={{
            width: `${fillPct}%`,
            background: CYAN,
            boxShadow: `0 0 8px ${CYAN}50`,
          }}
        />
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="max-only-slider w-full"
        />
      </div>

      <div className="flex justify-between mt-2 px-0.5">
        <span style={{ fontSize: "0.7rem", color: MUTED, fontWeight: 600 }}>{labelMin ?? formatBound(bounds.min)}</span>
        <span style={{ fontSize: "0.7rem", color: MUTED, fontWeight: 600 }}>{labelMax ?? formatBound(bounds.max)}</span>
      </div>

      <style>{`
        .max-only-slider {
          position: absolute;
          width: 100%;
          height: 28px;
          margin: 0;
          top: 50%;
          transform: translateY(-50%);
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        .max-only-slider::-webkit-slider-runnable-track {
          -webkit-appearance: none;
          height: 6px;
          border-radius: 999px;
          background: transparent;
        }
        .max-only-slider::-moz-range-track {
          height: 6px;
          border-radius: 999px;
          background: transparent;
          border: none;
        }
        .max-only-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          margin-top: -6px;
          border-radius: 50%;
          background: linear-gradient(180deg, #6dd4f5 0%, ${CYAN} 100%);
          border: 2px solid #0b0d1f;
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          cursor: pointer;
        }
        .max-only-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${CYAN};
          border: 2px solid #0b0d1f;
          cursor: pointer;
        }
      `}</style>
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
      <p className="font-black" style={{ fontSize: "1.5rem", color: accent, lineHeight: 1, textShadow: `0 0 16px ${accent}60` }}>{fmtMin(minutes)}</p>
      <p className="mt-1" style={{ fontSize: "0.8125rem", color: MUTED }}>{price.toLocaleString()}원</p>
    </div>
  );
}

function RecommendCard({ rec, onClick }: { rec: Recommendation; onClick: () => void }) {
  const transitRatio = rec.transit_segment.minutes / rec.total_minutes;
  return (
    <button onClick={onClick} className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98] active:translate-y-[1px]"
      style={{ background: `linear-gradient(180deg, #2E3548 0%, ${CARD} 100%)`, border: `1px solid ${BORDER}`, boxShadow: SHADOW_CARD_BTN }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = SHADOW_CARD_BTN_HOVER; e.currentTarget.style.borderColor = "rgba(76,200,240,0.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = SHADOW_CARD_BTN; e.currentTarget.style.borderColor = BORDER; }}>
      <div className="flex items-start justify-between mb-2">
        <span className="inline-flex px-2 py-0.5 rounded-full text-white font-bold" style={{ background: "linear-gradient(180deg, #4AE07A 0%, #34C759 100%)", boxShadow: "0 1px 0 rgba(255,255,255,0.3) inset, 0 2px 6px rgba(52,199,89,0.45)", fontSize: "0.7rem" }}>{rec.rank}순위</span>
        <div className="flex items-baseline gap-1">
          <span style={{ fontSize: "1.125rem", fontWeight: 800, color: TEXT }}>{fmtMin(rec.total_minutes)}</span>
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
            {rec.transit_segment.lines[0]?.name} {fmtMin(rec.transit_segment.minutes)}
          </span>
          <span className="flex items-center gap-1" style={{ fontSize: "0.75rem", color: MUTED }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#F5A623" }} />
            택시 {fmtMin(rec.taxi_segment.minutes)}
          </span>
        </div>
      </div>
      <div className="flex gap-4 pt-3" style={{ borderTop: `1px solid rgba(255,255,255,0.14)` }}>
        <span style={{ fontSize: "0.75rem", color: CYAN, fontWeight: 600 }}>🚇 -{fmtMin(rec.savings.vs_transit_minutes)} 단축</span>
        <span style={{ fontSize: "0.75rem", color: "#F5A623", fontWeight: 600 }}>🚕 -{rec.savings.vs_taxi_price.toLocaleString()}원 절약</span>
      </div>
    </button>
  );
}
