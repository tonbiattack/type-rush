import type { Problem } from './types';

/**
 * プールから重複なしで count 問を選ぶ（Fisher–Yates）。
 * random を差し替えられるようにしてテストと将来のシード固定に対応する。
 */
export function pickProblems(
  pool: Problem[],
  count: number,
  random: () => number = Math.random,
): Problem[] {
  if (count < 0 || !Number.isInteger(count)) {
    throw new Error('count must be a non-negative integer');
  }
  if (count > pool.length) {
    throw new Error(`cannot pick ${count} problems from a pool of ${pool.length}`);
  }

  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}
