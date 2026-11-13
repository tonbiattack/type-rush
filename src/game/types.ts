export type GameStatus = 'idle' | 'playing' | 'result';

export type Problem = {
  id: string;
  /** ひらがなのみの短文（句読点・空白なし） */
  prompt: string;
};

export type ProblemResult = {
  problemId: string;
  prompt: string;
  /** 合格時の入力（NFKC正規化・前後空白除去済み） */
  acceptedInput: string;
  similarity: number;
  /** その問題で確定した回数（不合格の再提出を含む） */
  attempts: number;
};

export type GameFeedback = {
  similarity: number;
  attempt: number;
};

export type GameState = {
  status: GameStatus;
  problems: Problem[];
  currentIndex: number;
  input: string;
  /** 現在の問題で確定した回数（不合格を含む） */
  attempts: number;
  results: ProblemResult[];
  /** 最初の確定入力の時刻（performance.now()）。未入力なら null */
  startedAt: number | null;
  /** 最終問題の合格時刻。クリア前は null */
  endedAt: number | null;
  /** 直近の不合格判定 */
  feedback: GameFeedback | null;
};
export type SubmitOutcome =
  | 'accepted'
  | 'completed'
  | 'rejected'
  | 'empty'
  | 'ignored';
