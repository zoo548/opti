import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { OPTI } from "../optiTheme";

const STEPS = [
  "출발지·도착지 좌표 변환 중...",
  "환승 후보 정류장 탐색 중...",
  "대중교통 구간 계산 중...",
  "택시 구간 계산 중...",
  "파레토 프론티어 분석 중...",
  "최적 경로 순위 정렬 중...",
];

interface LoadingPageProps {
  onDone: () => void;
  origin?: string;
  destination?: string;
  allowedMinutes?: number | null;
}

export function LoadingPage({ onDone, origin, destination, allowedMinutes }: LoadingPageProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepDuration = 2800 / STEPS.length;
    const interval = setInterval(() => {
      setStepIdx((prev) => {
        const next = prev + 1;
        if (next >= STEPS.length) {
          clearInterval(interval);
          setTimeout(onDone, 600);
        }
        return Math.min(next, STEPS.length - 1);
      });
    }, stepDuration);
    return () => clearInterval(interval);
  }, [onDone]);

  useEffect(() => {
    const timer = setInterval(() => setProgress((p) => Math.min(p + 1.5, 100)), 40);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: OPTI.surface }}>
      <div className="px-4 pt-6 pb-2 text-center">
        <h1 className="text-[24px] font-black" style={{ color: OPTI.primary }}>OPTI</h1>
        <p className="text-[12px] mt-0.5" style={{ color: OPTI.textHint }}>분석 중</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-8">
        <div className="relative w-28 h-28">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r="40" fill="none" stroke="#e5e5e5" strokeWidth="5" />
            <circle
              cx="56"
              cy="56"
              r="40"
              fill="none"
              stroke={OPTI.primary}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[20px] font-bold" style={{ color: OPTI.text }}>{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="text-center">
          <motion.p
            key={stepIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[14px] font-semibold mb-1"
            style={{ color: OPTI.text }}
          >
            {STEPS[stepIdx]}
          </motion.p>
          <p className="text-[12px]" style={{ color: OPTI.textMuted }}>약 10~30초 소요됩니다</p>
        </div>

        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i <= stepIdx ? 20 : 8,
                height: 8,
                background: i <= stepIdx ? OPTI.primary : "#e5e5e5",
              }}
            />
          ))}
        </div>

        {(origin || destination) && (
          <div
            className="w-full rounded-2xl px-4 py-4"
            style={{ background: OPTI.inputBg, border: `1px solid ${OPTI.border}` }}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0 border-2" style={{ borderColor: OPTI.primary }} />
                <span className="truncate text-[13px]" style={{ color: OPTI.textSecondary }}>{origin ?? "출발지"}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: OPTI.primary }} />
                <span className="truncate text-[13px]" style={{ color: OPTI.textSecondary }}>{destination ?? "도착지"}</span>
              </div>
            </div>
            {allowedMinutes != null && allowedMinutes > 0 && (
              <span
                className="inline-block mt-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                style={{ background: OPTI.primaryLight, color: OPTI.primary }}
              >
                허용 {allowedMinutes}분
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
