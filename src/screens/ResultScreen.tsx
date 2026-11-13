import { useRef } from 'react';
import { RankBadge } from '../components/RankBadge';
import { Stamp } from '../components/Stamp';
import type { GameStats } from '../game/engine';
import { formatDateTime, formatSimilarity, formatStats } from '../game/format';
import type { BestRecord } from '../game/storage';
import type { GameState } from '../game/types';

/** 結果画面表示直後の Enter を無視する時間。確定の Enter がそのまま再挑戦にならないようにする。 */
const RETRY_KEY_GUARD_MS = 300;

type Props = {
  game: GameState;
  stats: GameStats;
  bestForThisSet: BestRecord | undefined;
  bestOverall: BestRecord | undefined;
  newBest: BestRecord | null;
  rulesVersion: string;
  /** 計測と同じクロック（テストで差し替え可能） */
  now: () => number;
  onPlayAgain: () => void;
};

export function ResultScreen({
  game,
  stats,
  bestForThisSet,
  bestOverall,
  newBest,
  rulesVersion,
  now,
  onPlayAgain,
}: Props) {
  const formatted = formatStats(stats);
  const mountedAt = useRef(now());
  const canRetry = () => now() - mountedAt.current >= RETRY_KEY_GUARD_MS;

  return (
    <section aria-labelledby="result-heading" className="flex flex-1 flex-col">
      {/* 総時間を主役にし、判定の判子をその脇に置く。 */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div>
          <h2 id="result-heading" className="text-sm font-bold text-ink-2">
            {game.problems.length}問クリア
          </h2>
          <p className="mt-1 flex items-baseline gap-2">
            <span
              className="font-mono text-[3.4rem] font-bold leading-none tabular-nums tracking-tight sm:text-[4.2rem]"
              data-testid="total-time"
            >
              {formatted.elapsedSeconds}
            </span>
            <span className="text-lg font-bold text-ink-2">秒</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* 判子は結果にひとつだけ。新しい記録なら「自己ベスト」、そうでなければ「完走」。 */}
          {newBest ? (
            <Stamp verdict="自己ベスト" detail={formatted.elapsedSeconds} />
          ) : (
            <Stamp verdict="完走" detail={`${formatted.averageSimilarity} 一致`} />
          )}
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-ink py-3 sm:grid-cols-4">
        <div>
          <dt className="text-[11px] text-ink-3">文字/秒</dt>
          <dd className="font-mono text-lg font-bold tabular-nums">{formatted.charactersPerSecond}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-ink-3">文字/分</dt>
          <dd className="font-mono text-lg font-bold tabular-nums">{formatted.charactersPerMinute}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-ink-3">平均一致率</dt>
          <dd className="font-mono text-lg font-bold tabular-nums">{formatted.averageSimilarity}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-ink-3">確定した文字</dt>
          <dd className="font-mono text-lg font-bold tabular-nums">{stats.characters}</dd>
        </div>
      </dl>

      <div className="mt-7">
        <RankBadge charactersPerSecond={stats.charactersPerSecond} />
      </div>

      <div className="mt-7 grid gap-6 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <h3 className="border-b border-ink pb-1 text-sm font-bold">問題ごとの結果</h3>
          <table className="mt-1 w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-rule text-ink-3">
                <th scope="col" className="py-1.5 pr-2 font-normal">
                  #
                </th>
                <th scope="col" className="py-1.5 pr-2 font-normal">
                  お題
                </th>
                <th scope="col" className="py-1.5 pr-2 text-right font-normal">
                  提出
                </th>
                <th scope="col" className="py-1.5 text-right font-normal">
                  一致率
                </th>
              </tr>
            </thead>
            <tbody>
              {game.results.map((result, index) => (
                <tr key={result.problemId} className="border-b border-rule align-top">
                  <td className="py-1.5 pr-2 font-mono tabular-nums text-ink-3">{index + 1}</td>
                  <td className="py-1.5 pr-2 leading-relaxed">{result.prompt}</td>
                  <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{result.attempts}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums">
                    {formatSimilarity(result.similarity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="border-b border-ink pb-1 text-sm font-bold">自己ベスト</h3>
          <dl className="mt-2 space-y-2 text-xs">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-2">この問題セット</dt>
              <dd className="font-mono text-sm font-bold tabular-nums" data-testid="best-this-set">
                {bestForThisSet ? `${(bestForThisSet.bestMs / 1000).toFixed(2)}秒` : '—'}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-2">ルール {rulesVersion} 全体</dt>
              <dd className="font-mono text-sm font-bold tabular-nums">
                {bestOverall ? `${(bestOverall.bestMs / 1000).toFixed(2)}秒` : '—'}
              </dd>
            </div>
          </dl>
          {bestOverall ? (
            <p className="mt-2 text-[11px] text-ink-3">{formatDateTime(bestOverall.achievedAt)} の記録</p>
          ) : null}
          <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
            称号は文字/秒で決まります。
          </p>
        </div>
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={onPlayAgain}
          onKeyDown={(event) => {
            // 結果画面が出た瞬間の Enter 押下・押しっぱなしでは再挑戦しない
            // （マウス操作はすぐに受け付ける）
            if (event.key === 'Enter' && (!canRetry() || event.repeat)) event.preventDefault();
          }}
          autoFocus
          className="inline-flex w-full items-baseline justify-between gap-6 border-2 border-ink bg-ink px-5 py-3.5 text-left text-paper transition-colors hover:border-shu hover:bg-shu sm:w-auto sm:min-w-[15rem]"
        >
          <span className="text-lg font-bold">もう一度</span>
          <span className="font-mono text-[11px] opacity-70">Enter</span>
        </button>
        <p className="mt-2 text-[11px] text-ink-3">新しい問題セットで再挑戦します。</p>
      </div>
    </section>
  );
}
