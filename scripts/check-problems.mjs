/**
 * 出題プールの検証。`node --experimental-strip-types scripts/check-problems.mjs`
 *
 * 守るべき条件:
 * - ひらがな（長音「ー」を含む）のみ
 * - 20〜40文字
 * - ID と問題文が重複しない
 * - 各問題が難易度の帯に収まる
 * - 表現だけ差し替えた実質重複がない（文字列の近さで判定）
 * - 文型が偏っていない（同じ書き出しばかりにならない）
 */
import { PROBLEMS } from '../src/game/problems.ts';
import { DIFFICULTIES, DIFFICULTY_RANGES, difficultyOf, textLength } from '../src/game/difficulty.ts';

/** これ以上似ている2問は「表現だけ差し替えた重複」とみなす */
const NEAR_DUPLICATE_THRESHOLD = 0.8;

/** 同じ書き出しの問題が、全体のこの割合を超えたら偏りとみなす */
const MAX_SAME_OPENING_RATIO = 0.25;

/** 書き出しとして数える文字数 */
const OPENING_LENGTH = 4;

const hiragana = /^[\u3041-\u3096\u30FC]+$/;
const violations = [];
const counts = Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, 0]));

for (const problem of PROBLEMS) {
  const length = textLength(problem.prompt);
  const difficulty = difficultyOf(problem.prompt);
  counts[difficulty] += 1;

  const range = DIFFICULTY_RANGES[difficulty];
  if (length < range.min || length > range.max) {
    violations.push(`${problem.id}: 文字数 ${length} が ${difficulty} の範囲外`);
  }
  if (length < 20 || length > 40) {
    violations.push(`${problem.id}: 文字数 ${length} が全体の範囲外`);
  }
  if (!hiragana.test(problem.prompt)) {
    violations.push(`${problem.id}: ひらがな以外を含む`);
  }
}

const duplicateIds = PROBLEMS.length - new Set(PROBLEMS.map((problem) => problem.id)).size;
const duplicateText = PROBLEMS.length - new Set(PROBLEMS.map((problem) => problem.prompt)).size;
if (duplicateIds > 0) violations.push(`ID の重複: ${duplicateIds}`);
if (duplicateText > 0) violations.push(`問題文の重複: ${duplicateText}`);

for (const difficulty of DIFFICULTIES) {
  if (counts[difficulty] < 5) {
    violations.push(`${difficulty} の問題が5問未満 (${counts[difficulty]})`);
  }
}

/** Unicode コードポイント単位の Levenshtein 距離 */
function levenshteinDistance(a, b) {
  const left = Array.from(a);
  const right = Array.from(b);
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = new Array(right.length + 1);
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[right.length];
}

function similarity(a, b) {
  const longest = Math.max(Array.from(a).length, Array.from(b).length);
  if (longest === 0) return 1;
  return 1 - levenshteinDistance(a, b) / longest;
}

// 実質重複（表現だけ差し替えたもの）を検出する
const nearDuplicates = [];
for (let i = 0; i < PROBLEMS.length; i += 1) {
  for (let j = i + 1; j < PROBLEMS.length; j += 1) {
    const score = similarity(PROBLEMS[i].prompt, PROBLEMS[j].prompt);
    if (score >= NEAR_DUPLICATE_THRESHOLD) {
      nearDuplicates.push({ score, left: PROBLEMS[i], right: PROBLEMS[j] });
    }
  }
}
nearDuplicates.sort((a, b) => b.score - a.score);
for (const pair of nearDuplicates) {
  violations.push(
    `実質重複 ${pair.score.toFixed(3)}: ${pair.left.id}「${pair.left.prompt}」/ ${pair.right.id}「${pair.right.prompt}」`,
  );
}

// 書き出しの偏りを見る（「このぶんを〜」ばかり、を防ぐ）
const openings = new Map();
for (const problem of PROBLEMS) {
  const opening = Array.from(problem.prompt).slice(0, OPENING_LENGTH).join('');
  openings.set(opening, (openings.get(opening) ?? 0) + 1);
}
const limit = Math.floor(PROBLEMS.length * MAX_SAME_OPENING_RATIO);
for (const [opening, count] of openings) {
  if (count > limit) {
    violations.push(`書き出しの偏り: 「${opening}」が ${count} 問（上限 ${limit}）`);
  }
}

console.log(`問題数 ${PROBLEMS.length}`, counts);
console.log(`違反 ${violations.length} 件`);
for (const violation of violations) console.log('  -', violation);

process.exitCode = violations.length === 0 ? 0 : 1;
