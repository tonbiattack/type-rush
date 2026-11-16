/**
 * ゲーム開始前のカウントダウン。
 *
 * 「スタート」を押した瞬間に問題が出るのではなく、3・2・1 と間を置いてから始める。
 * 計測はカウントダウン終了後、最初の入力から始まる（startedAt は別管理）。
 *
 * 再挑戦は同じ問題をもう一度打つだけなので、数字を出さず「スタート」だけで始める。
 * 待たされる時間が長いほど、終わった直後の熱が冷める。
 */

/** カウントダウンに使う数字（ミリ秒）。最後の要素のあと「スタート」。 */
export const COUNTDOWN_STEPS = [3, 2, 1] as const;

/** 1ステップあたりの表示時間 */
export const COUNTDOWN_STEP_MS = 700;

/** 「スタート」の表示時間（0 を出してから入力可能になるまで） */
export const COUNTDOWN_GO_MS = 400;

export const COUNTDOWN_TOTAL_MS =
  COUNTDOWN_STEPS.length * COUNTDOWN_STEP_MS + COUNTDOWN_GO_MS;

/** 初回は準備のため数字を出し、再挑戦は短く済ませる。 */
export type CountdownMode = 'full' | 'retry';

/** 再挑戦の合計時間。「スタート」だけを出してすぐ始める。 */
export const RETRY_COUNTDOWN_TOTAL_MS = COUNTDOWN_GO_MS;

export function countdownTotalMs(mode: CountdownMode = 'full'): number {
  return mode === 'retry' ? RETRY_COUNTDOWN_TOTAL_MS : COUNTDOWN_TOTAL_MS;
}

/**
 * 経過時間から、いま表示すべき内容を返す。
 * 残り時間が尽きたら null（カウントダウン終了）。
 *
 * totalMs を渡すと合計時間を差し替えられる（テストで短縮するため）。
 */
export function countdownLabel(
  elapsedMs: number,
  mode: CountdownMode = 'full',
  totalMs: number = countdownTotalMs(mode),
): string | null {
  if (elapsedMs >= totalMs) return null;

  if (mode === 'retry') return 'スタート';

  if (elapsedMs < 0) return String(COUNTDOWN_STEPS[0]);

  const stepIndex = Math.floor(elapsedMs / COUNTDOWN_STEP_MS);
  if (stepIndex < COUNTDOWN_STEPS.length) {
    return String(COUNTDOWN_STEPS[stepIndex]);
  }

  return 'スタート';
}

/** カウントダウンが終わったか */
export function isCountdownDone(
  elapsedMs: number,
  mode: CountdownMode = 'full',
  totalMs: number = countdownTotalMs(mode),
): boolean {
  return countdownLabel(elapsedMs, mode, totalMs) === null;
}

/** 残り時間（ミリ秒） */
export function countdownRemaining(
  elapsedMs: number,
  mode: CountdownMode = 'full',
  totalMs: number = countdownTotalMs(mode),
): number {
  return Math.max(0, totalMs - elapsedMs);
}
