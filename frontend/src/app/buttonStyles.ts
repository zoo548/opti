import type { CSSProperties } from "react";
import { OPTI } from "./optiTheme";

export const SHADOW_ICON = "none";
export const SHADOW_ICON_ACCENT = "none";
export const SHADOW_CARD_BTN = OPTI.cardShadowSm;
export const SHADOW_CARD_BTN_HOVER = "0 2px 10px rgba(0,0,0,0.1)";

export function primaryButtonStyle(enabled: boolean): CSSProperties {
  return {
    background: enabled ? OPTI.primary : OPTI.primaryDisabled,
    boxShadow: "none",
    border: "none",
  };
}

export function sortTabStyle(active: boolean): CSSProperties {
  if (!active) return { background: "transparent" };
  return {
    background: OPTI.surface,
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    border: "none",
  };
}

export function toggleTrackStyle(on: boolean): CSSProperties {
  return {
    background: on ? OPTI.primary : "#cbced4",
    boxShadow: "none",
  };
}

export function toggleKnobStyle(): CSSProperties {
  return { boxShadow: "0 1px 3px rgba(0,0,0,0.2)" };
}
