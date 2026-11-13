import { describe, expect, it } from 'vitest';
import {
  DIFFICULTIES,
  DIFFICULTY_RANGES,
  difficultyOf,
  problemsForDifficulty,
  textLength,
} from '../game/difficulty';
import { PROBLEMS } from '../game/problems';
import {
  SEED_SPACE,
  formatSeed,
  parseSeed,
  pickProblems,
  pickProblemsWithSeed,
  randomSeed,
  seedFromString,
  seededRandom,
} from '../game/selection';

describe('難易度の帯', () => {
  it('文字数から帯を判定する', () => {
    expect(difficultyOf('あ'.repeat(20))).toBe('short');
    expect(difficultyOf('あ'.repeat(21))).toBe('short');
    expect(difficultyOf('あ'.repeat(22))).toBe('medium');
    expect(difficultyOf('あ'.repeat(26))).toBe('medium');
    expect(difficultyOf('あ'.repeat(27))).toBe('long');
    expect(difficultyOf('あ'.repeat(40))).toBe('long');
  });

  it('帯の範囲が重ならない', () => {
    const ranges = DIFFICULTIES.map((difficulty) => DIFFICULTY_RANGES[difficulty]);
    for (let i = 1; i < ranges.length; i += 1) {
      expect(ranges[i].min).toBe(ranges[i - 1].max + 1);
    }
  });

  it('全問題がどこかの帯に収まっている', () => {
    for (const problem of PROBLEMS) {
      const difficulty = difficultyOf(problem.prompt);
      const range = DIFFICULTY_RANGES[difficulty];
      const length = textLength(problem.prompt);
      expect(length).toBeGreaterThanOrEqual(range.min);
      expect(length).toBeLessThanOrEqual(range.max);
    }
  });

  it('帯ごとに絞り込める', () => {
    for (const difficulty of DIFFICULTIES) {
      const filtered = problemsForDifficulty(PROBLEMS, difficulty);
      expect(filtered.length).toBeGreaterThanOrEqual(20);
      for (const problem of filtered) {
        expect(difficultyOf(problem.prompt)).toBe(difficulty);
      }
    }
  });

  it('帯ごとの問題数が5問以上ある', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(problemsForDifficulty(PROBLEMS, difficulty).length).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('シード付きの抽選', () => {
  it('同じシードからは同じ並びが出る', () => {
    const a = seededRandom(12345);
    const b = seededRandom(12345);
    const left = Array.from({ length: 10 }, () => a());
    const right = Array.from({ length: 10 }, () => b());
    expect(left).toEqual(right);
  });

  it('違うシードでは違う並びになる', () => {
    const a = seededRandom(1);
    const b = seededRandom(2);
    expect(a()).not.toBe(b());
  });

  it('0〜1の値を返す', () => {
    const random = seededRandom(999);
    for (let i = 0; i < 200; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('同じシードなら同じ問題セットになる', () => {
    const first = pickProblemsWithSeed(PROBLEMS, 5, 42);
    const second = pickProblemsWithSeed(PROBLEMS, 5, 42);
    expect(first.map((problem) => problem.id)).toEqual(second.map((problem) => problem.id));
  });

  it('シードが違えば別のセットになる', () => {
    const first = pickProblemsWithSeed(PROBLEMS, 5, 1);
    const second = pickProblemsWithSeed(PROBLEMS, 5, 2);
    expect(first.map((problem) => problem.id)).not.toEqual(second.map((problem) => problem.id));
  });

  it('シード付きでも重複しない', () => {
    const picked = pickProblemsWithSeed(PROBLEMS, 5, 777);
    expect(new Set(picked.map((problem) => problem.id)).size).toBe(5);
  });

  it('文字列から安定したシードを作る', () => {
    expect(seedFromString('abc')).toBe(seedFromString('abc'));
    expect(seedFromString('abc')).not.toBe(seedFromString('abd'));
  });

  it('シードを6桁の36進で往復できる', () => {
    for (const seed of [0, 1, 42, 123456, SEED_SPACE - 1]) {
      const text = formatSeed(seed);
      expect(text).toHaveLength(6);
      expect(parseSeed(text)).toBe(seed);
    }
  });

  it('不正なシード文字列は null', () => {
    expect(parseSeed(null)).toBeNull();
    expect(parseSeed('')).toBeNull();
    expect(parseSeed('***')).toBeNull();
    expect(parseSeed('あいう')).toBeNull();
  });

  it('ランダムシードは表せる範囲に収まる', () => {
    for (const value of [0, 0.5, 0.999999]) {
      const seed = randomSeed(() => value);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(SEED_SPACE);
      expect(Number.isInteger(seed)).toBe(true);
    }
  });

  it('random を渡さない pickProblems は従来どおり動く', () => {
    const picked = pickProblems(PROBLEMS, 5, () => 0.5);
    expect(picked).toHaveLength(5);
  });
});
