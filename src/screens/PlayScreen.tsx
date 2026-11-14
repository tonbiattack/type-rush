import type { RefObject } from 'react';
import { RomajiGuide } from '../components/RomajiGuide';
import { Stamp } from '../components/Stamp';
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
    <section aria-labelledby="play-heading" className="flex flex-1 flex-col">
      <div className="flex items-end justify-between gap-4">
        <p id="play-heading" className="text-sm text-ink-2" data-testid="question-number">
          <span className="font-mono text-2xl font-bold tabular-nums text-ink">
            {questionNumber}
          </span>
          <span className="font-mono text-xs"> / {total}</span>
        </p>
        <p className="text-right">
          <span className="mr-1.5 align-middle text-note text-ink-3">経過</span>
          <span
            className="font-mono text-2xl font-bold tabular-nums sm:text-3xl"
            data-testid="elapsed"
            aria-label="経過時間"
          >
            {formatClock(elapsed)}
          </span>
        </p>
      </div>

      {/* 進捗は数字の目盛り。バーではなく區切りで数える。 */}
      <div className="mt-2 flex gap-[3px]" aria-hidden="true">
        {game.problems.map((item, index) => (
          <span
            key={item.id}
            className={`h-[3px] flex-1 ${
              index < game.results.length ? 'bg-ink' : 'bg-rule'
            }`}
          />
        ))}
      </div>

      {/* お題・入力欄・判定はひとつながりの仕事。まとめて画面中央に置く。 */}
      <div className="flex flex-1 flex-col justify-center py-6">
        <div className="border-y border-rule py-8">
          <p
            className="text-[1.55rem] leading-[1.75] tracking-[0.01em] sm:text-[2.1rem] sm:leading-[1.7]"
            style={{ wordBreak: 'break-word' }}
            data-testid="prompt"
          >
            {problem.prompt}
          </p>
          <div className="mt-2.5">
            <RomajiGuide prompt={problem.prompt} />
          </div>
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
          className="mt-4 w-full resize-none border border-ink/40 bg-white/60 px-3 py-2.5 text-xl leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-3/70 focus:border-ink sm:text-2xl"
          placeholder="お題を入力して Enter"
        />

        <p id="answer-help" className="mt-2 text-note text-ink-3">
          誤字は気にせず、速く。Enter で判定、不合格ならそのまま直して再提出できます。貼り付けは使えません。
        </p>

        <div className="mt-4 min-h-[4.5rem]" aria-live="polite" role="status">
          {feedback ? (
            <div className="flex items-center gap-4">
              <Stamp
                verdict="不合格"
                detail={formatSimilarity(feedback.similarity)}
                tone="retry"
              />
              <p className="text-sm leading-relaxed text-ink-2" data-testid="feedback">
                {feedback.attempt}回目の提出。もう少し入力してみよう。
                <br />
                入力を直して Enter で再提出できます。
              </p>
            </div>
          ) : pasteWarning ? (
            <p className="border-l-2 border-shu py-1 pl-3 text-sm text-ink" role="alert">
              貼り付けは使えません。タイピングで入力してください。
            </p>
          ) : (
            <p className="text-sm text-ink-3" data-testid="feedback">
              {game.attempts > 0
                ? `${game.attempts}回目の提出待ちです。`
                : game.startedAt === null
                  ? '最初の入力から計測が始まります。'
                  : '入力中。Enter で判定します。'}
            </p>
          )}
        </div>

        {pasteWarning && feedback ? (
          <p className="-mt-2 border-l-2 border-shu py-1 pl-3 text-sm text-ink" role="alert">
            貼り付けは使えません。タイピングで入力してください。
          </p>
        ) : null}
      </div>
    </section>
  );
}
