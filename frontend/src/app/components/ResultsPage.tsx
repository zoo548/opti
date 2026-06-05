import { useEffect, useMemo, useState } from "react";
import { Recommendation } from "./mockData";
import { RouteHeader } from "./RouteHeader";
import { fmtMin, roundMin } from "../formatMinutes";
import { OPTI } from "../optiTheme";

interface ResultsPageProps {
  from: string;
  to: string;
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

const sortTabs: { key: SortKey; label: string }[] = [
  { key: "weighted", label: "추천순" },
  { key: "time", label: "시간순" },
  { key: "price", label: "비용순" },
];

function routeMinutes(rec: Recommendation): number {
  return rec.total_minutes;
}

function baselineTimeBounds(baselines: ResultsPageProps["data"]["baselines"]) {
  return {
    min: roundMin(baselines.taxi_only.minutes),
    max: roundMin(baselines.transit_only.minutes),
  };
}

function baselinePriceBounds(baselines: ResultsPageProps["data"]["baselines"]) {
  return {
    min: baselines.transit_only.price,
    max: baselines.taxi_only.price,
  };
}

export function ResultsPage({ from, to, data, onBack, onSelectCard }: ResultsPageProps) {
  const [sortKey, setSortKey] = useState<SortKey>("weighted");
  const { baselines, recommendations } = data;

  const timeBounds = useMemo(() => baselineTimeBounds(baselines), [baselines]);
  const priceBounds = useMemo(() => baselinePriceBounds(baselines), [baselines]);

  const [maxTime, setMaxTime] = useState(timeBounds.max);
  const [maxPrice, setMaxPrice] = useState(priceBounds.max);

  useEffect(() => {
    setMaxTime(timeBounds.max);
    setMaxPrice(priceBounds.max);
  }, [timeBounds.max, priceBounds.max]);

  const sorted = [...recommendations].sort((a, b) =>
    sortKey === "weighted"
      ? (a.knee_score ?? a.norm_distance ?? Infinity) - (b.knee_score ?? b.norm_distance ?? Infinity)
      : sortKey === "price"
        ? a.price - b.price
        : a.total_minutes - b.total_minutes
  );

  const filtered = sorted.filter(
    (rec) => routeMinutes(rec) <= maxTime && rec.price <= maxPrice
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: OPTI.pageBg }}>
      <RouteHeader from={from} to={to} onBack={onBack} onEdit={onBack} />

      <div className="flex-1 overflow-y-auto pb-8">
        {/* 슬라이더 */}
        <div className="mx-4 mt-4 rounded-2xl p-4 bg-white" style={{ boxShadow: OPTI.cardShadow }}>
          <p className="text-[13px] font-bold mb-4" style={{ color: OPTI.text }}>원하는 조건 설정</p>
          <MaxOnlySlider
            label="최대 소요시간"
            bounds={timeBounds}
            value={maxTime}
            onChange={(v) => setMaxTime(roundMin(v))}
            step={0.1}
            formatValue={(v) => `${fmtMin(v)} 이내`}
            formatBound={fmtMin}
          />
          <div className="mt-4">
            <MaxOnlySlider
              label="최대 비용"
              bounds={priceBounds}
              value={maxPrice}
              onChange={setMaxPrice}
              step={100}
              formatValue={(v) => `${v.toLocaleString()}원 이내`}
              formatBound={(v) => `${v.toLocaleString()}원`}
            />
          </div>
        </div>

        {/* baseline 비교 */}
        <div className="px-4 mt-4">
          <p className="text-[12px] font-semibold mb-2 px-1" style={{ color: OPTI.textMuted }}>경로 비교</p>
          <div className="flex gap-2">
            <BaselineCard
              label="택시"
              type="taxi"
              minutes={baselines.taxi_only.minutes}
              price={baselines.taxi_only.price}
              barColor={OPTI.taxi}
            />
            <BaselineCard
              label="대중교통"
              type="transit"
              minutes={baselines.transit_only.minutes}
              price={baselines.transit_only.price}
              barColor={OPTI.primary}
            />
          </div>
        </div>

