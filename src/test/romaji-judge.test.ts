import { describe, expect, it } from 'vitest';
import { multiScriptJudge, normalizeRomaji, similarityJudge } from '../game/judge';
import { PROBLEMS } from '../game/problems';
import { toRomaji } from '../game/romaji';

describe('ローマ字入力の判定', () => {
  const prompt = 'このぶんをまとめてください';

  it('ローマ字で打ち切れば合格する', () => {
    const result = multiScriptJudge.evaluate(prompt, toRomaji(prompt));
    expect(result.passed).toBe(true);
    expect(result.matchedAs).toBe('romaji');
  });

  it('ひらがなで打っても合格する', () => {
    const result = multiScriptJudge.evaluate(prompt, prompt);
    expect(result.passed).toBe(true);
    expect(result.matchedAs).toBe('kana');
  });

  it('ローマ字は大文字・空白・アポストロフィ・ハイフンの揺れを吸収する', () => {
    const romaji = toRomaji(prompt);
    expect(multiScriptJudge.evaluate(prompt, romaji.toUpperCase()).passed).toBe(true);
    expect(multiScriptJudge.evaluate(prompt, ` ${romaji} `).passed).toBe(true);
    // 区切り記号を入れても通る
    const withMarks = romaji.replace(/n/g, "n'");
    expect(multiScriptJudge.evaluate(prompt, withMarks).passed).toBe(true);
  });

  it('長音のハイフンを入れ忘れても通る（表記ゆれの吸収）', () => {
    const withLong = 'こーどのばぐをなおして';
    const romaji = toRomaji(withLong);
    expect(romaji).toContain('-');
    // ハイフンを抜いた文字列でも合格する
    expect(multiScriptJudge.evaluate(withLong, romaji.replace(/-/g, '')).passed).toBe(true);
  });

  it('ローマ字で少し間違えても85%以上なら合格する', () => {
    const romaji = toRomaji(prompt);
    // 1文字だけ置き換える
    const typo = `${romaji.slice(0, -1)}x`;
    const result = multiScriptJudge.evaluate(prompt, typo);
    expect(result.passed).toBe(true);
    expect(result.matchedAs).toBe('romaji');
  });

  it('ローマ字で大きく間違えると不合格', () => {
    const result = multiScriptJudge.evaluate(prompt, 'abcdefghijklmn');
    expect(result.passed).toBe(false);
  });

  it('短すぎるローマ字は不合格', () => {
    const romaji = toRomaji(prompt);
    const result = multiScriptJudge.evaluate(prompt, romaji.slice(0, 5));
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('too-short');
  });

  it('空入力は不合格', () => {
    const result = multiScriptJudge.evaluate(prompt, '   ');
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('empty');
  });

  it('不合格のときは類似度の高い方の結果を返す', () => {
    const romaji = toRomaji(prompt);
    const result = multiScriptJudge.evaluate(prompt, romaji.slice(0, 10));
    expect(result.passed).toBe(false);
    expect(result.similarity).toBeGreaterThan(0);
  });

  it('全112問がローマ字で合格する', () => {
    for (const problem of PROBLEMS) {
      const result = multiScriptJudge.evaluate(problem.prompt, toRomaji(problem.prompt));
      expect(result.passed, `${problem.id}: ${problem.prompt}`).toBe(true);
      expect(result.matchedAs).toBe('romaji');
    }
  });

  it('全112問がひらがなでも合格する', () => {
    for (const problem of PROBLEMS) {
      const result = multiScriptJudge.evaluate(problem.prompt, problem.prompt);
      expect(result.passed, `${problem.id}: ${problem.prompt}`).toBe(true);
      expect(result.matchedAs).toBe('kana');
    }
  });

  it('ひらがな用の判定器は従来どおり（ローマ字は不合格）', () => {
    const result = similarityJudge.evaluate(prompt, toRomaji(prompt));
    expect(result.passed).toBe(false);
  });
});

describe('normalizeRomaji', () => {
  it('小文字化して区切り記号を落とす', () => {
    expect(normalizeRomaji(" HON'YAKU ")).toBe('honyaku');
    expect(normalizeRomaji('ko-do')).toBe('kodo');
    expect(normalizeRomaji('ko do')).toBe('kodo');
  });

  it('全角英数字は NFKC で正規化する', () => {
    expect(normalizeRomaji('ＫＯ－ＤＯ')).toBe('kodo');
  });
});
