import { RankLadder } from '../components/RankLadder';
import { DIFFICULTY_LABELS, type Difficulty, type MixMode } from '../game/difficulty';
import { formatDateTime } from '../game/format';
import type { BestRecord } from '../game/storage';
type Props = {
  best: BestRecord | undefined;
  rulesVersion: string;
  problemCount: number;
  mix: MixMode;
  mixLabels: Record<MixMode, string>;
  difficulties: Difficulty[];
  onMixChange: (mix: MixMode) => void;
  onStart: () => void;
};

export function StartScreen({
  best,
  rulesVersion,
  problemCount,
  mix,
  mixLabels,
  difficulties,
  onMixChange,
  onStart,
}: Props) {
  const options: MixMode[] = [...difficulties, 'mixed'];

  return (
    <section aria-labelledby="start-heading" className="flex flex-1 flex-col justify-center py-6">
      <h2 id="start-heading" className="text-xl font-bold tracking-tight">
        {problemCount}問のタイピング
      </h2>
      <p className="mt-3 max-w-[38rem] text-sm leading-[1.9] text-ink-2">
        AIへの指示風のひらがな短文が{problemCount}問出ます。85%以上一致していれば合格で次の問題へ。
        誤字を直した時間も合計タイムに含まれます。
      </p>

      <fieldset className="mt-6">
        <legend className="text-xs text-ink-3">文章の長さ</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((option) => {
            const checked = mix === option;
            return (
              <label
                key={option}
                className={`cursor-pointer border px-3 py-1.5 text-xs transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-shu ${
                  checked
                    ? 'border-ink bg-ink text-paper'
                    : 'border-rule text-ink-2 hover:border-ink-3'
                }`}
              >
                {/* 見た目はラベル側で作るので、input 自体は隠す（キーボード操作は残す） */}
                <input
                  type="radio"
                  name="mix"
                  value={option}
                  checked={checked}
                  onChange={() => onMixChange(option)}
                  className="sr-only"
                />
                {option === 'mixed' ? mixLabels.mixed : DIFFICULTY_LABELS[option]}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-note leading-relaxed text-ink-3">
          同じ長さの中だけで出題するので、タイムを比べられます。
        </p>
      </fieldset>

      <figure className="mt-6">
        <blockquote className="border-l-2 border-shu py-1 pl-3 text-lg leading-relaxed text-ink sm:text-xl">
          このぶんをよんでかんたんにまとめてください
        </blockquote>
        <figcaption className="mt-1.5 pl-3 text-note text-ink-3">お題の例</figcaption>
      </figure>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <button
          type="button"
          onClick={onStart}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.repeat) event.preventDefault();
          }}
          autoFocus
          className="inline-flex w-full items-baseline justify-between gap-6 border-2 border-ink bg-ink px-5 py-3.5 text-left text-paper transition-colors hover:border-shu hover:bg-shu sm:w-auto sm:min-w-[15rem]"
        >
          <span className="text-lg font-bold">スタート</span>
          <span className="font-mono text-note opacity-70">Enter</span>
        </button>

        {best ? (
          <p className="text-xs text-ink-2" data-testid="start-best">
            自己ベスト{' '}
            <span className="font-mono text-sm font-bold tabular-nums text-ink">
              {(best.bestMs / 1000).toFixed(2)}
            </span>{' '}
            秒
            <span className="ml-2 text-ink-3">{formatDateTime(best.achievedAt)}</span>
          </p>
        ) : (
          <p className="text-xs text-ink-3">まだ記録がありません。</p>
        )}
      </div>

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
          <p className="mt-3 text-note leading-relaxed text-ink-3">
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
