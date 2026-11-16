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
  /** その問題にかかった時間（前の問題の合格から、この問題の合格まで） */
  durationMs: number;
  /** 合格した時刻（performance.now()）。次の問題の所要時間の起点になる */
  acceptedAt: number;
};

export type GameFeedback = {
  /**
   * 合格か不合格か。
   * 合格の判子は「通過した」通知なので次の問題に重ねて出し、入力が始まったら消す。
   * 不合格の判子は「直して再提出する」案内なので、入力しても残す。
   */
  kind: 'accepted' | 'rejected';
  similarity: number;
  attempt: number;
  /** 合格のときだけ、その問題にかかった時間 */
  problemMs?: number;
  /**
   * 不合格の理由。一致率だけ出すと「92%なのに不合格」の意味が分からない。
   * 長さ不足で落ちたのか、文字が違うのかで、次にやることが変わる。
   */
  reason?: 'too-short' | 'low-similarity';
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
  /** 直近の判定（合格・不合格の両方） */
  feedback: GameFeedback | null;
};
export type SubmitOutcome =
  | 'accepted'
  | 'completed'
  | 'rejected'
  | 'empty'
  | 'ignored';
