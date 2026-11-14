import { describe, expect, it } from 'vitest';
import { PROBLEMS } from '../game/problems';
import { toRomaji, toRomajiChunks } from '../game/romaji';

describe('ひらがな → ローマ字', () => {
  it('基本の五十音', () => {
    expect(toRomaji('あいうえお')).toBe('aiueo');
    expect(toRomaji('かきくけこ')).toBe('kakikukeko');
    expect(toRomaji('さしすせそ')).toBe('sashisuseso');
    expect(toRomaji('たちつてと')).toBe('tachitsuteto');
    expect(toRomaji('なにぬねの')).toBe('naninuneno');
    expect(toRomaji('はひふへほ')).toBe('hahifuheho');
    expect(toRomaji('まみむめも')).toBe('mamimumemo');
    expect(toRomaji('やゆよ')).toBe('yayuyo');
    expect(toRomaji('らりるれろ')).toBe('rarirurero');
    expect(toRomaji('わをん')).toBe('wawon');
  });

  it('濁音・半濁音', () => {
    expect(toRomaji('がぎぐげご')).toBe('gagigugego');
    expect(toRomaji('ざじずぜぞ')).toBe('zajizuzezo');
    expect(toRomaji('だぢづでど')).toBe('dajizudedo');
    expect(toRomaji('ばびぶべぼ')).toBe('babibubebo');
    expect(toRomaji('ぱぴぷぺぽ')).toBe('papipupepo');
  });

  it('拗音は2文字で1チャンク', () => {
    const chunks = toRomajiChunks('しゃしゅしょ');
    expect(chunks).toEqual([
      { kana: 'しゃ', romaji: 'sha' },
      { kana: 'しゅ', romaji: 'shu' },
      { kana: 'しょ', romaji: 'sho' },
    ]);
  });

  it('促音は次の子音を重ねる', () => {
    expect(toRomajiChunks('きって')).toEqual([
      { kana: 'き', romaji: 'ki' },
      { kana: 'っ', romaji: 't' },
      { kana: 'て', romaji: 'te' },
    ]);
    // 最終的な文字列としては「kitte」
    expect(toRomajiChunks('きって').map((c) => c.romaji).join('')).toBe('kitte');
  });

  it('促音のあとが拗音でも正しく重なる', () => {
    // しゅっちょ → shu + c + cho
    expect(toRomajiChunks('しゅっちょ').map((c) => c.romaji).join('')).toBe('shuccho');
  });

  it('ん は次が母音・や行なら n\' で区切る', () => {
    expect(toRomaji('ほんやく')).toBe("hon'yaku");
    expect(toRomaji('しんあい')).toBe("shin'ai");
    expect(toRomaji('かんじ')).toBe('kanji');
    expect(toRomaji('ぱん')).toBe('pan');
  });

  it('長音（ー）はハイフン', () => {
    expect(toRomaji('こーど')).toBe('ko-do');
    expect(toRomaji('めーる')).toBe('me-ru');
    expect(toRomajiChunks('こーど')).toEqual([
      { kana: 'こ', romaji: 'ko' },
      { kana: 'ー', romaji: '-' },
      { kana: 'ど', romaji: 'do' },
    ]);
  });

  it('小書きの母音', () => {
    expect(toRomaji('ぁぃぅぇぉ')).toBe('xaxixuxexo');
  });

  it('空文字は空配列', () => {
    expect(toRomajiChunks('')).toEqual([]);
    expect(toRomaji('')).toBe('');
  });

  it('チャンクの kana を連結すると元に戻る', () => {
    for (const problem of PROBLEMS.slice(0, 20)) {
      const joined = toRomajiChunks(problem.prompt)
        .map((chunk) => chunk.kana)
        .join('');
      expect(joined).toBe(problem.prompt);
    }
  });

  it('全文が英小文字・アポストロフィ・ハイフンだけで表せる', () => {
    for (const problem of PROBLEMS) {
      expect(toRomaji(problem.prompt)).toMatch(/^[a-z'-]+$/);
    }
  });

  it('どの問題にも変換漏れ（ひらがなが残る）がない', () => {
    for (const problem of PROBLEMS) {
      const romaji = toRomaji(problem.prompt);
      expect(romaji).not.toMatch(/[\u3041-\u3096]/);
    }
  });
});
