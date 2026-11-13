/**
 * タイピングレベル（ランク）。
 *
 * 目安として、確定した入力文字数 / 実時間（文字/秒）だけで決める。
 * 誤字は減点しない（このゲームのコンセプト上、速く伝えることが目的）。
 * 閾値はあくまで目安なので、バランスを見て調整してよい。
 */
export type Rank = {
  id: string;
  /** 画面に出す短い名前 */
  label: string;
  /** この速度（文字/秒）以上で到達 */
  minCps: number;
  /** 一言説明 */
  summary: string;
  /** バッジの色（Tailwind クラス） */
  badgeClass: string;
  /** 見出しなどに使う文字色（Tailwind クラス） */
  textClass: string;
  /** 進捗バーの色（Tailwind クラス） */
  barClass: string;
};

/** 速い順（minCps の降順）に並べる */
export const RANKS: Rank[] = [
  {
    id: 'kami',
    label: '神',
    minCps: 6,
    summary: '指が光より速い。人類の到達点。',
    badgeClass: 'border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-200',
    textClass: 'text-fuchsia-300',
    barClass: 'bg-fuchsia-400',
  },
  {
    id: 'choujin',
    label: '超人',
    minCps: 4.5,
    summary: 'もはや会話より速い。',
    badgeClass: 'border-amber-400/60 bg-amber-500/15 text-amber-200',
    textClass: 'text-amber-300',
    barClass: 'bg-amber-400',
  },
  {
    id: 'tatsujin',
    label: '達人',
    minCps: 3.5,
    summary: '指が考えずに動いている。',
    badgeClass: 'border-sky-400/60 bg-sky-500/15 text-sky-200',
    textClass: 'text-sky-300',
    barClass: 'bg-sky-400',
  },
  {
    id: 'joukyuu',
    label: '上級',
    minCps: 2.7,
    summary: '速い。普通に自慢できる。',
    badgeClass: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200',
    textClass: 'text-emerald-300',
    barClass: 'bg-emerald-400',
  },
  {
    id: 'chuukyuu',
    label: '中級',
    minCps: 2,
    summary: '平均より少し速い。',
    badgeClass: 'border-teal-400/60 bg-teal-500/15 text-teal-200',
    textClass: 'text-teal-300',
    barClass: 'bg-teal-400',
  },
  {
    id: 'shokyuu',
    label: '初級',
    minCps: 1.5,
    summary: 'まずはここから。十分戦える。',
    badgeClass: 'border-slate-400/60 bg-slate-500/15 text-slate-200',
    textClass: 'text-slate-300',
    barClass: 'bg-slate-400',
  },
  {
    id: 'minarai',
    label: '見習い',
    minCps: 0,
    summary: 'まだ指が迷っている。',
    badgeClass: 'border-slate-600 bg-slate-800/60 text-slate-300',
    textClass: 'text-slate-400',
    barClass: 'bg-slate-500',
  },
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
