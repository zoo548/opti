/** 분(minutes) 표시용 — 소수점 1자리 반올림 */
export function roundMin(n: number): number {
  return Math.round(n * 10) / 10;
}

export function fmtMin(n: number): string {
  return `${roundMin(n)}분`;
}
