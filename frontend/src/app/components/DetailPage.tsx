import { Recommendation } from "./mockData";
import { RouteHeader } from "./RouteHeader";
import { fmtMin, roundMin } from "../formatMinutes";
import { OPTI } from "../optiTheme";

interface DetailPageProps {
  from: string;
  to: string;
  rec: Recommendation;
  baselines: {
    transit_only: { minutes: number; price: number };
    taxi_only: { minutes: number; price: number };
  };
  onBack: () => void;
}

export function DetailPage({ from, to, rec, baselines, onBack }: DetailPageProps) {
  const walkMin = rec.transit_segment.walk_minutes ?? 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: OPTI.pageBg }}>
      <div className="bg-white pb-4" style={{ boxShadow: OPTI.headerShadow }}>
        <RouteHeader from={from} to={to} onBack={onBack} />
        <div className="px-4 pt-1">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: OPTI.hybridBadgeBg, color: OPTI.hybridBadgeText }}
            >
              택시+대중교통
            </span>
            <span className="text-[13px] font-semibold" style={{ color: OPTI.text }}>{rec.transfer_point} 환승</span>
          </div>
          <div className="flex items-center gap-4 px-1">
            <div>
              <span className="text-[28px] font-bold" style={{ color: OPTI.text }}>{roundMin(rec.total_minutes)}</span>
              <span className="text-[14px] ml-1" style={{ color: OPTI.textMuted }}>분</span>
            </div>
            <div className="flex flex-col gap-0.5 text-[12px]" style={{ color: OPTI.textMuted }}>
              <span>🚇 교통비 {rec.transit_segment.price.toLocaleString()}원</span>
              <span>🚕 택시 {rec.taxi_segment.price.toLocaleString()}원</span>
              {walkMin > 0 && <span>🚶 도보 {fmtMin(walkMin)}</span>}
              {rec.transit_segment.transfers > 0 && <span>🔄 환승 {rec.transit_segment.transfers}회</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-10">
        {/* 타임라인 */}
        <div className="bg-white rounded-2xl px-4 py-2" style={{ boxShadow: OPTI.cardShadow }}>
          <TimelineStep
            type="start"
            name={from}
            desc="출발"
            color={OPTI.primary}
            isLast={false}
          />
          {walkMin > 0 && (
            <TimelineStep
              type="walk"
              name="도보 이동"
              desc={`${fmtMin(walkMin)}`}
              color="#aaa"
              isLast={false}
            />
          )}
          {rec.transit_segment.lines.map((line, i) => (
            <TimelineStep
              key={i}
              type="transit"
              name={`${line.name} (${line.from})`}
              desc={`${line.to} · ${fmtMin(line.minutes)}`}
              time={line.minutes}
              color={OPTI.primary}
              isLast={false}
            />
          ))}
          <TimelineStep
            type="transfer"
            name={`${rec.transfer_point} 환승`}
            desc={`택시 ${fmtMin(rec.taxi_segment.minutes)} · ${rec.taxi_segment.price.toLocaleString()}원`}
            color={OPTI.taxi}
            isLast={false}
          />
          <TimelineStep
            type="end"
            name={to}
            desc="도착"
            color={OPTI.error}
            isLast
          />
        </div>

        {/* 비용 */}
        <div className="mt-3 bg-white rounded-2xl p-4" style={{ boxShadow: OPTI.cardShadow }}>
          <p className="text-[13px] font-semibold mb-3" style={{ color: OPTI.text }}>비용 내역</p>
          <CostRow label="대중교통 요금" amount={rec.transit_segment.price} />
          <CostRow label="택시 요금" amount={rec.taxi_segment.price} />
          <div className="pt-2.5 mt-2.5 border-t" style={{ borderColor: OPTI.pageBg }}>
            <CostRow label="합계" amount={rec.price} bold />
          </div>
        </div>

        {/* 기준선 비교 */}
        <div className="mt-3 bg-white rounded-2xl p-4" style={{ boxShadow: OPTI.cardShadow }}>
          <p className="text-[13px] font-semibold mb-3" style={{ color: OPTI.text }}>기준선 비교</p>
          <CompareRow
            icon="🚇"
            label="대중교통만"
            sub={`${fmtMin(baselines.transit_only.minutes)} / ${baselines.transit_only.price.toLocaleString()}원`}
            badge={`-${fmtMin(rec.savings.vs_transit_minutes)}`}
            badgeColor={OPTI.primary}
          />
          <CompareRow
            icon="🚕"
            label="택시만"
            sub={`${fmtMin(baselines.taxi_only.minutes)} / ${baselines.taxi_only.price.toLocaleString()}원`}
            badge={`-${rec.savings.vs_taxi_price.toLocaleString()}원`}
            badgeColor={OPTI.taxiBadgeText}
          />
        </div>

        <div className="mt-3 px-1">
          <p className="text-[10px] text-center" style={{ color: OPTI.textLight }}>
            ODsay API · TMAP API · Kakao Mobility 데이터 기준
          </p>
        </div>
      </div>
    </div>
  );
}

