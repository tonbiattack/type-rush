/**
 * IME 変換中の Enter をゲーム確定として扱わないための判定。
 *
 * - 変換中 (isComposing / keyCode 229) の Enter は無視する。
 * - Safari などは変換確定の Enter で compositionend を keydown より先に発火し、
 *   keydown.isComposing が false になる。直前の compositionend からの経過が
 *   ごく短い場合は確定操作とみなして無視する。
 */
export const COMPOSITION_GRACE_MS = 20;

export type EnterGuardInput = {
  key: string;
  isComposing?: boolean;
  keyCode?: number;
  /** 直近の compositionend 時刻。未確定なら null */
  compositionEndedAt?: number | null;
  now: number;
  graceMs?: number;
};

export function shouldSubmitOnEnter(input: EnterGuardInput): boolean {
  if (input.key !== 'Enter') return false;
  if (input.isComposing) return false;
  // 一部ブラウザは IME 変換中の keydown を keyCode 229 で通知する
  if (input.keyCode === 229) return false;

  const graceMs = input.graceMs ?? COMPOSITION_GRACE_MS;
  if (input.compositionEndedAt != null && input.now - input.compositionEndedAt < graceMs) {
    return false;
  }

  return true;
}

const BLOCKED_INPUT_TYPES = new Set([
  'insertFromPaste',
  'insertFromPasteAsQuotation',
  'insertFromDrop',
  'insertFromYank',
  'paste',
  'drop',
]);

/** 貼り付け・ドロップなど、タイピング以外の入力か */
export function isBlockedInputType(type: string): boolean {
  return BLOCKED_INPUT_TYPES.has(type);
}
