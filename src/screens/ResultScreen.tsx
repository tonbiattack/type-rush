import { useRef } from 'react';
import { RankBadge } from '../components/RankBadge';
import type { GameStats } from '../game/engine';
import { formatDateTime, formatStats, formatSimilarity } from '../game/format';
import { rankFor } from '../game/rank';
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
  const rank = rankFor(stats.charactersPerSecond);
  const mountedAt = useRef(now());
  const canRetry = () => now() - mountedAt.current >= RETRY_KEY_GUARD_MS;

  return (
    <section aria-labelledby="result-heading" className="flex flex-1 flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">結果</p>
        <h2 id="result-heading" className="mt-1 text-2xl font-black sm:text-3xl">
          {game.problems.length}問クリア
          <span className={`ml-3 align-middle text-base font-bold ${rank.textClass}`} data-testid="rank-inline">
            {rank.label}
          </span>
        </h2>
        {newBest ? (
          <p className="mt-2 inline-block rounded-lg bg-amber-400/15 px-3 py-1 text-sm font-bold text-amber-300" role="status">
            自己ベスト更新！
          </p>
        ) : null}
        <p className="mt-2 text-xs text-slate-400">速さ（文字/秒）でタイピングレベルを判定します。</p>
      </div>

      <RankBadge charactersPerSecond={stats.charactersPerSecond} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">総時間</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-sky-100" data-testid="total-time">
            {formatted.elapsedSeconds}秒
          </p>
          <p className="mt-1 text-xs text-sky-300/80">
            1問平均 {(stats.elapsedMs / 1000 / game.results.length).toFixed(2)}秒
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">速度</p>
          <p className="mt-1 text-2xl font-black tabular-nums">{formatted.charactersPerSecond}文字/秒</p>
          <p className="mt-1 text-xs text-slate-400">{formatted.charactersPerMinute}文字/分</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">平均一致率</p>
          <p className="mt-1 text-2xl font-black tabular-nums">{formatted.averageSimilarity}</p>
          <p className="mt-1 text-xs text-slate-400">{stats.characters}文字を確定</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">自己ベスト</h3>
        <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">この問題セット</dt>
            <dd className="font-bold tabular-nums" data-testid="best-this-set">
              {bestForThisSet ? `${(bestForThisSet.bestMs / 1000).toFixed(2)}秒` : '記録なし'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">ルール {rulesVersion} 全体</dt>
            <dd className="font-bold tabular-nums">
              {bestOverall ? `${(bestOverall.bestMs / 1000).toFixed(2)}秒` : '記録なし'}
            </dd>
          </div>
        </dl>
        {bestOverall ? (
          <p className="mt-2 text-xs text-slate-500">{formatDateTime(bestOverall.achievedAt)} の記録</p>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold text-slate-200">問題ごとの結果</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <th scope="col" className="py-2 pr-3">#</th>
                <th scope="col" className="py-2 pr-3">お題</th>
                <th scope="col" className="py-2 pr-3 text-right">提出</th>
                <th scope="col" className="py-2 text-right">一致率</th>
              </tr>
            </thead>
            <tbody>
              {game.results.map((result, index) => (
                <tr key={result.problemId} className="border-b border-slate-800/60 align-top">
                  <td className="py-2 pr-3 tabular-nums text-slate-400">{index + 1}</td>
                  <td className="py-2 pr-3">{result.prompt}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{result.attempts}</td>
                  <td className="py-2 text-right tabular-nums">{formatSimilarity(result.similarity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={onPlayAgain}
          onKeyDown={(event) => {
            // 結果画面が出た瞬間の Enter 押下・押しっぱなしでは再挑戦しない
            // （マウス操作はすぐに受け付ける）
            if (event.key === 'Enter' && (!canRetry() || event.repeat)) event.preventDefault();
          }}
          autoFocus
          className="w-full rounded-2xl bg-sky-500 px-6 py-4 text-lg font-bold text-slate-950 transition-colors hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 sm:w-auto sm:px-12"
        >
          もう一度
          <span className="ml-2 text-sm font-semibold text-slate-800">Enter</span>
        </button>
        <p className="mt-2 text-xs text-slate-500">新しい問題セットで再挑戦します。</p>
      </div>
    </section>
  );
}
