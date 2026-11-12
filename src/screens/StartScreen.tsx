import { formatDateTime } from '../game/format';
import type { BestRecord } from '../game/storage';

type Props = {
  best: BestRecord | undefined;
  rulesVersion: string;
  problemCount: number;
  onStart: () => void;
};

export function StartScreen({ best, rulesVersion, problemCount, onStart }: Props) {
  return (
    <section aria-labelledby="start-heading" className="flex flex-1 flex-col justify-center gap-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
          誤字OK・速度重視のタイピングゲーム
        </p>
        <h2 id="start-heading" className="text-3xl font-black leading-tight sm:text-4xl">
          一字一句より、
          <br className="sm:hidden" />
          とにかく速く伝える。
        </h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-300">
          {problemCount}問のひらがな短文を、多少の誤字を気にせず最速でクリアするゲームです。
          正しさよりも、伝わる速さを競います。
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h3 className="mb-3 text-sm font-bold text-slate-200">遊び方</h3>
        <ol className="list-inside list-decimal space-y-1.5 text-sm leading-relaxed text-slate-300">
          <li>お題を見ながら、入力欄にひらがなで入力します。</li>
          <li>最初の入力からタイマーが動きます。</li>
          <li>Enterで判定。85%以上一致していれば次の問題へ進みます。</li>
          <li>不合格でも止まらず、その場で修正して再提出できます。</li>
          <li>{problemCount}問クリアまでの総時間がスコアです。</li>
        </ol>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          判定は Levenshtein 距離による近似です。AIによる意味の理解ではありません（ルール {rulesVersion}）。
          貼り付けは使えません。
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">自己ベスト</h3>
        {best ? (
          <p className="mt-1 text-2xl font-black tabular-nums" data-testid="start-best">
            {(best.bestMs / 1000).toFixed(2)}秒
            <span className="ml-2 text-xs font-medium text-slate-400">
              {formatDateTime(best.achievedAt)}
            </span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-400">まだ記録がありません。最初の記録を作りましょう。</p>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={onStart}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.repeat) event.preventDefault();
          }}
          autoFocus
          className="w-full rounded-2xl bg-sky-500 px-6 py-4 text-lg font-bold text-slate-950 transition-colors hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 sm:w-auto sm:px-12"
        >
          スタート
          <span className="ml-2 text-sm font-semibold text-slate-800">Enter</span>
        </button>
      </div>
    </section>
  );
}
