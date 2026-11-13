import type { Problem } from './types';

/**
 * シード付きの乱数（mulberry32）。
 * 同じシードからは必ず同じ並びが出るので、同じ問題セットを再現できる。
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 文字列から 32bit のシードを作る（結果画面の URL などに載せられる短さ） */
export function seedFromString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 6桁の36進で表せるシードの上限。表示と往復を一致させるため、この範囲に収める。 */
export const SEED_SPACE = 36 ** 6;

/** 人が読み書きできる短いシード（36進・6桁） */
export function formatSeed(seed: number): string {
  return (seed % SEED_SPACE).toString(36).padStart(6, '0');
}

export function parseSeed(value: string | null | undefined): number | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-z]{1,6}$/.test(normalized)) return null;
  const parsed = Number.parseInt(normalized, 36);
  return Number.isFinite(parsed) ? parsed % SEED_SPACE : null;
}

/** ランダムなシード */
export function randomSeed(random: () => number = Math.random): number {
  return Math.floor(random() * SEED_SPACE) % SEED_SPACE;
}

/**
 * プールから重複なしで count 問を選ぶ（Fisher–Yates）。
 * random をシード付きに差し替えれば、同じ問題セットを再現できる。
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

/** シードを指定して選ぶ。同じシード・同じプールなら必ず同じ結果になる。 */
export function pickProblemsWithSeed(pool: Problem[], count: number, seed: number): Problem[] {
  return pickProblems(pool, count, seededRandom(seed));
}
