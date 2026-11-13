import { describe, expect, it } from 'vitest';
import { RANKS, TOP_RANK, LOWEST_RANK, rankFor, rankProgress } from '../game/rank';

describe('ランク定義', () => {
  it('最高位は「神」', () => {
    expect(TOP_RANK.label).toBe('神');
    expect(RANKS[0]).toBe(TOP_RANK);
  });

  it('最下位は「見習い」で閾値0', () => {
    expect(LOWEST_RANK.label).toBe('見習い');
    expect(LOWEST_RANK.minCps).toBe(0);
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
  it('6文字/秒以上は「神」', () => {
    expect(rankFor(6).label).toBe('神');
    expect(rankFor(25.4).label).toBe('神');
    expect(rankFor(1000).label).toBe('神');
  });

  it('境界値ちょうどはそのランクに入る', () => {
    expect(rankFor(4.5).label).toBe('超人');
    expect(rankFor(3.5).label).toBe('達人');
    expect(rankFor(2.7).label).toBe('上級');
    expect(rankFor(2).label).toBe('中級');
    expect(rankFor(1.5).label).toBe('初級');
  });

  it('境界値の直前は1つ下のランク', () => {
    expect(rankFor(5.999).label).toBe('超人');
    expect(rankFor(4.499).label).toBe('達人');
    expect(rankFor(1.499).label).toBe('見習い');
  });

  it('0・負数・NaNは最下位', () => {
    expect(rankFor(0).label).toBe('見習い');
    expect(rankFor(-5).label).toBe('見習い');
    expect(rankFor(Number.NaN).label).toBe('見習い');
    expect(rankFor(Number.POSITIVE_INFINITY).label).toBe('神');
  });
});

describe('rankProgress', () => {
  it('最高位では次がなく進捗100%', () => {
    const progress = rankProgress(14);
    expect(progress.rank.label).toBe('神');
    expect(progress.next).toBeNull();
    expect(progress.remainingCps).toBe(0);
    expect(progress.ratio).toBe(1);
  });

  it('次のランクまでの残りと進捗を返す', () => {
    // 初級(1.5) → 中級(2) の間の 1.75
    const progress = rankProgress(1.75);
    expect(progress.rank.label).toBe('初級');
    expect(progress.next?.label).toBe('中級');
    expect(progress.remainingCps).toBeCloseTo(0.25);
    expect(progress.ratio).toBeCloseTo(0.5);
  });

  it('ランクの下限では進捗0', () => {
    const progress = rankProgress(2);
    expect(progress.rank.label).toBe('中級');
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
