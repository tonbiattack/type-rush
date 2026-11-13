/**
 * タイピングレベル（ランク）。
 *
 * AI 時代の称号として、上から「AIの神」「バイブコーダー」…と並べている。
 * 目安として、確定した入力文字数 / 実時間（文字/秒）だけで決める。
 * 誤字は減点しない（このゲームのコンセプト上、速く伝えることが目的）。
 * 閾値はあくまで目安なので、バランスを見て調整してよい。
 */
export type Rank = {
  id: string;
  /** 画面に出す短い名前 */
  label: string;
  /** 名前の下に出す補足（英語表記） */
  tagline: string;
  /** この速度（文字/秒）以上で到達 */
  minCps: number;
  /** 見出しなどに使う文字色（Tailwind クラス） */
  textClass: string;
};

/** 速い順（minCps の降順）に並べる */
export const RANKS: Rank[] = [
  { id: 'ai-no-kami', label: 'AIの神', tagline: 'AGI', minCps: 6, textClass: 'text-shu' },
  { id: 'vibe-coder', label: 'バイブコーダー', tagline: 'Vibe Coder', minCps: 4.5, textClass: 'text-ink' },
  { id: 'prompt-engineer', label: 'プロンプト職人', tagline: 'Prompt Engineer', minCps: 3.5, textClass: 'text-ink' },
  { id: 'kobushi-tatsujin', label: '打鍵の達人', tagline: 'Keyboard Artist', minCps: 2.7, textClass: 'text-ink' },
  { id: 'vibe-beginner', label: 'バイブ見習い', tagline: 'Vibe Apprentice', minCps: 2, textClass: 'text-ink' },
  { id: 'copy-paster', label: 'コピペ職人', tagline: 'Copy & Paster', minCps: 1.5, textClass: 'text-ink' },
  { id: 'nyuumon', label: 'AI入門者', tagline: 'Getting Started', minCps: 0, textClass: 'text-ink' },
];

export const TOP_RANK = RANKS[0];
export const LOWEST_RANK = RANKS[RANKS.length - 1];

/** 速度からランクを返す。NaN・0以下は最下位として扱う。 */
export function rankFor(charactersPerSecond: number): Rank {
  if (Number.isNaN(charactersPerSecond) || charactersPerSecond <= 0) {
    return LOWEST_RANK;
  }

  return RANKS.find((rank) => charactersPerSecond + 1e-9 >= rank.minCps) ?? LOWEST_RANK;
}

export type RankProgress = {
  rank: Rank;
  /** 1つ上のランク。最高位なら null */
  next: Rank | null;
  /** 次のランクまであと何文字/秒か。最高位なら 0 */
  remainingCps: number;
  /** 現在ランク内での進み具合（0〜1）。最高位なら 1 */
  ratio: number;
};

export function rankProgress(charactersPerSecond: number): RankProgress {
  const rank = rankFor(charactersPerSecond);
  const index = RANKS.indexOf(rank);
  const next = index > 0 ? RANKS[index - 1] : null;

  if (!next) {
    return { rank, next: null, remainingCps: 0, ratio: 1 };
  }

  const span = next.minCps - rank.minCps;
  const ratio = span > 0 ? (charactersPerSecond - rank.minCps) / span : 0;

  return {
    rank,
    next,
    remainingCps: Math.max(0, next.minCps - charactersPerSecond),
    ratio: Math.min(1, Math.max(0, ratio)),
  };
}
