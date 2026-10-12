export const STEP_COUNT = 8;

export function stepNumber(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= STEP_COUNT ? n : 1;
}