function TimelineStep({
  type,
  name,
  desc,
  time,
  color,
  isLast,
}: {
  type: "start" | "walk" | "transit" | "transfer" | "end";
  name: string;
  desc: string;
  time?: number;
  color: string;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center" style={{ width: 20 }}>
        <div className="mt-4 flex-shrink-0">
          {type === "start" ? (
            <div className="w-3 h-3 rounded-full border-2 bg-white" style={{ borderColor: OPTI.primary }} />
          ) : type === "end" ? (
            <div className="w-3 h-3 rounded-sm" style={{ background: OPTI.error }} />
          ) : (
            <div className="w-3 h-3 rounded-full bg-white border-2" style={{ borderColor: color }} />
          )}
        </div>
        {!isLast && (
          <div
            className="flex-1 w-0.5 my-1"
            style={{
              background:
                type === "walk" || type === "transfer"
                  ? "repeating-linear-gradient(to bottom, #ddd 0px, #ddd 4px, transparent 4px, transparent 8px)"
                  : color,
              minHeight: 24,
              opacity: type === "walk" || type === "transfer" ? 1 : 0.35,
            }}
          />
        )}
      </div>
      <div className={`flex-1 py-3 ${!isLast ? "border-b" : ""}`} style={{ borderColor: OPTI.pageBg }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold" style={{ color: OPTI.text }}>{name}</p>
            <p className="text-[12px] mt-0.5" style={{ color: OPTI.textMuted }}>{desc}</p>
          </div>
          {time != null && (
            <span className="text-[13px] font-bold flex-shrink-0" style={{ color: OPTI.primary }}>{roundMin(time)}분</span>
          )}
        </div>
      </div>
    </div>
  );
}

function CostRow({ label, amount, bold }: { label: string; amount: number; bold?: boolean }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-[13px]" style={{ color: bold ? OPTI.text : OPTI.textMuted, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span className="text-[13px]" style={{ color: OPTI.text, fontWeight: bold ? 800 : 600 }}>{amount.toLocaleString()}원</span>
    </div>
  );
}

function CompareRow({
  icon,
  label,
  sub,
  badge,
  badgeColor,
}: {
  icon: string;
  label: string;
  sub: string;
  badge: string;
  badgeColor: string;
}) {
  return (
    <div
      className="flex items-center justify-between px-3 py-3 rounded-xl mb-2 last:mb-0"
      style={{ background: OPTI.pageBg }}
    >
      <div>
        <p className="text-[12px] font-semibold" style={{ color: OPTI.textSecondary }}>{icon} {label}</p>
        <p className="text-[11px]" style={{ color: OPTI.textMuted }}>{sub}</p>
      </div>
      <p className="text-[14px] font-bold" style={{ color: badgeColor }}>{badge}</p>
    </div>
  );
}
