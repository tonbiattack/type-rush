import type { MixMode } from './difficulty';
import { RULES_VERSION } from './judge';

export type BestRecord = {
  rulesVersion: string;
  /** ルールバージョン + 問題IDの並びで決まる比較用のキー */
  signature: string;
  problemIds: string[];
  /** そのセットを選んだシード。同じセットを再現するのに使う */
  seed?: string;
  /** 出題した文字数帯。ベストを帯ごとに比べるために保存する */
  mix?: MixMode;
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

/**
 * 保存する記録の上限。
 * 問題セットは事実上無限に作れるので、放っておくと localStorage を圧迫する。
 * 直近 MAX_RECORDS 件に加えて、各文字数帯のベストだけは残す
 * （消すと表示中のベストが突然「記録なし」になる）。
 */
export const MAX_RECORDS = 200;

function trimRecords(records: BestRecord[]): BestRecord[] {
  if (records.length <= MAX_RECORDS) return records;

  // 帯ごとの最速レコードは残す
  const keep = new Set<BestRecord>();
  for (const record of records) {
    if (!record.mix) continue;
    const current = [...keep].find((item) => item.mix === record.mix);
    if (!current || record.bestMs < current.bestMs) {
      keep.delete(current as BestRecord);
      keep.add(record);
    }
  }

  const recent = records.slice(records.length - MAX_RECORDS);
  const seen = new Set<BestRecord>([...keep, ...recent]);
  return records.filter((record) => seen.has(record));
}

export function problemSetSignature(problemIds: string[]): string {
  return `${RULES_VERSION}::${[...problemIds].sort().join(',')}`;
}

export function emptyStore(): BestStore {
  return { version: STORE_VERSION, records: [] };
}

function isBestRecord(value: unknown): value is BestRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const mixValid =
    record.mix === undefined ||
    record.mix === 'short' ||
    record.mix === 'medium' ||
    record.mix === 'long' ||
    record.mix === 'mixed';
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
    typeof record.achievedAt === 'string' &&
    mixValid
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

    const records = trimRecords(
      store.records
        .filter(isBestRecord)
        .filter((record) => record.rulesVersion === RULES_VERSION),
    );

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

/**
 * 文字数帯ごとの最速記録。
 * 帯を固定すると問題の長さが揃うので、この値は実力の比較に使える。
 * 「全記録の最速」は短い問題が揃ったセットが必ず勝つため、表示に使わない。
 */
export function bestByMix(store: BestStore): Partial<Record<MixMode, BestRecord>> {
  const result: Partial<Record<MixMode, BestRecord>> = {};

  for (const record of store.records) {
    const mix = record.mix;
    if (!mix) continue;
    const current = result[mix];
    if (!current || record.bestMs < current.bestMs) {
      result[mix] = record;
    }
  }

  return result;
}

/** 指定した帯の最速記録 */
export function findBestByMix(store: BestStore, mix: MixMode): BestRecord | undefined {
  return bestByMix(store)[mix];
}

export type SaveOutcome = {
  store: BestStore;
  /** この問題セットでのベスト */
  best: BestRecord;
  /** 同じ文字数帯でのベスト（比較に使える値） */
  bestInMix: BestRecord;
  /** この問題セットの記録を更新したか */
  updatedSet: boolean;
  /** 同じ文字数帯のベストを更新したか */
  isNewMixBest: boolean;
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
    /** 出題した文字数帯（ベストを帯ごとに比べるため） */
    mix?: MixMode;
    elapsedMs: number;
    averageSimilarity: number;
    charactersPerSecond: number;
    achievedAt?: string;
  },
): SaveOutcome {
  const signature = problemSetSignature(input.problemIds);
  const stored = readStore(storage);
  const previous = findBest(stored, signature);
  const previousInMix = input.mix ? findBestByMix(stored, input.mix) : undefined;

  const record: BestRecord = {
    rulesVersion: RULES_VERSION,
    signature,
    problemIds: [...input.problemIds],
    seed: input.seed,
    mix: input.mix,
    bestMs: input.elapsedMs,
    averageSimilarity: input.averageSimilarity,
    charactersPerSecond: input.charactersPerSecond,
    achievedAt: input.achievedAt ?? new Date().toISOString(),
  };

  const updatedSet = !previous || record.bestMs < previous.bestMs;
  const isNewMixBest = !previousInMix || record.bestMs < previousInMix.bestMs;

  if (!updatedSet && previous) {
    return {
      store: stored,
      best: previous,
      bestInMix: previousInMix ?? previous,
      updatedSet: false,
      isNewMixBest: false,
    };
  }

  const records = trimRecords([
    ...stored.records.filter((item) => item.signature !== signature),
    record,
  ]);
  const next: BestStore = { version: STORE_VERSION, records };

  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 容量不足やプライベートモードでは保存だけ諦める。
  }

  return {
    store: next,
    best: record,
    bestInMix: isNewMixBest ? record : (previousInMix ?? record),
    updatedSet: true,
    isNewMixBest,
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
