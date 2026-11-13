import { RANKS, rankProgress } from '../game/rank';

type Props = {
  /** 文字/秒 */
  charactersPerSecond: number;
};

/**
 * ランクは「判子の濃さ」ではなく「刷り重ねた段数」で見せる。
 * 7段の目盛りを下から塗り、最高位だけ朱にする。
 */
export function RankBadge({ charactersPerSecond }: Props) {
  const { rank, next, remainingCps, ratio } = rankProgress(charactersPerSecond);
  // 目盛りは下位（左）から上位（右）へ。到達した段まで塗る。
  const ladder = [...RANKS].reverse();
  const reached = ladder.findIndex((item) => item.id === rank.id) + 1;
  const isTop = next === null;

  return (
    <div data-testid="rank-card">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h3
            className={`text-4xl font-bold leading-none tracking-tight sm:text-5xl ${
              isTop ? 'text-shu' : 'text-ink'
            }`}
            data-testid="rank-label"
          >
            {rank.label}
          </h3>
          <p className="mt-2 font-mono text-[11px] tracking-[0.08em] text-ink-3">{rank.tagline}</p>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-ink-2">{rank.summary}</p>
      </div>

      {/* 目盛り: 到達した段だけ塗る。最高位の段だけ朱。 */}
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
          <>最高位です。この上はありません。</>
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
          <div
            className="h-full bg-ink"
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
