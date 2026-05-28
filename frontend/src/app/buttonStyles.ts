import type { CSSProperties } from "react";

/** 3D depth shadows for buttons & controls */

export const SHADOW_ICON =
  "0 1px 0 rgba(255,255,255,0.14) inset, 0 -1px 0 rgba(0,0,0,0.22) inset, 0 3px 8px rgba(0,0,0,0.35)";

export const SHADOW_ICON_ACCENT =
  "0 1px 0 rgba(255,255,255,0.22) inset, 0 -1px 0 rgba(0,0,0,0.15) inset, 0 3px 10px rgba(76,200,240,0.4), 0 1px 3px rgba(0,0,0,0.3)";

export const SHADOW_CARD_BTN =
  "0 1px 0 rgba(255,255,255,0.07) inset, 0 4px 14px rgba(0,0,0,0.32), 0 1px 2px rgba(0,0,0,0.22)";

export const SHADOW_CARD_BTN_HOVER =
  "0 1px 0 rgba(255,255,255,0.1) inset, 0 6px 18px rgba(0,0,0,0.38), 0 0 0 1px rgba(76,200,240,0.25)";

export function primaryButtonStyle(enabled: boolean): CSSProperties {
  if (!enabled) {
    return {
      background: "linear-gradient(180deg, #3A4258 0%, #2A3050 100%)",
      boxShadow:
        "0 1px 0 rgba(255,255,255,0.08) inset, 0 3px 6px rgba(0,0,0,0.3)",
      border: "1px solid rgba(0,0,0,0.25)",
    };
  }
  return {
    background: "linear-gradient(180deg, #6DD8F7 0%, #4CC8F0 42%, #35A8D4 100%)",
    boxShadow:
      "0 1px 0 rgba(255,255,255,0.5) inset, 0 -2px 0 rgba(0,0,0,0.1) inset, 0 4px 0 #2A9BC4, 0 8px 22px rgba(76,200,240,0.5), 0 12px 28px rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.18)",
  };
}

export function sortTabStyle(active: boolean): CSSProperties {
  if (!active) return {};
  return {
    background: "linear-gradient(180deg, #6DD8F7 0%, #4CC8F0 50%, #38B0DC 100%)",
    boxShadow:
      "0 1px 0 rgba(255,255,255,0.38) inset, 0 2px 0 rgba(0,0,0,0.08) inset, 0 3px 8px rgba(0,0,0,0.22), 0 4px 14px rgba(76,200,240,0.45)",
    border: "1px solid rgba(255,255,255,0.14)",
  };
}

export function toggleTrackStyle(on: boolean): CSSProperties {
  return on
    ? {
        background: "linear-gradient(180deg, #6DD8F7 0%, #4CC8F0 100%)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.1) inset, 0 2px 6px rgba(76,200,240,0.45)",
      }
    : {
        background: "linear-gradient(180deg, #404A60 0%, #2A3050 100%)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.08) inset, 0 2px 4px rgba(0,0,0,0.28)",
      };
}

export function toggleKnobStyle(): CSSProperties {
  return {
    boxShadow:
      "0 1px 0 rgba(255,255,255,0.25) inset, 0 2px 5px rgba(0,0,0,0.4)",
  };
}
