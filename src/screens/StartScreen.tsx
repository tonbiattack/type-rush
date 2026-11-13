import { RankLadder } from '../components/RankLadder';
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
    <section aria-labelledby="start-heading" className="flex flex-1 flex-col justify-center py-6">
      {/* ヒーローは「伝える速さ」という数字ではなく、お題そのものの見本。 */}
      <p className="font-mono text-[11px] tracking-[0.06em] text-ink-3">
        お題の例
      </p>
      <p className="mt-2 border-l-2 border-shu pl-3 text-xl leading-relaxed text-ink sm:text-2xl">
        このぶんをよんで
        <br className="sm:hidden" />
        かんたんにまとめてください
      </p>

      <h2
        id="start-heading"
        className="mt-8 text-3xl font-bold leading-[1.25] tracking-tight sm:text-[2.6rem]"
      >
        一字一句より、
        <br />
        とにかく速く伝える。
      </h2>

      <p className="mt-4 max-w-[38rem] text-sm leading-[1.9] text-ink-2">
        {problemCount}問のひらがな短文を、誤字を気にせず最速でクリアします。
        Enter で判定し、85% 以上伝わっていれば次へ。直す時間もタイムに含まれます。
      </p>

      <div className="mt-7">
        <button
          type="button"
          onClick={onStart}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.repeat) event.preventDefault();
          }}
          autoFocus
          className="group inline-flex w-full items-baseline justify-between gap-6 border-2 border-ink bg-ink px-5 py-3.5 text-left text-paper transition-colors hover:bg-shu hover:border-shu sm:w-auto sm:min-w-[15rem]"
        >
          <span className="text-lg font-bold">スタート</span>
          <span className="font-mono text-[11px] opacity-70">Enter</span>
        </button>
      </div>

      {best ? (
        <p className="mt-3 text-xs text-ink-2" data-testid="start-best">
          自己ベスト{' '}
          <span className="font-mono text-sm font-bold tabular-nums text-ink">
            {(best.bestMs / 1000).toFixed(2)}
          </span>{' '}
          秒
          <span className="ml-2 text-ink-3">{formatDateTime(best.achievedAt)}</span>
        </p>
      ) : (
        <p className="mt-3 text-xs text-ink-3">まだ記録がありません。</p>
      )}

      <div className="mt-10 grid gap-8 sm:grid-cols-[1fr_1.15fr]">
        <div>
          <h3 className="border-b border-ink pb-1 text-sm font-bold">遊び方</h3>
          <ol className="mt-2 space-y-1 text-xs leading-relaxed text-ink-2">
            <li>お題を見ながら、ひらがなで入力します。</li>
            <li>最初の入力から計測が始まります。</li>
            <li>Enter で判定。合格なら次の問題へ。</li>
            <li>不合格でも止まらず、直して再提出できます。</li>
            <li>{problemCount}問クリアまでの総時間がスコアです。</li>
          </ol>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
            貼り付けは使えません。変換中の Enter は確定として扱いません（ルール {rulesVersion}）。
          </p>
        </div>

        <div>
          <h3 className="border-b border-ink pb-1 text-sm font-bold">称号の目安</h3>
          <div className="mt-1">
            <RankLadder />
          </div>
        </div>
      </div>
    </section>
  );
}
