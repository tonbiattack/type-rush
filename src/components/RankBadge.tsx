import { rankProgress } from '../game/rank';

type Props = {
  /** 文字/秒 */
  charactersPerSecond: number;
  /** テスト用 */
  showProgress?: boolean;
};

export function RankBadge({ charactersPerSecond, showProgress = true }: Props) {
  const { rank, next, remainingCps, ratio } = rankProgress(charactersPerSecond);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5" data-testid="rank-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">タイピングレベル</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span
              className={`inline-block rounded-xl border px-4 py-1 text-3xl font-black leading-tight ${rank.badgeClass}`}
              data-testid="rank-label"
            >
              {rank.label}
            </span>
            <span className="text-sm text-slate-400 tabular-nums">
              {charactersPerSecond.toFixed(1)}文字/秒
            </span>
          </p>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-slate-300">{rank.summary}</p>
      </div>

      {showProgress ? (
        <div className="mt-4">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
            aria-label={next ? `次のランク「${next.label}」までの進捗` : '最高ランクに到達'}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ratio * 100)}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${rank.barClass}`}
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400" data-testid="rank-next">
            {next
              ? `あと ${remainingCps.toFixed(1)}文字/秒で「${next.label}」`
              : '最高ランク「神」に到達しています。'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
