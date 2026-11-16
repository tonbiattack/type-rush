import { useEffect, useRef, useState } from 'react';
import {
  DIFFICULTIES,
  MIX_LABELS,
  problemsForDifficulty,
  type MixMode,
} from './game/difficulty';
import { COUNTDOWN_TOTAL_MS, RETRY_COUNTDOWN_TOTAL_MS, countdownLabel } from './game/countdown';
import type { CountdownMode } from './game/countdown';
import { currentProblem, recordInput, submitAnswer, summarize } from './game/engine';
import { isBlockedInputType, shouldSubmitOnEnter } from './game/ime';
import { RULES_VERSION } from './game/judge';
import { PROBLEMS } from './game/problems';
import {
  formatSeed,
  pickProblemsWithSeed,
  randomSeed,
  seedFromString,
} from './game/selection';
import { buildShareText, buildShareUrl, pageUrl, readSharedSet } from './game/share';
import { rankFor } from './game/rank';
import {
  bestByMix,
  findBest,
  findBestByMix,
  problemSetSignature,
  readStore,
  saveIfBest,
  type BestRecord,
  type BestStore,
} from './game/storage';
import type { GameState, Problem } from './game/types';
import { CountdownScreen } from './screens/CountdownScreen';
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
  /** カウントダウンの長さ（テストで短縮するため） */
  countdownTotalMs?: number;
};

const DEFAULT_STORAGE = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/**
 * 難易度に応じた出題プールを返す。
 * 帯が違うとタイムを比較できないので、同じ帯の中だけで5問を選ぶ。
 */
function poolFor(pool: Problem[], mix: MixMode): Problem[] {
  if (mix === 'mixed') return pool;
  const filtered = problemsForDifficulty(pool, mix);
  // 帯の問題が足りないときは全体から選ぶ（ゲームが止まるより良い）
  return filtered.length >= 5 ? filtered : pool;
}

