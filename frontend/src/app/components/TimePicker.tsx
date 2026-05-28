import { useEffect, useRef } from "react";

const CYAN = "#4CC8F0";
const BORDER = "rgba(255,255,255,0.24)";
const MUTED = "#FFFFFF";

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const AMPM = [0, 1] as const;

const pad2 = (n: number) => String(n).padStart(2, "0");

function parseTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  return { hour: Number.isFinite(h) ? h : 0, minute: Number.isFinite(m) ? m : 0 };
}

function snapMinute(m: number) {
  return Math.min(55, Math.round(m / 5) * 5);
}

export function to12h(hour24: number) {
  const isPM = hour24 >= 12;
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, isPM };
}

export function to24h(hour12: number, isPM: boolean) {
  if (hour12 === 12) return isPM ? 12 : 0;
  return isPM ? hour12 + 12 : hour12;
}

function formatTime24(hour24: number, minute: number) {
  return `${pad2(hour24)}:${pad2(snapMinute(minute))}`;
}

/** 24h HH:mm → "3:30 PM" */
export function formatTime12Label(timeHHmm: string) {
  const { hour, minute } = parseTime(timeHHmm);
  const { hour12, isPM } = to12h(hour);
  return `${hour12}:${pad2(snapMinute(minute))} ${isPM ? "PM" : "AM"}`;
}

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
}

function ScrollColumn<T extends number>({
  items,
  selected,
  onSelect,
  format,
  narrow,
}: {
  items: readonly T[];
  selected: T;
  onSelect: (v: T) => void;
  format: (v: T) => string;
  narrow?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const itemH = 44;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = items.indexOf(selected);
    if (idx >= 0) {
      el.scrollTo({ top: idx * itemH, behavior: "smooth" });
    }
  }, [selected, items]);

  return (
    <div className={`relative ${narrow ? "max-w-[72px]" : "flex-1"}`}>
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 rounded-xl"
        style={{
          height: itemH,
          background: "linear-gradient(180deg, rgba(76,200,240,0.18) 0%, rgba(76,200,240,0.08) 100%)",
          border: "1px solid rgba(76,200,240,0.25)",
          boxShadow: "0 0 20px rgba(76,200,240,0.15)",
        }}
      />
      <div
        ref={ref}
        className="h-[132px] overflow-y-auto scrollbar-hide snap-y snap-mandatory"
        style={{ scrollPaddingTop: itemH, scrollPaddingBottom: itemH }}
        onScroll={() => {
          const el = ref.current;
          if (!el) return;
          const idx = Math.round(el.scrollTop / itemH);
          const v = items[Math.min(Math.max(idx, 0), items.length - 1)];
          if (v !== selected) onSelect(v);
        }}
      >
        <div style={{ height: itemH }} />
        {items.map((v) => {
          const active = v === selected;
          return (
            <button
              key={v}
              type="button"
              className="w-full snap-center flex items-center justify-center transition-all"
              style={{
                height: itemH,
                fontSize: active ? (narrow ? "1.125rem" : "1.5rem") : narrow ? "0.9375rem" : "1.125rem",
                fontWeight: active ? 800 : 500,
                color: active ? CYAN : MUTED,
                opacity: active ? 1 : 0.5,
              }}
              onClick={() => onSelect(v)}
            >
              {format(v)}
            </button>
          );
        })}
        <div style={{ height: itemH }} />
      </div>
    </div>
  );
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const { hour, minute } = parseTime(value);
  const snapped = snapMinute(minute);
  const { hour12, isPM } = to12h(hour);
  const pm = isPM ? 1 : 0;

  const update = (h12: number, nextPm: number, min: number) => {
    onChange(formatTime24(to24h(h12, nextPm === 1), min));
  };

  return (
    <div
      className="rounded-2xl px-3 py-3"
      style={{
        background: "linear-gradient(180deg, #2A3142 0%, #222838 100%)",
        border: `1px solid ${BORDER}`,
        boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 4px 16px rgba(0,0,0,0.25)",
      }}
    >
      <div className="flex items-center gap-1">
        <ScrollColumn
          items={HOURS_12}
          selected={hour12}
          onSelect={(h12) => update(h12, pm, snapped)}
          format={(v) => String(v)}
        />
        <span style={{ fontSize: "1.5rem", fontWeight: 800, color: MUTED, paddingBottom: 4 }}>:</span>
        <ScrollColumn
          items={MINUTES}
          selected={snapped}
          onSelect={(m) => update(hour12, pm, m)}
          format={(v) => pad2(v)}
        />
        <ScrollColumn
          items={AMPM}
          selected={pm}
          onSelect={(p) => update(hour12, p, snapped)}
          format={(v) => (v === 0 ? "AM" : "PM")}
          narrow
        />
      </div>
    </div>
  );
}
