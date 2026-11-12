/**
 * 判定ルール。MVP では AI を使わず、文字列の近さだけで合否を決める。
 * ルールを変更したら RULES_VERSION を上げ、ベストタイムの比較条件を分ける。
 */
export const RULES_VERSION = 'mvp-1';
export const SIMILARITY_THRESHOLD = 0.85;
export const MIN_INPUT_LENGTH_RATIO = 0.8;
export const PROBLEMS_PER_GAME = 5;

/** 浮動小数の丸め誤差で「ちょうど85%」が落ちないようにする許容差 */
const EPSILON = 1e-9;

export type JudgeFailureReason = 'empty' | 'too-short' | 'low-similarity';
export type JudgeReason = 'passed' | JudgeFailureReason;

export type JudgeResult = {
  passed: boolean;
  /** 0〜1。空文字との比較は 0 */
  similarity: number;
  normalizedPrompt: string;
  normalizedInput: string;
  reason: JudgeReason;
};

/**
 * 判定器の抽象。将来 AI 判定に差し替えられるよう、UI はこの型にだけ依存する。
 */
export interface Judge {
  readonly name: string;
  evaluate(prompt: string, input: string): JudgeResult;
}

/** NFKC 正規化と前後空白除去。内部の空白は削除しない。 */
export function normalizeText(value: string): string {
  return value.normalize('NFKC').trim();
}

/** Unicode コードポイント単位の Levenshtein 距離 */
export function levenshteinDistance(a: string, b: string): number {
  const left = Array.from(a);
  const right = Array.from(b);

  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  let previous = new Array<number>(right.length + 1);
  for (let j = 0; j <= right.length; j += 1) previous[j] = j;

  for (let i = 1; i <= left.length; i += 1) {
    const current = new Array<number>(right.length + 1);
    current[0] = i;

    for (let j = 1; j <= right.length; j += 1) {
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost,
      );
    }

    previous = current;
  }

  return previous[right.length];
}

/**
 * similarity = 1 - d / max(n, m)。空文字を含む比較は 0。
 */
export function similarityScore(normalizedPrompt: string, normalizedInput: string): number {
  const promptLength = Array.from(normalizedPrompt).length;
  const inputLength = Array.from(normalizedInput).length;

  if (promptLength === 0 || inputLength === 0) return 0;

  const distance = levenshteinDistance(normalizedPrompt, normalizedInput);
  return 1 - distance / Math.max(promptLength, inputLength);
}

/** 入力長が正解長の80%以上か */
export function hasEnoughLength(promptLength: number, inputLength: number): boolean {
  return inputLength >= promptLength * MIN_INPUT_LENGTH_RATIO;
}

export class SimilarityJudge implements Judge {
  readonly name = 'similarity';

  evaluate(prompt: string, input: string): JudgeResult {
    const normalizedPrompt = normalizeText(prompt);
    const normalizedInput = normalizeText(input);
    const promptLength = Array.from(normalizedPrompt).length;
    const inputLength = Array.from(normalizedInput).length;

    if (promptLength === 0 || inputLength === 0) {
      return {
        passed: false,
        similarity: 0,
        normalizedPrompt,
        normalizedInput,
        reason: 'empty',
      };
    }

    const similarity = similarityScore(normalizedPrompt, normalizedInput);

    if (!hasEnoughLength(promptLength, inputLength)) {
      return {
        passed: false,
        similarity,
        normalizedPrompt,
        normalizedInput,
        reason: 'too-short',
      };
    }

    if (similarity + EPSILON < SIMILARITY_THRESHOLD) {
      return {
        passed: false,
        similarity,
        normalizedPrompt,
        normalizedInput,
        reason: 'low-similarity',
      };
    }

    return {
      passed: true,
      similarity,
      normalizedPrompt,
      normalizedInput,
      reason: 'passed',
    };
  }
}

export const similarityJudge = new SimilarityJudge();
