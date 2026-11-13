/**
 * ゲーム開始前のカウントダウン。
 *
 * 「スタート」を押した瞬間に問題が出るのではなく、3・2・1 と間を置いてから始める。
 * 計測はカウントダウン終了後、最初の入力から始まる（startedAt は別管理）。
 */

/** カウントダウンに使う数字（ミリ秒）。最後の要素のあと「スタート」。 */
export const COUNTDOWN_STEPS = [3, 2, 1] as const;

/** 1ステップあたりの表示時間 */
export const COUNTDOWN_STEP_MS = 700;

/** 「スタート」の表示時間（0 を出してから入力可能になるまで） */
export const COUNTDOWN_GO_MS = 400;

export const COUNTDOWN_TOTAL_MS =
  COUNTDOWN_STEPS.length * COUNTDOWN_STEP_MS + COUNTDOWN_GO_MS;

/**
 * 経過時間から、いま表示すべき内容を返す。
 * 残り時間が尽きたら null（カウントダウン終了）。
 */
export function countdownLabel(elapsedMs: number): string | null {
  if (elapsedMs < 0) return String(COUNTDOWN_STEPS[0]);

  const stepIndex = Math.floor(elapsedMs / COUNTDOWN_STEP_MS);
  if (stepIndex < COUNTDOWN_STEPS.length) {
    return String(COUNTDOWN_STEPS[stepIndex]);
  }

  if (elapsedMs < COUNTDOWN_STEPS.length * COUNTDOWN_STEP_MS + COUNTDOWN_GO_MS) {
    return 'スタート';
  }

  return null;
}

/** カウントダウンが終わったか */
export function isCountdownDone(elapsedMs: number): boolean {
  return countdownLabel(elapsedMs) === null;
}

/** 残り時間（ミリ秒） */
export function countdownRemaining(elapsedMs: number): number {
  return Math.max(0, COUNTDOWN_TOTAL_MS - elapsedMs);
}
