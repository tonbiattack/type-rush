import { RULES_VERSION } from './judge';

export type BestRecord = {
  rulesVersion: string;
  /** ルールバージョン + 問題IDの並びで決まる比較用のキー */
  signature: string;
  problemIds: string[];
  /** そのセットを選んだシード。同じセットを再現するのに使う */
  seed?: string;
  bestMs: number;
  averageSimilarity: number;
  charactersPerSecond: number;
  achievedAt: string;
};

export type BestStore = {
  version: 1;
  records: BestRecord[];
};

const STORAGE_KEY = 'type-rush:bests:v1';
const STORE_VERSION = 1 as const;

export function problemSetSignature(problemIds: string[]): string {
  return `${RULES_VERSION}::${[...problemIds].sort().join(',')}`;
}

export function emptyStore(): BestStore {
  return { version: STORE_VERSION, records: [] };
}

function isBestRecord(value: unknown): value is BestRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.rulesVersion === 'string' &&
    typeof record.signature === 'string' &&
    Array.isArray(record.problemIds) &&
    record.problemIds.every((id) => typeof id === 'string') &&
    typeof record.bestMs === 'number' &&
    Number.isFinite(record.bestMs) &&
    record.bestMs >= 0 &&
    typeof record.averageSimilarity === 'number' &&
    typeof record.charactersPerSecond === 'number' &&
    typeof record.achievedAt === 'string'
  );
}

/** 壊れたデータや未対応バージョンは空のストアとして扱う（ゲームは遊べる）。 */
export function parseStore(raw: string | null): BestStore {
  if (!raw) return emptyStore();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return emptyStore();

    const store = parsed as Record<string, unknown>;
    if (store.version !== STORE_VERSION || !Array.isArray(store.records)) {
      return emptyStore();
    }

    const records = store.records
      .filter(isBestRecord)
      .filter((record) => record.rulesVersion === RULES_VERSION);

    return { version: STORE_VERSION, records };
  } catch {
    return emptyStore();
  }
}

export function findBest(store: BestStore, signature: string): BestRecord | undefined {
  return store.records
    .filter((record) => record.signature === signature)
    .sort((a, b) => a.bestMs - b.bestMs)[0];
}

/** ルールバージョン内で最も速い記録（参考表示用） */
export function fastestBest(store: BestStore): BestRecord | undefined {
  return [...store.records].sort((a, b) => a.bestMs - b.bestMs)[0];
}

export type SaveOutcome = {
  store: BestStore;
  /** この問題セットでのベスト */
  best: BestRecord;
  /** ルールバージョン全体での最速記録 */
  fastest: BestRecord;
  /** この問題セットの記録を更新したか */
  updatedSet: boolean;
  /** ルールバージョン全体の最速記録を更新したか */
  isNewOverallBest: boolean;
};

/**
 * 記録が自己ベストなら保存する。保存できなくてもプレイは継続できるよう、
 * 例外は握りつぶしてメモリ上のストアを返す。
 */
export function saveIfBest(
  storage: Storage | null,
  input: {
    problemIds: string[];
    /** 問題を選んだシード（再挑戦で同じセットを再現するため） */
    seed?: string;
    elapsedMs: number;
    averageSimilarity: number;
    charactersPerSecond: number;
    achievedAt?: string;
  },
): SaveOutcome {
  const signature = problemSetSignature(input.problemIds);
  const stored = readStore(storage);
  const previous = findBest(stored, signature);
  const previousFastest = fastestBest(stored);

  const record: BestRecord = {
    rulesVersion: RULES_VERSION,
    signature,
    problemIds: [...input.problemIds],
    seed: input.seed,
    bestMs: input.elapsedMs,
    averageSimilarity: input.averageSimilarity,
    charactersPerSecond: input.charactersPerSecond,
    achievedAt: input.achievedAt ?? new Date().toISOString(),
  };

  const updatedSet = !previous || record.bestMs < previous.bestMs;
  const isNewOverallBest = !previousFastest || record.bestMs < previousFastest.bestMs;

  if (!updatedSet && previous) {
    return {
      store: stored,
      best: previous,
      fastest: previousFastest ?? previous,
      updatedSet: false,
      isNewOverallBest: false,
    };
  }

  const records = [...stored.records.filter((item) => item.signature !== signature), record];
  const next: BestStore = { version: STORE_VERSION, records };

  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 容量不足やプライベートモードでは保存だけ諦める。
  }

  return {
    store: next,
    best: record,
    fastest: isNewOverallBest ? record : (previousFastest ?? record),
    updatedSet: true,
    isNewOverallBest,
  };
}

export function readStore(storage: Storage | null): BestStore {
  if (!storage) return emptyStore();

  try {
    return parseStore(storage.getItem(STORAGE_KEY));
  } catch {
    return emptyStore();
  }
}

export function getBestFor(
  storage: Storage | null,
  problemIds: string[],
): BestRecord | undefined {
  return findBest(readStore(storage), problemSetSignature(problemIds));
}

export function getFastestBest(storage: Storage | null): BestRecord | undefined {
  return fastestBest(readStore(storage));
}

/** テストや「記録を消す」用 */
export function clearBests(storage: Storage | null): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