        {/* 추천 목록 */}
        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-2 px-1 gap-2">
            <p className="text-[12px] font-semibold" style={{ color: OPTI.textMuted }}>
              조건에 맞는 경로
              <span className="ml-1" style={{ color: OPTI.primary }}>{filtered.length}개</span>
            </p>
            <div className="flex rounded-full p-0.5 gap-0.5 flex-shrink-0" style={{ background: "#f0f0f0" }}>
              {sortTabs.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSortKey(key)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                  style={{
                    background: sortKey === key ? OPTI.surface : "transparent",
                    color: sortKey === key ? OPTI.primary : OPTI.textHint,
                    boxShadow: sortKey === key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center" style={{ boxShadow: OPTI.cardShadowSm }}>
              <p className="text-[13px]" style={{ color: OPTI.textLight }}>조건에 맞는 경로가 없어요</p>
              <p className="text-[11px] mt-1" style={{ color: "#ccc" }}>슬라이더를 조정해보세요</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filtered.map((rec) => (
                <RecommendCard key={rec.rank} rec={rec} onClick={() => onSelectCard(rec)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MaxOnlySlider({
  label,
  bounds,
  value,
  onChange,
  step,
  formatValue,
  formatBound,
}: {
  label: string;
  bounds: { min: number; max: number };
  value: number;
  onChange: (v: number) => void;
  step: number;
  formatValue: (v: number) => string;
  formatBound: (v: number) => string;
}) {
  const span = bounds.max - bounds.min || 1;
  const pct = ((value - bounds.min) / span) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px]" style={{ color: OPTI.textSecondary }}>{label}</span>
        <span className="text-[13px] font-bold" style={{ color: OPTI.primary }}>{formatValue(value)}</span>
      </div>
      <input
        type="range"
        min={bounds.min}
        max={bounds.max}
        step={step}
        value={value}
        disabled={bounds.min >= bounds.max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="opti-range w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${OPTI.primary} 0%, ${OPTI.primary} ${pct}%, #e5e5e5 ${pct}%, #e5e5e5 100%)`,
        }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[10px]" style={{ color: OPTI.textLight }}>{formatBound(bounds.min)}</span>
        <span className="text-[10px]" style={{ color: OPTI.textLight }}>{formatBound(bounds.max)}</span>
      </div>
    </div>
  );
}

function BaselineCard({
  label,
  type,
  minutes,
  price,
  barColor,
}: {
  label: string;
  type: "taxi" | "transit";
  minutes: number;
  price: number;
  barColor: string;
}) {
  const badge =
    type === "taxi"
      ? { bg: OPTI.taxiBadgeBg, color: OPTI.taxiBadgeText }
      : { bg: OPTI.transitBadgeBg, color: OPTI.primary };

  return (
    <div className="flex-1 bg-white rounded-2xl p-3 text-left" style={{ boxShadow: OPTI.cardShadowSm }}>
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-2"
        style={{ background: badge.bg, color: badge.color }}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-0.5 mb-2">
        <span className="text-[24px] font-black" style={{ color: OPTI.text }}>{roundMin(minutes)}</span>
        <span className="text-[12px]" style={{ color: OPTI.textMuted }}>분</span>
      </div>
      <div className="rounded-full overflow-hidden mb-2" style={{ height: 5, background: barColor }} />
      <div className="text-[11px]" style={{ color: OPTI.textMuted }}>{price.toLocaleString()}원</div>
    </div>
  );
}

function RecommendCard({ rec, onClick }: { rec: Recommendation; onClick: () => void }) {
  const transitRatio = rec.transit_segment.minutes / rec.total_minutes;
  const walkMin = rec.transit_segment.walk_minutes ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-2xl p-4 text-left w-full active:scale-[0.99] transition-transform"
      style={{ boxShadow: OPTI.cardShadowSm }}
    >
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: OPTI.hybridBadgeBg, color: OPTI.hybridBadgeText }}
          >
            택시+대중교통
          </span>
          {rec.is_knee && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: OPTI.recommendBadgeBg, color: OPTI.recommendBadgeText }}
            >
              추천
            </span>
          )}
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "#f0f0f0", color: OPTI.textMuted }}
          >
            {rec.rank}순위
          </span>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-[20px] font-black" style={{ color: OPTI.text }}>{roundMin(rec.total_minutes)}</span>
          <span className="text-[12px] ml-0.5" style={{ color: OPTI.textMuted }}>분</span>
        </div>
      </div>

      <p className="text-[12px] mb-2.5" style={{ color: OPTI.textMuted }}>📍 {rec.transfer_point} 환승</p>

      <div className="flex rounded-full overflow-hidden mb-2.5" style={{ height: 7 }}>
        <div style={{ width: `${transitRatio * 100}%`, background: OPTI.primary }} />
        <div style={{ width: `${(1 - transitRatio) * 100}%`, background: OPTI.taxi }} />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3 text-[11px]" style={{ color: OPTI.textSecondary }}>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: OPTI.primary }} />
          <span>{rec.transit_segment.lines[0]?.name ?? "대중교통"}</span>
        </div>
        <span style={{ color: "#ddd" }}>›</span>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: OPTI.taxi }} />
          <span>택시</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t" style={{ borderColor: OPTI.pageBg }}>
        <div className="flex items-center gap-2 text-[11px]" style={{ color: OPTI.textHint }}>
          {walkMin > 0 && <span>도보 {fmtMin(walkMin)}</span>}
          {rec.transit_segment.transfers > 0 && <span>환승 {rec.transit_segment.transfers}회</span>}
        </div>
        <span className="text-[13px] font-bold" style={{ color: OPTI.text }}>{rec.price.toLocaleString()}원</span>
      </div>

      <div className="flex gap-3 mt-2 text-[11px]">
        <span style={{ color: OPTI.primary }}>🚇 {fmtMin(rec.savings.vs_transit_minutes)} 단축</span>
        <span style={{ color: OPTI.taxiBadgeText }}>🚕 {rec.savings.vs_taxi_price.toLocaleString()}원 절약</span>
      </div>
    </button>
  );
}
