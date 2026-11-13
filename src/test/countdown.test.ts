import { describe, expect, it } from 'vitest';
import {
  COUNTDOWN_GO_MS,
  COUNTDOWN_STEP_MS,
  COUNTDOWN_STEPS,
  COUNTDOWN_TOTAL_MS,
  countdownLabel,
  countdownRemaining,
  isCountdownDone,
} from '../game/countdown';

describe('開始前のカウントダウン', () => {
  it('3・2・1 の順に表示する', () => {
    expect(countdownLabel(0)).toBe('3');
    expect(countdownLabel(COUNTDOWN_STEP_MS)).toBe('2');
    expect(countdownLabel(COUNTDOWN_STEP_MS * 2)).toBe('1');
  });

  it('そのあと「スタート」を出す', () => {
    expect(countdownLabel(COUNTDOWN_STEP_MS * COUNTDOWN_STEPS.length)).toBe('スタート');
  });

  it('合計時間を過ぎたら終了する', () => {
    expect(countdownLabel(COUNTDOWN_TOTAL_MS - 1)).toBe('スタート');
    expect(countdownLabel(COUNTDOWN_TOTAL_MS)).toBeNull();
    expect(countdownLabel(COUNTDOWN_TOTAL_MS + 5000)).toBeNull();
  });

  it('負の経過時間でも先頭の数字を出す', () => {
    expect(countdownLabel(-100)).toBe('3');
  });

  it('終了判定と表示が一致する', () => {
    expect(isCountdownDone(COUNTDOWN_TOTAL_MS - 1)).toBe(false);
    expect(isCountdownDone(COUNTDOWN_TOTAL_MS)).toBe(true);
  });

  it('残り時間は0未満にならない', () => {
    expect(countdownRemaining(0)).toBe(COUNTDOWN_TOTAL_MS);
    expect(countdownRemaining(COUNTDOWN_TOTAL_MS)).toBe(0);
    expect(countdownRemaining(COUNTDOWN_TOTAL_MS + 1000)).toBe(0);
  });

  it('3秒以上の間を置く（寿司打のように余裕を持たせる）', () => {
    // 数字3つ分 + スタート表示
    expect(COUNTDOWN_TOTAL_MS).toBeGreaterThanOrEqual(2500);
    expect(COUNTDOWN_GO_MS).toBeGreaterThan(0);
  });

  it('各ステップが目視できる長さになっている', () => {
    expect(COUNTDOWN_STEP_MS).toBeGreaterThanOrEqual(400);
    expect(COUNTDOWN_STEP_MS).toBeLessThanOrEqual(1200);
  });
});
