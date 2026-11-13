import { describe, expect, it } from 'vitest';
import { RANKS, TOP_RANK, LOWEST_RANK, rankFor, rankProgress } from '../game/rank';

describe('ランク定義', () => {
  it('最高位は「AIの神」', () => {
    expect(TOP_RANK.label).toBe('AIの神');
    expect(RANKS[0]).toBe(TOP_RANK);
  });

  it('最下位は「AI入門者」で閾値0', () => {
    expect(LOWEST_RANK.label).toBe('AI入門者');
    expect(LOWEST_RANK.minCps).toBe(0);
  });

  it('AI時代の称号が並んでいる', () => {
    const labels = RANKS.map((rank) => rank.label);
    expect(labels).toEqual([
      'AIの神',
      'バイブコーダー',
      'プロンプト職人',
      '打鍵の達人',
      'バイブ見習い',
      'コピペ職人',
      'AI入門者',
    ]);
  });

  it('すべてのランクに説明と色と英語タグラインがある', () => {
    for (const rank of RANKS) {
      expect(rank.summary.length).toBeGreaterThan(0);
      expect(rank.tagline.length).toBeGreaterThan(0);
      expect(rank.badgeClass).toContain('border');
      expect(rank.barClass).toContain('bg-');
      expect(rank.textClass).toContain('text-');
    }
  });

  it('閾値が速い順に降順で並んでいる', () => {
    const cps = RANKS.map((rank) => rank.minCps);
    const sorted = [...cps].sort((a, b) => b - a);
    expect(cps).toEqual(sorted);
  });

  it('ラベルとIDが重複しない', () => {
    expect(new Set(RANKS.map((rank) => rank.id)).size).toBe(RANKS.length);
    expect(new Set(RANKS.map((rank) => rank.label)).size).toBe(RANKS.length);
  });
});

describe('rankFor', () => {
  it('6文字/秒以上は「AIの神」', () => {
    expect(rankFor(6).label).toBe('AIの神');
    expect(rankFor(25.4).label).toBe('AIの神');
    expect(rankFor(1000).label).toBe('AIの神');
  });

  it('境界値ちょうどはそのランクに入る', () => {
    expect(rankFor(4.5).label).toBe('バイブコーダー');
    expect(rankFor(3.5).label).toBe('プロンプト職人');
    expect(rankFor(2.7).label).toBe('打鍵の達人');
    expect(rankFor(2).label).toBe('バイブ見習い');
    expect(rankFor(1.5).label).toBe('コピペ職人');
  });

  it('境界値の直前は1つ下のランク', () => {
    expect(rankFor(5.999).label).toBe('バイブコーダー');
    expect(rankFor(4.499).label).toBe('プロンプト職人');
    expect(rankFor(1.499).label).toBe('AI入門者');
  });

  it('0・負数・NaNは最下位', () => {
    expect(rankFor(0).label).toBe('AI入門者');
    expect(rankFor(-5).label).toBe('AI入門者');
    expect(rankFor(Number.NaN).label).toBe('AI入門者');
    expect(rankFor(Number.POSITIVE_INFINITY).label).toBe('AIの神');
  });
});

describe('rankProgress', () => {
  it('最高位では次がなく進捗100%', () => {
    const progress = rankProgress(14);
    expect(progress.rank.label).toBe('AIの神');
    expect(progress.next).toBeNull();
    expect(progress.remainingCps).toBe(0);
    expect(progress.ratio).toBe(1);
  });

  it('次のランクまでの残りと進捗を返す', () => {
    // コピペ職人(1.5) → バイブ見習い(2) の間の 1.75
    const progress = rankProgress(1.75);
    expect(progress.rank.label).toBe('コピペ職人');
    expect(progress.next?.label).toBe('バイブ見習い');
    expect(progress.remainingCps).toBeCloseTo(0.25);
    expect(progress.ratio).toBeCloseTo(0.5);
  });

  it('ランクの下限では進捗0', () => {
    const progress = rankProgress(2);
    expect(progress.rank.label).toBe('バイブ見習い');
    expect(progress.ratio).toBeCloseTo(0);
  });

  it('進捗は0〜1に収まる', () => {
    for (const cps of [-10, 0, 0.1, 1.7, 4.4, 6, 500]) {
      const { ratio } = rankProgress(cps);
      expect(ratio).toBeGreaterThanOrEqual(0);
      expect(ratio).toBeLessThanOrEqual(1);
    }
  });

  it('下位ランクほど次のランクまでの残りが大きい', () => {
    const low = rankProgress(0.5);
    const high = rankProgress(5.5);
    expect(low.remainingCps).toBeGreaterThan(high.remainingCps);
  });
});
