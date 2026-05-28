import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { OptiHeader } from "./OptiHeader";

const STEPS = [
  "출발지·도착지 좌표 변환 중...",
  "환승 후보 정류장 탐색 중...",
  "대중교통 구간 계산 중...",
  "택시 구간 계산 중...",
  "파레토 프론티어 분석 중...",
  "최적 경로 순위 정렬 중...",
];

const CYAN = "#4CC8F0";
const CARD = "#252A42";
const BG = "#1C2035";
const BORDER = "rgba(255,255,255,0.24)";
const TEXT = "#E8F0FF";
const MUTED = "#FFFFFF";
const DEEP = "#2A3050";

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
        if (next >= STEPS.length) { clearInterval(interval); setTimeout(onDone, 600); }
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
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <OptiHeader sub="분석 중" />

      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-8">
        {/* Orbit-inspired loader */}
        <div className="relative w-28 h-28">
          {/* Outer orbit ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(76,200,240,0.06)" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="56" cy="56" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
            <circle
              cx="56" cy="56" r="40" fill="none"
              stroke={CYAN} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
              style={{ transition: "stroke-dashoffset 0.1s linear", filter: `drop-shadow(0 0 10px ${CYAN}90)` }}
            />
          </svg>
          {/* Amber orbit dot (matches logo) */}
          <div
            className="absolute rounded-full"
            style={{
              width: "10px", height: "10px",
              background: "#F5A623",
              boxShadow: "0 0 10px rgba(245,166,35,0.8)",
              top: "50%", left: "50%",
              transform: `rotate(${progress * 3.6}deg) translateX(40px) translateY(-50%)`,
              transformOrigin: "0 50%",
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: TEXT }}>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Step */}
        <div className="text-center">
          <motion.p key={stepIdx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: "0.9375rem", color: TEXT, fontWeight: 600 }} className="mb-1">
            {STEPS[stepIdx]}
          </motion.p>
          <p style={{ fontSize: "0.8125rem", color: MUTED }}>약 10~30초 소요됩니다</p>
        </div>

        {/* Step dots */}
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300" style={{
              width: i <= stepIdx ? "20px" : "8px", height: "8px",
              background: i <= stepIdx ? CYAN : "rgba(255,255,255,0.08)",
              boxShadow: i <= stepIdx ? `0 0 6px ${CYAN}60` : "none",
            }} />
          ))}
        </div>

        {/* Route card */}
        {(origin || destination) && (
          <div className="w-full rounded-2xl px-4 py-4 flex items-center gap-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CYAN, boxShadow: `0 0 5px ${CYAN}80` }} />
                <span className="truncate" style={{ fontSize: "0.8125rem", color: MUTED }}>{origin ?? "출발지"}</span>
              </div>
              <div className="w-px h-3 ml-1" style={{ background: "rgba(255,255,255,0.1)" }} />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: CYAN, boxShadow: `0 0 5px ${CYAN}80` }} />
                <span className="truncate" style={{ fontSize: "0.8125rem", color: MUTED }}>{destination ?? "도착지"}</span>
              </div>
            </div>
            {allowedMinutes != null && allowedMinutes > 0 && (
              <span className="px-3 py-1.5 rounded-xl font-bold flex-shrink-0" style={{ background: `rgba(76,200,240,0.1)`, color: CYAN, fontSize: "0.75rem", border: `1px solid rgba(76,200,240,0.2)` }}>
                허용 {allowedMinutes}분
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
