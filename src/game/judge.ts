import { toRomaji } from './romaji';

/**
 * 判定ルール。MVP では AI を使わず、文字列の近さだけで合否を決める。
 * ルールを変更したら RULES_VERSION を上げ、ベストタイムの比較条件を分ける。
 */
export const RULES_VERSION = 'mvp-2';
export const SIMILARITY_THRESHOLD = 0.85;
export const MIN_INPUT_LENGTH_RATIO = 0.8;
export const PROBLEMS_PER_GAME = 5;

/** 浮動小数の丸め誤差で「ちょうど85%」が落ちないようにする許容差 */
const EPSILON = 1e-9;

export type JudgeFailureReason = 'empty' | 'too-short' | 'low-similarity';
export type JudgeReason = 'passed' | JudgeFailureReason;

/** 入力がどちらの表記として合格したか */
export type JudgeScript = 'kana' | 'romaji';

export type JudgeResult = {
  passed: boolean;
  /** 0〜1。空文字との比較は 0 */
  similarity: number;
  normalizedPrompt: string;
  normalizedInput: string;
  reason: JudgeReason;
  /** 合格した表記。不合格なら null */
  matchedAs: JudgeScript | null;
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

    return judgeAgainst(normalizedPrompt, normalizedInput, 'kana');
  }
}

/**
 * ひらがな・ローマ字の両方の正解と比べ、良いほうを採用する判定器。
 *
 * お題はひらがなだが、ローマ字で打ち込む人も同じように遊べるようにする。
 * 合格条件（類似度・長さ）はどちらの表記でも同じ。
 */
export class MultiScriptJudge implements Judge {
  readonly name = 'multi-script';

  evaluate(prompt: string, input: string): JudgeResult {
    const normalizedPrompt = normalizeText(prompt);
    const normalizedInput = normalizeText(input);

    const asKana = judgeAgainst(normalizedPrompt, normalizedInput, 'kana');
    const asRomaji = judgeAgainst(
      normalizeRomaji(toRomaji(normalizedPrompt)),
      normalizeRomaji(normalizedInput),
      'romaji',
    );

    // 合格している方を優先し、どちらも不合格なら類似度の高い方を返す
    if (asKana.passed) return asKana;
    if (asRomaji.passed) return asRomaji;
    return asRomaji.similarity > asKana.similarity ? asRomaji : asKana;
  }
}

/**
 * ローマ字の表記ゆれを吸収する。
 * 大文字・空白・アポストロフィ・ハイフンは無視する（shi/si のような流派差は対象外）。
 */
export function normalizeRomaji(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[\s'’\-ー]/g, '');
}

/** 正解文字列と入力文字列を、指定した表記として判定する */
function judgeAgainst(
  expected: string,
  actual: string,
  script: JudgeScript,
): JudgeResult {
  const promptLength = Array.from(expected).length;
  const inputLength = Array.from(actual).length;

  if (promptLength === 0 || inputLength === 0) {
    return {
      passed: false,
      similarity: 0,
      normalizedPrompt: expected,
      normalizedInput: actual,
      reason: 'empty',
      matchedAs: null,
    };
  }

  const similarity = similarityScore(expected, actual);

  if (!hasEnoughLength(promptLength, inputLength)) {
    return {
      passed: false,
      similarity,
      normalizedPrompt: expected,
      normalizedInput: actual,
      reason: 'too-short',
      matchedAs: null,
    };
  }

  if (similarity + EPSILON < SIMILARITY_THRESHOLD) {
    return {
      passed: false,
      similarity,
      normalizedPrompt: expected,
      normalizedInput: actual,
      reason: 'low-similarity',
      matchedAs: null,
    };
  }

  return {
    passed: true,
    similarity,
    normalizedPrompt: expected,
    normalizedInput: actual,
    reason: 'passed',
    matchedAs: script,
  };
}

export const similarityJudge = new SimilarityJudge();
export const multiScriptJudge = new MultiScriptJudge();