export default function App({
  now = () => performance.now(),
  random = Math.random,
  storage,
  pool = PROBLEMS,
  problemsPerGame = 5,
  countdownTotalMs = COUNTDOWN_TOTAL_MS,
}: AppProps) {
  const storageRef = useRef<Storage | null>(storage ?? DEFAULT_STORAGE());
  const [game, setGame] = useState<GameState | null>(null);
  const [store, setStore] = useState<BestStore>(() => readStore(storageRef.current));
  const [newBest, setNewBest] = useState<BestRecord | null>(null);
  const [tick, setTick] = useState(0);
  const [pasteWarning, setPasteWarning] = useState(false);
  const [mix, setMix] = useState<MixMode>('mixed');
  /** 現在のプレイで使ったシード。再挑戦時に同じセットを再現する */
  const [seed, setSeed] = useState<string | null>(null);
  /**
   * カウントダウンの開始時刻。null ならカウントダウン中ではない。
   * 計測用の startedAt（最初の入力）とは別物。
   */
  const [countdownFrom, setCountdownFrom] = useState<number | null>(null);
  /**
   * 初回は 3・2・1 を出し、再挑戦は「スタート」だけで始める。
   * 同じ問題をもう一度打つだけなので、待たせるほど熱が冷める。
   */
  const [countdownMode, setCountdownMode] = useState<CountdownMode>('full');
  const countdownMs =
    countdownMode === 'retry'
      ? Math.min(RETRY_COUNTDOWN_TOTAL_MS, countdownTotalMs)
      : countdownTotalMs;
  /**
   * 共有リンクから開いたときのセット。
   * 受け取った人が同じ5問を遊べるように、スタートでこのセットを使う。
   */
  const [sharedSeed, setSharedSeed] = useState<string | null>(null);
  /** 共有ボタンの結果。コピーできたか、できなかったか */
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle');

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

  // カウントダウン中は数字の更新と終了判定を回す（計測はまだ始めない）
  useEffect(() => {
    if (countdownFrom === null) return;

    const id = window.setInterval(() => {
      // 経過時間で終了を判定する。setTimeout だけに頼ると、
      // バックグラウンドタブでタイマーが絞り込まれたときに解除されない。
      if (now() - countdownFrom >= countdownMs) {
        setCountdownFrom(null);
        return;
      }
      setTick((value) => value + 1);
    }, 60);

    return () => window.clearInterval(id);
    // now と countdownMs は起動中に変わらない前提
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownFrom, countdownMs]);

  // プレイ中だけ経過時間を更新する（計測自体は performance.now() の差分）
  useEffect(() => {
    if (status !== 'playing' || game?.startedAt === null) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 50);
    return () => window.clearInterval(id);
  }, [status, game?.startedAt]);

  // カウントダウンが終わったら入力欄へフォーカスする
  useEffect(() => {
    if (countdownFrom === null) return;
    inputRef.current?.focus();
  }, [countdownFrom]);

  // 問題が変わったら入力欄へフォーカスを戻す
  useEffect(() => {
    if (status === 'playing' && countdownFrom === null) inputRef.current?.focus();
  }, [status, game?.currentIndex, countdownFrom]);

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

  // 共有リンク（?seed=...&mix=...）から開かれたら、そのセットを次のプレイに使う。
  // URL は消さない（リロードやブックマークでも同じセットを遊べるようにする）。
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const shared = readSharedSet(window.location.search);
    if (shared.seed) setSharedSeed(shared.seed);
    if (shared.mix) setMix(shared.mix);
  }, []);

  const showPasteWarning = () => {
    setPasteWarning(true);
    if (warningTimerRef.current !== null) window.clearTimeout(warningTimerRef.current);
    warningTimerRef.current = window.setTimeout(() => setPasteWarning(false), 4000);
  };

  // カウントダウンを開始する。終了は経過時間を見て上の effect が判定する。
  const beginCountdown = (mode: CountdownMode) => {
    setCountdownMode(mode);
    setCountdownFrom(now());
    setTick((value) => value + 1);
  };

  const start = (options: { seed?: string; mix?: MixMode; mode?: CountdownMode } = {}) => {
    const nextMix = options.mix ?? mix;
    // 初回もシード経由で選ぶ。そうしないと「同じセット」を再現できない。
    // 共有リンクから来たときは、そのセットをそのまま使う（受け取った人が同じ5問を遊べる）。
    const nextSeed = options.seed ?? sharedSeed ?? formatSeed(randomSeed(random));
    const selectedPool = poolFor(pool, nextMix);
    const problems = pickProblemsWithSeed(
      selectedPool,
      problemsPerGame,
      seedFromString(nextSeed),
    );

    setMix(nextMix);
    setSeed(nextSeed);
    // 共有されたセットは1回使ったら解除する。2回目からは新しい5問にする。
    setSharedSeed(null);
    setNewBest(null);
    setShareState('idle');
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
    beginCountdown(options.mode ?? 'full');
  };

  /** 終わったのと同じ5問でもう一度 */
  const retrySameSet = () => {
    if (seed === null) {
      start({ mode: 'retry' });
      return;
    }
    start({ seed, mix, mode: 'retry' });
  };

  /** 新しいセットで再挑戦 */
  const retryNewSet = () => {
    start({ mix, mode: 'retry' });
  };

  /**
   * スタート画面へ戻る。
   * 記録は結果画面を出した時点で保存済みなので、ここでは状態を捨てるだけでよい。
   * シードも消す（戻ったあとに「同じ5問」が残っていると、何のセットか分からなくなる）。
   */
  const goHome = () => {
    updateGame(null);
    setSeed(null);
    setNewBest(null);
    setShareState('idle');
    setPasteWarning(false);
    setCountdownFrom(null);
    composingRef.current = false;
    compositionEndedAtRef.current = null;
  };

  /**
   * スコアを共有する。
   * クリップボードが使えない環境（http や権限なし）でも詰まらないよう、
   * 失敗したら「URL をコピーできませんでした」と出して手で選べる状態にする。
   */
  const shareScore = async () => {
    const current = gameRef.current;
    if (!current || current.status !== 'result') return;

    const stats = summarize(current);
    const url = buildShareUrl(pageUrl(), { seed, mix });
    const text = buildShareText({
      elapsedMs: stats.elapsedMs,
      charactersPerSecond: stats.charactersPerSecond,
      rankLabel: rankFor(stats.charactersPerSecond).label,
      mixLabel: MIX_LABELS[mix],
      problemCount: current.problems.length,
      url,
    });

    try {
      await navigator.clipboard.writeText(text);
      setShareState('copied');
    } catch {
      setShareState('failed');
    }
  };

  const handleChange = (value: string) => {
    // カウントダウン中の入力は捨てる（フライングで計測が始まらないように）
    if (countdownFrom !== null) return;
    const previous = gameRef.current;
    if (!previous) return;
    updateGame(recordInput(previous, value, now(), { composing: composingRef.current }));
  };

  const handleSubmit = () => {
    // カウントダウン中の Enter は無視する
    if (countdownFrom !== null) return;
    const current = gameRef.current;
    if (!current) return;

    const { state: next, outcome } = submitAnswer(current, now());
    if (outcome === 'ignored') return;

    updateGame(next);

    if (outcome === 'completed') {
      const stats = summarize(next);
      const saved = saveIfBest(storageRef.current, {
        problemIds: next.problems.map((problem) => problem.id),
        seed: seed ?? undefined,
        mix,
        elapsedMs: stats.elapsedMs,
        averageSimilarity: stats.averageSimilarity,
        charactersPerSecond: stats.charactersPerSecond,
      });
      setStore(saved.store);
      setNewBest(saved.isNewMixBest ? saved.best : null);
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

  const bestsByMix = bestByMix(store);
  const bestForThisSet = game
    ? findBest(store, problemSetSignature(game.problems.map((problem) => problem.id)))
    : undefined;
  const bestInMix = findBestByMix(store, mix);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      {/* 紙の端を思わせる上下の罫線だけ。影も角丸も使わない。 */}
      <div className="mx-auto flex min-h-dvh w-full max-w-[46rem] flex-col border-x border-rule px-5 pb-10 pt-7 sm:px-9 sm:pt-9">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink pb-2.5">
          <p className="text-lg font-bold tracking-tight">Type Rush</p>
          <p className="font-mono text-note text-ink-3">
            {problemsPerGame}問 / ルール {RULES_VERSION}
          </p>
        </header>

        <main className="flex flex-1 flex-col justify-center pt-8">
          {game === null || game.status === 'idle' ? (
            <StartScreen
              bestsByMix={bestsByMix}
              mix={mix}
              rulesVersion={RULES_VERSION}
              problemCount={problemsPerGame}
              mixLabels={MIX_LABELS}
              difficulties={DIFFICULTIES}
              sharedSeed={sharedSeed}
              onMixChange={setMix}
              onStart={() => start({ mix })}
            />
          ) : null}

          {game?.status === 'playing' && countdownFrom !== null ? (
            <CountdownScreen
              label={
                countdownLabel(now() - countdownFrom, countdownMode, countdownMs) ?? 'スタート'
              }
              problemCount={game.problems.length}
              firstPrompt={game.problems[0]?.prompt ?? ''}
              mode={countdownMode}
            />
          ) : null}

          {game?.status === 'playing' && countdownFrom === null ? (
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
              bestInMix={bestInMix}
              mix={mix}
              mixLabel={MIX_LABELS[mix]}
              newBest={newBest}
              seed={seed}
              now={now}
              onRetrySameSet={retrySameSet}
              onRetryNewSet={retryNewSet}
              onGoHome={goHome}
              onShare={shareScore}
              shareState={shareState}
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
