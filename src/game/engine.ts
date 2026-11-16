import { multiScriptJudge, type Judge } from './judge';
import type { GameState, Problem, SubmitOutcome } from './types';

export function createGame(problems: Problem[]): GameState {
  return {
    status: 'playing',
    problems,
    currentIndex: 0,
    input: '',
    attempts: 0,
    results: [],
    startedAt: null,
    endedAt: null,
    feedback: null,
  };
}

export const initialState: GameState = {
  status: 'idle',
  problems: [],
  currentIndex: 0,
  input: '',
  attempts: 0,
  results: [],
  startedAt: null,
  endedAt: null,
  feedback: null,
};

export function currentProblem(state: GameState): Problem | undefined {
  return state.problems[state.currentIndex];
}

/**
 * 入力欄の変更を反映する。
 * 計測開始は「最初の確定入力」から。IME 変換中 (composing) は開始しない。
 * 一度開始した後は、入力を消しても開始時刻を戻さない。
 */
export function recordInput(
  state: GameState,
  value: string,
  now: number,
  options: { composing?: boolean } = {},
): GameState {
  if (state.status !== 'playing') return state;

  const startedAt =
    state.startedAt === null && !options.composing && value.trim() !== ''
      ? now
      : state.startedAt;

  // 合格の判子は「次の問題へ進んだ」合図なので、打ち始めたら消す。
  // 不合格の判子は直すための案内なので、入力中も残す。
  const feedback = state.feedback?.kind === 'accepted' && value !== '' ? null : state.feedback;

  return { ...state, input: value, startedAt, feedback };
}

export type SubmitResult = {
  state: GameState;
  outcome: SubmitOutcome;
};

/**
 * 現在の入力を確定する。不合格でも状態は playing のまま計測を続ける。
 */
export function submitAnswer(
  state: GameState,
  now: number,
  judge: Judge = multiScriptJudge,
): SubmitResult {
  const problem = currentProblem(state);
  if (state.status !== 'playing' || !problem) {
    return { state, outcome: 'ignored' };
  }

  if (state.input.trim() === '') {
    return { state, outcome: 'empty' };
  }

  const judged = judge.evaluate(problem.prompt, state.input);
  const attempts = state.attempts + 1;
  const startedAt = state.startedAt ?? now;

  if (!judged.passed) {
    return {
      state: {
        ...state,
        startedAt,
        attempts,
        feedback: {
          kind: 'rejected',
          similarity: judged.similarity,
          attempt: attempts,
          reason: judged.reason === 'too-short' ? 'too-short' : 'low-similarity',
        },
      },
      outcome: 'rejected',
    };
  }

  // この問題にかかった時間。1問目は計測開始から、2問目以降は前の合格から数える。
  const previousAcceptedAt = state.results[state.results.length - 1]?.acceptedAt;
  const problemStartedAt = previousAcceptedAt ?? startedAt;
  const durationMs = Math.max(0, now - problemStartedAt);

  const results = [
    ...state.results,
    {
      problemId: problem.id,
      prompt: problem.prompt,
      acceptedInput: judged.normalizedInput,
      similarity: judged.similarity,
      attempts,
      durationMs,
      acceptedAt: now,
    },
  ];

  const completed = results.length === state.problems.length;

  return {
    state: {
      ...state,
      startedAt,
      results,
      attempts: 0,
      input: '',
      // 合格の判子は次の問題に重ねて出す。打ち始めたら recordInput が消す。
      feedback: completed
        ? null
        : {
            kind: 'accepted',
            similarity: judged.similarity,
            attempt: attempts,
            problemMs: durationMs,
          },
      currentIndex: completed ? state.currentIndex : state.currentIndex + 1,
      status: completed ? 'result' : 'playing',
      endedAt: completed ? now : null,
    },
    outcome: completed ? 'completed' : 'accepted',
  };
}

export function elapsedMs(state: GameState, now: number): number {
  if (state.startedAt === null) return 0;
  const end = state.endedAt ?? now;
  return Math.max(0, end - state.startedAt);
}

/** 合格した入力の文字数合計（Unicode コードポイント） */
export function totalAcceptedCharacters(state: GameState): number {
  return state.results.reduce(
    (total, result) => total + Array.from(result.acceptedInput).length,
    0,
  );
}

export function averageSimilarity(state: GameState): number {
  if (state.results.length === 0) return 0;
  const sum = state.results.reduce((total, result) => total + result.similarity, 0);
  return sum / state.results.length;
}

export type GameStats = {
  elapsedMs: number;
  characters: number;
  /** 文字/秒 */
  charactersPerSecond: number;
  /** 文字/分 */
  charactersPerMinute: number;
  averageSimilarity: number;
};

export function summarize(state: GameState, now: number = state.endedAt ?? 0): GameStats {
  const durationMs = elapsedMs(state, now);
  const characters = totalAcceptedCharacters(state);
  const seconds = durationMs / 1000;
  const charactersPerSecond = seconds > 0 ? characters / seconds : 0;

  return {
    elapsedMs: durationMs,
    characters,
    charactersPerSecond,
    charactersPerMinute: charactersPerSecond * 60,
    averageSimilarity: averageSimilarity(state),
  };
}
