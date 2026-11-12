import { describe, expect, it } from 'vitest';
import { COMPOSITION_GRACE_MS, isBlockedInputType, shouldSubmitOnEnter } from '../game/ime';

describe('shouldSubmitOnEnter', () => {
  it('通常の Enter は確定する', () => {
    expect(shouldSubmitOnEnter({ key: 'Enter', now: 1000 })).toBe(true);
  });

  it('Enter 以外のキーは確定しない', () => {
    expect(shouldSubmitOnEnter({ key: 'a', now: 1000 })).toBe(false);
    expect(shouldSubmitOnEnter({ key: 'NumpadEnter', now: 1000 })).toBe(false);
  });

  it('IME 変換中の Enter は確定しない', () => {
    expect(shouldSubmitOnEnter({ key: 'Enter', now: 1000, isComposing: true })).toBe(false);
  });

  it('keyCode 229 の Enter は確定しない', () => {
    expect(shouldSubmitOnEnter({ key: 'Enter', now: 1000, keyCode: 229 })).toBe(false);
  });

  it('変換確定直後の Enter は猶予時間内なら確定しない', () => {
    const input = { key: 'Enter', compositionEndedAt: 1000, now: 1000 };
    expect(shouldSubmitOnEnter(input)).toBe(false);
    expect(shouldSubmitOnEnter({ ...input, now: 1000 + COMPOSITION_GRACE_MS - 1 })).toBe(false);
  });

  it('猶予時間を過ぎた Enter は確定する', () => {
    expect(
      shouldSubmitOnEnter({
        key: 'Enter',
        compositionEndedAt: 1000,
        now: 1000 + COMPOSITION_GRACE_MS,
      }),
    ).toBe(true);
  });

  it('猶予時間は差し替えられる', () => {
    const input = { key: 'Enter', compositionEndedAt: 1000, now: 1050, graceMs: 10 };
    expect(shouldSubmitOnEnter(input)).toBe(true);
  });
});

describe('isBlockedInputType', () => {
  it('貼り付け・ドロップを拒否対象にする', () => {
    expect(isBlockedInputType('insertFromPaste')).toBe(true);
    expect(isBlockedInputType('insertFromDrop')).toBe(true);
    expect(isBlockedInputType('insertFromPasteAsQuotation')).toBe(true);
  });

  it('通常のタイピングは拒否しない', () => {
    expect(isBlockedInputType('insertText')).toBe(false);
    expect(isBlockedInputType('deleteContentBackward')).toBe(false);
    expect(isBlockedInputType('')).toBe(false);
  });
});
