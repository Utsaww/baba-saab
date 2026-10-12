/** Runs at most `max` async tasks at a time; the rest wait their turn. A rejection frees its slot. */
export function createLimiter(max) {
  let active = 0;
  const waiting = [];

  function next() {
    if (active >= max || waiting.length === 0) return;
    active += 1;
    const { fn, resolve, reject } = waiting.shift();
    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(() => {
        active -= 1;
        next();
      });
  }

  return function run(fn) {
    return new Promise((resolve, reject) => {
      waiting.push({ fn, resolve, reject });
      next();
    });
  };
}
