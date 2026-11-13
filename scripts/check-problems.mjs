/**
 * 出題プールの検証。`node --experimental-strip-types scripts/check-problems.mjs`
 *
 * 守るべき条件:
 * - ひらがな（長音「ー」を含む）のみ
 * - 20〜40文字
 * - ID と問題文が重複しない
 * - 各問題が難易度の帯に収まる
 */
import { PROBLEMS } from '../src/game/problems.ts';
import { DIFFICULTIES, DIFFICULTY_RANGES, difficultyOf } from '../src/game/difficulty.ts';
import { textLength } from '../src/game/difficulty.ts';

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

console.log(`問題数 ${PROBLEMS.length}`, counts);
console.log(`違反 ${violations.length} 件`);
for (const violation of violations) console.log('  -', violation);

process.exitCode = violations.length === 0 ? 0 : 1;
