export function getIn(obj, path) {
  return path.reduce((value, key) => (value == null ? undefined : value[key]), obj);
}

/** A copy of `obj` with `value` at `path`; `undefined` removes the key. Untouched branches are shared. */
export function setIn(obj, path, value) {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const copy = Array.isArray(obj) ? [...obj] : { ...(obj ?? {}) };
  const next = setIn(obj?.[head], rest, value);
  if (next === undefined && !Array.isArray(copy)) delete copy[head];
  else copy[head] = next;
  return copy;
}
