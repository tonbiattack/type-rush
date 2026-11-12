import type { RefObject } from 'react';
import { elapsedMs } from '../game/engine';
import { formatClock, formatSimilarity } from '../game/format';
import type { GameState, Problem } from '../game/types';

type Props = {
  game: GameState;
  problem: Problem | undefined;
  now: number;
  tick: number;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  pasteWarning: boolean;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
  onPaste: (event: React.ClipboardEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onBeforeInput: (event: React.FormEvent<HTMLTextAreaElement>) => void;
};

export function PlayScreen({
  game,
  problem,
  now,
  tick,
  inputRef,
  pasteWarning,
  onChange,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onPaste,
  onDrop,
  onBeforeInput,
}: Props) {
  void tick; // 経過時間の再描画トリガー

  if (!problem) return null;

  const elapsed = elapsedMs(game, now);
  const questionNumber = game.currentIndex + 1;
  const total = game.problems.length;
  const feedback = game.feedback;

  return (
    <section aria-labelledby="play-heading" className="flex flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">問題</p>
          <p id="play-heading" className="text-3xl font-black tabular-nums sm:text-4xl" data-testid="question-number">
            {questionNumber}
            <span className="text-lg font-semibold text-slate-400"> / {total}</span>
          </p>
        </div>
        <div className="text-right">
          <p id="elapsed-label" className="text-xs uppercase tracking-widest text-slate-400">
            経過時間
          </p>
          <p
            className="text-3xl font-black tabular-nums sm:text-4xl"
            aria-labelledby="elapsed-label"
            data-testid="elapsed"
          >
            {formatClock(elapsed)}
          </p>
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-sky-500 transition-[width] duration-200"
          style={{ width: `${(game.results.length / total) * 100}%` }}
        />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-7">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-sky-400">お題</p>
        <p
          className="select-none text-2xl leading-relaxed tracking-wide sm:text-3xl"
          style={{ wordBreak: 'break-word' }}
          aria-live="polite"
          data-testid="prompt"
        >
          {problem.prompt}
        </p>
      </div>

      <label className="sr-only" htmlFor="answer">
        回答入力
      </label>
      <textarea
        id="answer"
        ref={inputRef}
        value={game.input}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        onPaste={onPaste}
        onDrop={onDrop}
        onBeforeInput={onBeforeInput}
        onContextMenu={(event) => event.preventDefault()}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        rows={2}
        aria-describedby="answer-help"
        className="w-full resize-none rounded-2xl border-2 border-slate-700 bg-slate-900 px-4 py-3 text-xl leading-relaxed text-slate-50 outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500 sm:text-2xl"
        placeholder="お題を入力して Enter"
      />

      <p id="answer-help" className="text-xs leading-relaxed text-slate-400">
        誤字は気にせず、速く入力してください。Enterで判定します。不合格でもそのまま修正して再提出できます。
        貼り付けは使えません。
      </p>

      {pasteWarning ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200" role="alert">
          貼り付けは使えません。タイピングで入力してください。
        </p>
      ) : null}

      {feedback ? (
        <p
          className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-200"
          role="status"
        >
          一致率 {formatSimilarity(feedback.similarity)}（{feedback.attempt}回目の提出）。
          もう少し入力してみよう。Enterで再提出できます。
        </p>
      ) : (
        <p className="text-sm text-slate-500" role="status">
          {game.attempts > 0
            ? `${game.attempts}回目の提出待ちです。`
            : '最初の入力から計測が始まります。'}
        </p>
      )}
    </section>
  );
}
