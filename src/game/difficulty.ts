import type { Problem } from './types';

/** 文字数帯。同じ帯の中だけで出題・記録するので、タイムを比較できる。 */
export type Difficulty = 'short' | 'medium' | 'long';

export const DIFFICULTIES: Difficulty[] = ['short', 'medium', 'long'];

/** 選択肢に出す文言。帯の範囲までここに含める（二重表記を避ける）。 */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  short: '短め 20〜21文字',
  medium: 'ふつう 22〜26文字',
  long: '長め 27文字以上',
};

/** 約束した文字数の範囲。テストで全問題が収まっていることを検証する。 */
export const DIFFICULTY_RANGES: Record<Difficulty, { min: number; max: number }> = {
  short: { min: 20, max: 21 },
  medium: { min: 22, max: 26 },
  long: { min: 27, max: 40 },
};

export function textLength(prompt: string): number {
  return Array.from(prompt).length;
}

export function difficultyOf(prompt: string): Difficulty {
  const length = textLength(prompt);
  if (length <= DIFFICULTY_RANGES.short.max) return 'short';
  if (length <= DIFFICULTY_RANGES.medium.max) return 'medium';
  return 'long';
}

export function problemsForDifficulty(pool: Problem[], difficulty: Difficulty): Problem[] {
  return pool.filter((problem) => difficultyOf(problem.prompt) === difficulty);
}

/**
 * 難易度を「全問同じ帯」で選ぶか「混ぜる」か。
 * 記録の比較単位が変わるので、文字列として保存する。
 */
export type MixMode = Difficulty | 'mixed';

export const MIX_LABELS: Record<MixMode, string> = {
  short: '短め',
  medium: 'ふつう',
  long: '長め',
  mixed: '混ぜる',
};
