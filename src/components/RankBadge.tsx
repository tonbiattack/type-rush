import { RANKS, rankProgress } from '../game/rank';

type Props = {
  /** 文字/秒 */
  charactersPerSecond: number;
};

/**
 * 称号と、そこまでの到達段数。
 * 目盛りは下位（左）から上位（右）へ並べ、到達した段まで塗る。
 */
export function RankBadge({ charactersPerSecond }: Props) {
  const { rank, next, remainingCps, ratio } = rankProgress(charactersPerSecond);
  const ladder = [...RANKS].reverse();
  const reached = ladder.findIndex((item) => item.id === rank.id) + 1;
  const isTop = next === null;

  return (
    <div data-testid="rank-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h3
          className={`text-4xl font-bold leading-none tracking-tight sm:text-5xl ${
            isTop ? 'text-shu' : 'text-ink'
          }`}
          data-testid="rank-label"
        >
          {rank.label}
        </h3>
        <p className="font-mono text-note text-ink-3">{rank.tagline}</p>
      </div>

      <div
        className="mt-5 flex gap-[3px]"
        role="img"
        aria-label={`${RANKS.length}段中${reached}段目まで到達。${rank.label}`}
      >
        {ladder.map((item, index) => {
          const filled = index < reached;
          const topSegment = index === ladder.length - 1;
          return (
            <span
              key={item.id}
              className={`h-2 flex-1 ${
                filled ? (topSegment ? 'bg-shu' : 'bg-ink') : 'bg-rule/70'
              }`}
            />
          );
        })}
      </div>

      <p className="mt-2.5 text-xs text-ink-2" data-testid="rank-next">
        {next ? (
          <>
            次の「{next.label}」まで{' '}
            <span className="font-mono text-[13px] font-bold tabular-nums text-ink">
              {remainingCps.toFixed(1)}
            </span>{' '}
            文字/秒
          </>
        ) : (
          <>最高位です。</>
        )}
      </p>

      {next ? (
        <div
          className="mt-3 h-[3px] w-full bg-rule/60"
          role="progressbar"
          aria-label={`「${next.label}」までの進捗`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ratio * 100)}
        >
          <div className="h-full bg-ink" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
      ) : null}
    </div>
  );
}
