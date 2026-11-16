import type { MixMode } from './difficulty';
import { parseSeed } from './selection';

/**
 * スコアの共有。
 *
 * 共有するのは「タイム」と「どの5問だったか（シード）」。
 * シードを URL に載せておくと、受け取った人が同じ5問を遊べるので、
 * タイムをそのまま比べられる（別の問題で比べても意味がない）。
 */

export const SHARE_SEED_PARAM = 'seed';
export const SHARE_MIX_PARAM = 'mix';

const MIX_VALUES: MixMode[] = ['short', 'medium', 'long', 'mixed'];

export type SharedSet = {
  /** 共有されたシード。無効なら null */
  seed: string | null;
  /** 共有された文字数帯。無効なら null */
  mix: MixMode | null;
};

/** URL のクエリから共有されたセットを読む。壊れた値は無視する（ゲームは遊べる）。 */
export function readSharedSet(search: string): SharedSet {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  const rawSeed = params.get(SHARE_SEED_PARAM);
  const seed = rawSeed && parseSeed(rawSeed) !== null ? rawSeed.trim().toLowerCase() : null;

  const rawMix = params.get(SHARE_MIX_PARAM);
  const mix = MIX_VALUES.includes(rawMix as MixMode) ? (rawMix as MixMode) : null;

  return { seed, mix };
}

/** 共有用の URL。シードと文字数帯だけを載せ、他のクエリは捨てる。 */
export function buildShareUrl(
  baseUrl: string,
  options: { seed: string | null; mix: MixMode },
): string {
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = '';
  if (options.seed) url.searchParams.set(SHARE_SEED_PARAM, options.seed);
  url.searchParams.set(SHARE_MIX_PARAM, options.mix);
  return url.toString();
}

/** いま開いているページの URL（クエリを除く）。 */
export function pageUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`;
}

export type ShareTextInput = {
  elapsedMs: number;
  charactersPerSecond: number;
  /** 称号（「AIの神」など） */
  rankLabel: string;
  /** 文字数帯の表示名（「混ぜる」など） */
  mixLabel: string;
  problemCount: number;
  url: string;
};

/**
 * 貼り付ける文字列。
 * 誇張せず、受け取った人が同じ条件で遊べる情報だけを書く。
 */
export function buildShareText(input: ShareTextInput): string {
  const seconds = (input.elapsedMs / 1000).toFixed(2);
  return [
    `Type Rush ${seconds}秒（${input.problemCount}問・${input.mixLabel}）`,
    `${input.charactersPerSecond.toFixed(1)}文字/秒、${input.rankLabel}`,
    input.url,
  ].join('\n');
}
