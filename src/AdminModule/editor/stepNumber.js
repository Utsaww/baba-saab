export const STEP_COUNT = 9;

export function stepNumber(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= STEP_COUNT ? n : 1;
}
