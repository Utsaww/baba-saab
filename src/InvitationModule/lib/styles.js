// Combine CSS modules: shared base classes plus a template's overrides under the same names.
export function mergeStyles(...modules) {
  const keys = new Set(modules.flatMap((m) => (m ? Object.keys(m) : [])));
  const merged = {};
  for (const key of keys) merged[key] = modules.map((m) => m?.[key]).filter(Boolean).join(" ");
  return merged;
}
