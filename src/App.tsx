import { useEffect, useRef, useState } from 'react';
import { currentProblem, recordInput, submitAnswer, summarize } from './game/engine';
import { isBlockedInputType, shouldSubmitOnEnter } from './game/ime';
import { RULES_VERSION } from './game/judge';
import { PROBLEMS } from './game/problems';
import { pickProblems } from './game/selection';
import {
  fastestBest,
  findBest,
  problemSetSignature,
  readStore,
  saveIfBest,
  type BestRecord,
  type BestStore,
} from './game/storage';
import type { GameState, Problem } from './game/types';
import { PlayScreen } from './screens/PlayScreen';
import { ResultScreen } from './screens/ResultScreen';
import { StartScreen } from './screens/StartScreen';

export type AppProps = {
  /** 計測用クロック（テストで差し替え可能） */
  now?: () => number;
  /** 問題選択用の乱数（テストで差し替え可能） */
  random?: () => number;
  storage?: Storage | null;
  pool?: Problem[];
  problemsPerGame?: number;
};

const DEFAULT_STORAGE = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export default function App({
  now = () => performance.now(),
  random = Math.random,
  storage,
  pool = PROBLEMS,
  problemsPerGame = 5,
}: AppProps) {
  const storageRef = useRef<Storage | null>(storage ?? DEFAULT_STORAGE());
  const [game, setGame] = useState<GameState | null>(null);
  const [store, setStore] = useState<BestStore>(() => readStore(storageRef.current));
  const [newBest, setNewBest] = useState<BestRecord | null>(null);
  const [tick, setTick] = useState(0);
  const [pasteWarning, setPasteWarning] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);
  const compositionEndedAtRef = useRef<number | null>(null);
  const warningTimerRef = useRef<number | null>(null);

  // 連続 Enter でも最新の状態を参照できるよう、状態の写しを保持する
  const gameRef = useRef<GameState | null>(null);
  const status = game?.status ?? 'idle';

  const updateGame = (next: GameState | null) => {
    gameRef.current = next;
    setGame(next);
  };

  // プレイ中だけ経過時間を更新する（計測自体は performance.now() の差分）
  useEffect(() => {
    if (status !== 'playing' || game?.startedAt === null) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 50);
    return () => window.clearInterval(id);
  }, [status, game?.startedAt]);

  // 問題が変わったら入力欄へフォーカスを戻す
  useEffect(() => {
    if (status === 'playing') inputRef.current?.focus();
  }, [status, game?.currentIndex]);

  // 画面外フォーカスから戻ったら入力へ復帰する
  useEffect(() => {
    if (status !== 'playing') return;
    const refocus = () => inputRef.current?.focus();
    window.addEventListener('focus', refocus);
    return () => window.removeEventListener('focus', refocus);
  }, [status]);

  useEffect(
    () => () => {
      if (warningTimerRef.current !== null) window.clearTimeout(warningTimerRef.current);
    },
    [],
  );

  const showPasteWarning = () => {
    setPasteWarning(true);
    if (warningTimerRef.current !== null) window.clearTimeout(warningTimerRef.current);
    warningTimerRef.current = window.setTimeout(() => setPasteWarning(false), 4000);
  };

  const start = () => {
    const problems = pickProblems(pool, problemsPerGame, random);
    setNewBest(null);
    setPasteWarning(false);
    composingRef.current = false;
    compositionEndedAtRef.current = null;
    updateGame({
      status: 'playing',
      problems,
      currentIndex: 0,
      input: '',
      attempts: 0,
      results: [],
      startedAt: null,
      endedAt: null,
      feedback: null,
    });
  };

  const handleChange = (value: string) => {
    const previous = gameRef.current;
    if (!previous) return;
    updateGame(recordInput(previous, value, now(), { composing: composingRef.current }));
  };

  const handleSubmit = () => {
    const current = gameRef.current;
    if (!current) return;

    const { state: next, outcome } = submitAnswer(current, now());
    if (outcome === 'ignored') return;

    updateGame(next);

    if (outcome === 'completed') {
      const stats = summarize(next);
      const saved = saveIfBest(storageRef.current, {
        problemIds: next.problems.map((problem) => problem.id),
        elapsedMs: stats.elapsedMs,
        averageSimilarity: stats.averageSimilarity,
        charactersPerSecond: stats.charactersPerSecond,
      });
      setStore(saved.store);
      setNewBest(saved.isNewOverallBest ? saved.best : null);
      composingRef.current = false;
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') return;

    const submit = shouldSubmitOnEnter({
      key: event.key,
      isComposing: composingRef.current || event.nativeEvent.isComposing,
      keyCode: event.nativeEvent.keyCode,
      compositionEndedAt: compositionEndedAtRef.current,
      now: now(),
    });

    // 変換中の Enter はブラウザ既定の確定に任せる
    if (!submit) return;

    event.preventDefault();
    if (event.repeat) return;
    handleSubmit();
  };

  const handleCompositionStart = () => {
    composingRef.current = true;
  };

  const handleCompositionEnd = () => {
    composingRef.current = false;
    compositionEndedAtRef.current = now();
    // 変換確定で入力値が変わるケースを拾う
    const value = inputRef.current?.value;
    if (value !== undefined) handleChange(value);
  };

  const blockPaste = (event: React.ClipboardEvent | React.DragEvent) => {
    event.preventDefault();
    showPasteWarning();
  };

  const handleBeforeInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const inputType = (event.nativeEvent as InputEvent).inputType ?? '';
    if (isBlockedInputType(inputType)) {
      event.preventDefault();
      showPasteWarning();
    }
  };

  const playAgain = () => start();

  const bestForRuleVersion = fastestBest(store);
  const bestForThisSet = game
    ? findBest(store, problemSetSignature(game.problems.map((problem) => problem.id)))
    : undefined;

  return (
    <div className="min-h-dvh bg-paper text-ink">
      {/* 紙の端を思わせる上下の罫線だけ。影も角丸も使わない。 */}
      <div className="mx-auto flex min-h-dvh w-full max-w-[46rem] flex-col border-x border-rule px-5 pb-10 pt-7 sm:px-9 sm:pt-9">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink pb-2.5">
          <p className="text-lg font-bold tracking-tight">
            Type Rush
          </p>
          <p className="font-mono text-note text-ink-3">
            {problemsPerGame}問 / ルール {RULES_VERSION}
          </p>
        </header>

        <main className="flex flex-1 flex-col justify-center pt-8">
          {game === null || game.status === 'idle' ? (
            <StartScreen
              best={bestForRuleVersion}
              rulesVersion={RULES_VERSION}
              problemCount={problemsPerGame}
              onStart={start}
            />
          ) : null}

          {game?.status === 'playing' ? (
            <PlayScreen
              game={game}
              problem={currentProblem(game)}
              now={now()}
              tick={tick}
              inputRef={inputRef}
              pasteWarning={pasteWarning}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onPaste={blockPaste}
              onDrop={blockPaste}
              onBeforeInput={handleBeforeInput}
            />
          ) : null}

          {game?.status === 'result' ? (
            <ResultScreen
              game={game}
              stats={summarize(game)}
              bestForThisSet={bestForThisSet}
              bestOverall={bestForRuleVersion}
              newBest={newBest}
              rulesVersion={RULES_VERSION}
              now={now}
              onPlayAgain={playAgain}
            />
          ) : null}
        </main>

        <footer className="mt-12 border-t border-rule pt-3 text-note text-ink-3">
          <p>
            判定は文字列の近さ（Levenshtein 距離）による暫定ルールで、意味を理解した判定ではありません。
          </p>
          <p>記録はこのブラウザの localStorage にのみ保存されます。</p>
        </footer>
      </div>
    </div>
  );
}
