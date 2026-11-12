import { describe, expect, it } from 'vitest';
import {
  formatClock,
  formatDateTime,
  formatDuration,
  formatMs,
  formatSimilarity,
  formatStats,
} from '../game/format';

describe('表示フォーマット', () => {
  it('経過時間の時計表示', () => {
    expect(formatClock(0)).toBe('00:00.00');
    expect(formatClock(1234)).toBe('00:01.23');
    expect(formatClock(65_400)).toBe('01:05.40');
    expect(formatClock(-500)).toBe('00:00.00');
  });

  it('総時間の表示', () => {
    expect(formatDuration(12_345)).toBe('12.35秒');
    expect(formatDuration(65_400)).toBe('1分5.40秒');
  });

  it('秒の数値表示', () => {
    expect(formatMs(12_345)).toBe('12.35');
    expect(formatMs(0)).toBe('0.00');
  });

  it('一致率のパーセント表示', () => {
    expect(formatSimilarity(1)).toBe('100.0%');
    expect(formatSimilarity(0.85)).toBe('85.0%');
    expect(formatSimilarity(0)).toBe('0.0%');
  });

  it('統計の整形', () => {
    expect(
      formatStats({
        elapsedMs: 12_345,
        charactersPerSecond: 12.34,
        charactersPerMinute: 740.4,
        averageSimilarity: 0.9345,
      }),
    ).toEqual({
      elapsedSeconds: '12.35',
      charactersPerSecond: '12.3',
      charactersPerMinute: '740',
      averageSimilarity: '93.5%',
    });
  });

  it('日時の表示は不正な値でも落ちない', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
    expect(formatDateTime('2026-11-13T01:29:00.000Z')).toMatch(/2026/);
  });
});
