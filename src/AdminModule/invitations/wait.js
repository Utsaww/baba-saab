// Its own module so tests can replace the delay between re-reads.
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
