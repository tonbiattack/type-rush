import { describe, expect, it } from 'vitest';
import {
  MIN_INPUT_LENGTH_RATIO,
  RULES_VERSION,
  SIMILARITY_THRESHOLD,
  hasEnoughLength,
  levenshteinDistance,
  normalizeText,
  similarityJudge,
  similarityScore,
} from '../game/judge';
import { PROBLEMS } from '../game/problems';
import { pickProblems } from '../game/selection';
import {
  averageSimilarity,
  createGame,
  elapsedMs,
  initialState,
  recordInput,
  submitAnswer,
  summarize,
  totalAcceptedCharacters,
} from '../game/engine';
import {
  MAX_RECORDS,
  bestByMix,
  emptyStore,
  findBest,
  findBestByMix,
  parseStore,
  problemSetSignature,
  saveIfBest,
  type BestStore,
} from '../game/storage';
import { formatStats } from '../game/format';
import type { Problem } from '../game/types';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

const prompt = 'あいうえおかきくけこ'; // 10文字

describe('normalizeText', () => {
  it('NFKC 正規化と前後空白除去を行う', () => {
    expect(normalizeText('  ｱｲｳ  ')).toBe('アイウ');
    expect(normalizeText('  あい う  ')).toBe('あい う');
  });

  it('内部の空白は削除しない', () => {
    expect(normalizeText('あ い')).toBe('あ い');
  });
});

describe('levenshteinDistance', () => {
  it('完全一致は0', () => {
    expect(levenshteinDistance(prompt, prompt)).toBe(0);
  });

  it('空文字との比較は相手の長さ', () => {
    expect(levenshteinDistance('', prompt)).toBe(10);
    expect(levenshteinDistance(prompt, '')).toBe(10);
    expect(levenshteinDistance('', '')).toBe(0);
  });

  it('1文字置換は1', () => {
    expect(levenshteinDistance('あいうえお', 'あいうえか')).toBe(1);
  });

  it('1文字挿入・削除は1', () => {
    expect(levenshteinDistance('あいうえお', 'あいうえおか')).toBe(1);
    expect(levenshteinDistance('あいうえお', 'あいうえ')).toBe(1);
  });

  it('サロゲートペアを1文字として数える', () => {
    expect(levenshteinDistance('😀あ', '😀い')).toBe(1);
  });
});

describe('similarityScore', () => {
  it('空文字は0', () => {
    expect(similarityScore(prompt, '')).toBe(0);
    expect(similarityScore('', prompt)).toBe(0);
  });

  it('完全一致は1', () => {
    expect(similarityScore(prompt, prompt)).toBe(1);
  });

  it('1文字置換は 1 - 1/max(n,m)', () => {
    expect(similarityScore(prompt, 'あいうえおかきくけこ')).toBe(1);
    expect(similarityScore(prompt, 'あいうえおかきくけさ')).toBeCloseTo(0.9);
  });
});

describe('hasEnoughLength', () => {
  it('正解長の80%以上を受け入れる', () => {
    expect(hasEnoughLength(10, 8)).toBe(true);
    expect(hasEnoughLength(10, 7)).toBe(false);
  });

  it('正解長が0の場合は常に真', () => {
    expect(hasEnoughLength(0, 0)).toBe(true);
  });
});

describe('similarityJudge の合否境界', () => {
  it('完全一致は合格', () => {
    const result = similarityJudge.evaluate(prompt, prompt);
    expect(result.passed).toBe(true);
    expect(result.similarity).toBe(1);
    expect(result.reason).toBe('passed');
  });

  it('空文字は不合格', () => {
    const result = similarityJudge.evaluate(prompt, '   ');
    expect(result.passed).toBe(false);
    expect(result.similarity).toBe(0);
    expect(result.reason).toBe('empty');
  });

  it('ちょうど85%かつ長さ80%で合格', () => {
    // 20文字中3文字置換 → similarity = 1 - 3/20 = 0.85
    const longPrompt = 'あ'.repeat(20);
    const input = `${'あ'.repeat(17)}${'い'.repeat(3)}`;
    const result = similarityJudge.evaluate(longPrompt, input);
    expect(result.similarity).toBeCloseTo(SIMILARITY_THRESHOLD);
    expect(result.passed).toBe(true);
  });

  it('85%未満は不合格', () => {
    // 20文字中4文字置換 → 0.8
    const longPrompt = 'あ'.repeat(20);
    const input = `${'あ'.repeat(16)}${'い'.repeat(4)}`;
    const result = similarityJudge.evaluate(longPrompt, input);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('low-similarity');
  });

  it('長さが80%未満なら類似度に関わらず不合格（理由は too-short）', () => {
    const longPrompt = 'あ'.repeat(20);
    const input = 'あ'.repeat(Math.ceil(20 * MIN_INPUT_LENGTH_RATIO) - 1); // 15文字
    const result = similarityJudge.evaluate(longPrompt, input);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('too-short');
  });

  it('ちょうど80%の長さは長さ条件を満たすが、類似度85%には届かない', () => {
    const longPrompt = 'あ'.repeat(20);
    const input = 'あ'.repeat(16);
    const result = similarityJudge.evaluate(longPrompt, input);
    // 16/20 = 0.8 なので長さ条件は通るが similarity 0.8 で不合格
    expect(hasEnoughLength(20, 16)).toBe(true);
    expect(result.similarity).toBeCloseTo(0.8);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('low-similarity');
  });

  it('不足入力は不合格', () => {
    expect(similarityJudge.evaluate(prompt, 'あいうえ').passed).toBe(false);
  });

  it('余分入力は不合格（半分未満の追加なら合格）', () => {
    expect(similarityJudge.evaluate(prompt, `${prompt}さしすせそ`).passed).toBe(false);
    expect(similarityJudge.evaluate(prompt, `${prompt}さ`).passed).toBe(true);
  });

  it('前後の空白とNFKCは正規化してから判定する', () => {
    expect(similarityJudge.evaluate(prompt, `  ${prompt}  `).passed).toBe(true);
  });

  it('ルールバージョンが定義されている', () => {
    expect(RULES_VERSION).toBeTruthy();
  });
});

describe('問題データ', () => {
  it('100問以上ある', () => {
    expect(PROBLEMS.length).toBeGreaterThanOrEqual(100);
  });

  it('AIへの指示でありそうな問題が半分以上ある', () => {
    const instructionLike = PROBLEMS.filter((problem) =>
      /(ください|して$|ほしい|まとめて|せつめい|かくにん|ていあん|くらべて|してね)/.test(problem.prompt),
    );
    expect(instructionLike.length).toBeGreaterThanOrEqual(Math.floor(PROBLEMS.length / 2));
  });

  it('IDが重複しない', () => {
    const ids = new Set(PROBLEMS.map((problem) => problem.id));
    expect(ids.size).toBe(PROBLEMS.length);
  });

  it('問題文が重複しない', () => {
    const prompts = new Set(PROBLEMS.map((problem) => problem.prompt));
    expect(prompts.size).toBe(PROBLEMS.length);
  });

  it('すべてひらがなのみで、句読点・空白を含まない', () => {
    for (const problem of PROBLEMS) {
      expect(problem.prompt).toMatch(/^[\u3041-\u3096ー]+$/);
    }
  });

  it('20〜40文字に収まっている', () => {
    for (const problem of PROBLEMS) {
      const length = Array.from(problem.prompt).length;
      expect(length).toBeGreaterThanOrEqual(20);
      expect(length).toBeLessThanOrEqual(40);
    }
  });
});

describe('pickProblems', () => {
  it('指定数を重複なしで選ぶ', () => {
    const picked = pickProblems(PROBLEMS, 5, () => 0.42);
    expect(picked).toHaveLength(5);
    expect(new Set(picked.map((problem) => problem.id)).size).toBe(5);
  });

  it('プールより多くは選べない', () => {
    expect(() => pickProblems(PROBLEMS, PROBLEMS.length + 1)).toThrow();
    expect(() => pickProblems(PROBLEMS, -1)).toThrow();
    expect(() => pickProblems(PROBLEMS, 1.5)).toThrow();
  });

  it('ランダム関数で選択結果が変わる', () => {
    const a = pickProblems(PROBLEMS, 5, () => 0);
    const b = pickProblems(PROBLEMS, 5, () => 0.99);
    expect(a.map((problem) => problem.id)).not.toEqual(b.map((problem) => problem.id));
  });

  it('元の配列を破壊しない', () => {
    const original = PROBLEMS.map((problem) => problem.id);
    pickProblems(PROBLEMS, 5);
    expect(PROBLEMS.map((problem) => problem.id)).toEqual(original);
  });
});

describe('ゲームエンジン', () => {
  const problems: Problem[] = [
    { id: 'a', prompt: 'あいうえおかきくけこ' },
    { id: 'b', prompt: 'さしすせそたちつてと' },
  ];

  it('初期状態は idle でタイマーは進まない', () => {
    expect(initialState.status).toBe('idle');
    expect(elapsedMs(initialState, 10_000)).toBe(0);
    expect(summarize(initialState, 10_000).charactersPerSecond).toBe(0);
  });

  it('最初の入力で計測が始まる', () => {
    let state = createGame(problems);
    state = recordInput(state, '', 1000);
    expect(state.startedAt).toBeNull();

    state = recordInput(state, 'あ', 1500);
    expect(state.startedAt).toBe(1500);
    expect(elapsedMs(state, 2500)).toBe(1000);
  });

  it('IME 変換中の入力では計測を始めない', () => {
    let state = createGame(problems);
    state = recordInput(state, 'あ', 1000, { composing: true });
    expect(state.startedAt).toBeNull();
  });

  it('入力を消しても開始時刻は戻らない', () => {
    let state = createGame(problems);
    state = recordInput(state, 'あ', 1000);
    state = recordInput(state, '', 1200);
    expect(state.startedAt).toBe(1000);
  });

  it('空入力の確定は何も変えない', () => {
    let state = createGame(problems);
    state = recordInput(state, '   ', 1000);
    const before = state;
    const result = submitAnswer(before, 1100);
    expect(result.outcome).toBe('empty');
    expect(result.state).toBe(before);
  });

  it('不合格でもプレイを継続し、計測も止めない', () => {
    let state = createGame(problems);
    state = recordInput(state, 'あいうえ', 1000);
    const result = submitAnswer(state, 2000);

    expect(result.outcome).toBe('rejected');
    expect(result.state.status).toBe('playing');
    expect(result.state.currentIndex).toBe(0);
    expect(result.state.attempts).toBe(1);
    expect(result.state.feedback?.attempt).toBe(1);
    expect(result.state.input).toBe('あいうえ');
    expect(elapsedMs(result.state, 3000)).toBe(2000);
  });

  it('不合格の後に修正して再提出できる', () => {
    let state = createGame(problems);
    state = recordInput(state, 'あいうえ', 1000);
    state = submitAnswer(state, 1500).state;
    state = recordInput(state, problems[0].prompt, 2000);
    const result = submitAnswer(state, 2500);

    expect(result.outcome).toBe('accepted');
    expect(result.state.currentIndex).toBe(1);
    expect(result.state.results[0].attempts).toBe(2);
    expect(elapsedMs(result.state, 4000)).toBe(3000);
  });

  it('全問クリアで result になりタイマーが止まる', () => {
    let state = createGame(problems);
    state = recordInput(state, problems[0].prompt, 1000);
    state = submitAnswer(state, 2000).state;
    expect(state.status).toBe('playing');

    state = recordInput(state, problems[1].prompt, 3000);
    const result = submitAnswer(state, 5000);

    expect(result.outcome).toBe('completed');
    expect(result.state.status).toBe('result');
    expect(result.state.endedAt).toBe(5000);
    expect(elapsedMs(result.state, 60_000)).toBe(4000);
    expect(result.state.feedback).toBeNull();
  });

  it('result 状態では提出を受け付けない', () => {
    const state = { ...createGame(problems), status: 'result' as const };
    expect(submitAnswer(state, 1000).outcome).toBe('ignored');
  });

  it('統計は文字/秒・文字/分・平均一致率を返す', () => {
    let state = createGame(problems);
    state = recordInput(state, problems[0].prompt, 0);
    state = submitAnswer(state, 2000).state;
    state = recordInput(state, problems[1].prompt, 2000);
    state = submitAnswer(state, 4000).state;

    const stats = summarize(state);
    expect(stats.elapsedMs).toBe(4000);
    expect(totalAcceptedCharacters(state)).toBe(20);
    expect(stats.charactersPerSecond).toBeCloseTo(5);
    expect(stats.charactersPerMinute).toBeCloseTo(300);
    expect(averageSimilarity(state)).toBeCloseTo(1);
    expect(stats.averageSimilarity).toBeCloseTo(1);
  });

  it('統計の整形', () => {
    const formatted = formatStats({
      elapsedMs: 12_345,
      charactersPerSecond: 12.34,
      charactersPerMinute: 740.4,
      averageSimilarity: 0.9345,
    });
    expect(formatted).toEqual({
      elapsedSeconds: '12.35',
      charactersPerSecond: '12.3',
      charactersPerMinute: '740',
      averageSimilarity: '93.5%',
    });
  });
});

describe('自己ベストの保存', () => {
  it('空のストアから始まる', () => {
    expect(parseStore(null)).toEqual(emptyStore());
    expect(parseStore('not json')).toEqual(emptyStore());
    expect(parseStore('{"version":99}')).toEqual(emptyStore());
  });

  it('記録を保存し、より速い記録で更新する', () => {
    const storage = memoryStorage();
    const ids = ['a', 'b'];

    const first = saveIfBest(storage, {
      problemIds: ids,
      mix: 'short',
      elapsedMs: 5000,
      averageSimilarity: 0.9,
      charactersPerSecond: 4,
      achievedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(first.updatedSet).toBe(true);
    expect(first.best.bestMs).toBe(5000);
    expect(first.isNewMixBest).toBe(true);

    const slower = saveIfBest(storage, {
      problemIds: ids,
      mix: 'short',
      elapsedMs: 7000,
      averageSimilarity: 0.95,
      charactersPerSecond: 3,
    });
    expect(slower.updatedSet).toBe(false);
    expect(slower.best.bestMs).toBe(5000);
    expect(slower.isNewMixBest).toBe(false);

    const faster = saveIfBest(storage, {
      problemIds: ids,
      mix: 'short',
      elapsedMs: 4000,
      averageSimilarity: 0.88,
      charactersPerSecond: 5,
    });
    expect(faster.updatedSet).toBe(true);
    expect(faster.isNewMixBest).toBe(true);

    const store = parseStore(storage.getItem('type-rush:bests:v1'));
    expect(store.records).toHaveLength(1);
    expect(store.records[0].bestMs).toBe(4000);
  });

  it('同じ問題セットの並び順が違っても同じ記録として扱う', () => {
    expect(problemSetSignature(['a', 'b'])).toBe(problemSetSignature(['b', 'a']));
  });

  it('問題セットが違えば別の記録になる', () => {
    const storage = memoryStorage();
    saveIfBest(storage, {
      problemIds: ['a', 'b'],
      elapsedMs: 5000,
      averageSimilarity: 0.9,
      charactersPerSecond: 4,
    });
    saveIfBest(storage, {
      problemIds: ['c', 'd'],
      elapsedMs: 9000,
      averageSimilarity: 0.9,
      charactersPerSecond: 4,
    });

    const store = parseStore(storage.getItem('type-rush:bests:v1'));
    expect(store.records).toHaveLength(2);
    expect(findBest(store, problemSetSignature(['a', 'b']))?.bestMs).toBe(5000);
    expect(findBest(store, problemSetSignature(['c', 'd']))?.bestMs).toBe(9000);
  });

  it('壊れたレコードは読み込み時に捨てる', () => {
    const broken = JSON.stringify({
      version: 1,
      records: [
        { nope: true },
        {
          rulesVersion: 'mvp-1',
          signature: 'sig',
          problemIds: ['a'],
          bestMs: 1000,
          averageSimilarity: 1,
          charactersPerSecond: 1,
          achievedAt: 'now',
        },
      ],
    });
    const store: BestStore = parseStore(broken);
    expect(store.records).toHaveLength(1);
  });

  it('文字数帯ごとにベストを出す', () => {
    const storage = memoryStorage();

    // 短い問題のセットは速い、長い問題のセットは遅い
    saveIfBest(storage, {
      problemIds: ['a', 'b'],
      mix: 'short',
      elapsedMs: 4000,
      averageSimilarity: 0.9,
      charactersPerSecond: 5,
    });
    saveIfBest(storage, {
      problemIds: ['c', 'd'],
      mix: 'long',
      elapsedMs: 12000,
      averageSimilarity: 0.9,
      charactersPerSecond: 3,
    });

    const store = parseStore(storage.getItem('type-rush:bests:v1'));
    expect(bestByMix(store).short?.bestMs).toBe(4000);
    expect(bestByMix(store).long?.bestMs).toBe(12000);
    expect(bestByMix(store).medium).toBeUndefined();
  });

  it('同じ帯の中だけを比べてベストを更新する', () => {
    const storage = memoryStorage();

    const shortFirst = saveIfBest(storage, {
      problemIds: ['a', 'b'],
      mix: 'short',
      elapsedMs: 4000,
      averageSimilarity: 0.9,
      charactersPerSecond: 5,
    });
    expect(shortFirst.isNewMixBest).toBe(true);

    // 帯が違えば、速くても「短めのベスト」は更新しない
    const longFaster = saveIfBest(storage, {
      problemIds: ['c', 'd'],
      mix: 'long',
      elapsedMs: 3000,
      averageSimilarity: 0.9,
      charactersPerSecond: 8,
    });
    expect(longFaster.isNewMixBest).toBe(true);

    const store = parseStore(storage.getItem('type-rush:bests:v1'));
    expect(findBestByMix(store, 'short')?.bestMs).toBe(4000);
    expect(findBestByMix(store, 'long')?.bestMs).toBe(3000);
  });

  it('記録が上限を超えたら古いものから捨てる', () => {
    const storage = memoryStorage();

    for (let index = 0; index < MAX_RECORDS + 30; index += 1) {
      saveIfBest(storage, {
        problemIds: [`p${index}`, 'x'],
        mix: 'medium',
        elapsedMs: 5000 + index,
        averageSimilarity: 0.9,
        charactersPerSecond: 4,
      });
    }

    const store = parseStore(storage.getItem('type-rush:bests:v1'));
    // 直近200件 + 帯のベストのみ残る
    expect(store.records.length).toBeLessThanOrEqual(MAX_RECORDS + 4);
    expect(store.records.length).toBeLessThan(MAX_RECORDS + 30);

    // 直近の記録は残っている
    expect(findBest(store, problemSetSignature([`p${MAX_RECORDS + 29}`, 'x']))).toBeTruthy();
    // 中ほど（直近でも帯のベストでもない）記録は捨てられている
    expect(findBest(store, problemSetSignature(['p10', 'x']))).toBeUndefined();
  });

  it('上限を超えても各帯のベストは残る', () => {
    const storage = memoryStorage();

    saveIfBest(storage, {
      problemIds: ['keep', 'x'],
      mix: 'short',
      elapsedMs: 1000,
      averageSimilarity: 1,
      charactersPerSecond: 9,
    });

    for (let index = 0; index < MAX_RECORDS + 30; index += 1) {
      saveIfBest(storage, {
        problemIds: [`q${index}`, 'y'],
        mix: 'long',
        elapsedMs: 9000 + index,
        averageSimilarity: 0.9,
        charactersPerSecond: 2,
      });
    }

    const store = parseStore(storage.getItem('type-rush:bests:v1'));
    expect(findBestByMix(store, 'short')?.bestMs).toBe(1000);
  });

  it('保存できないストレージでも落ちない', () => {
    const failing = {
      ...memoryStorage(),
      setItem: () => {
        throw new Error('quota');
      },
      getItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;

    const result = saveIfBest(failing, {
      problemIds: ['a'],
      elapsedMs: 1000,
      averageSimilarity: 1,
      charactersPerSecond: 1,
    });
    expect(result.updatedSet).toBe(true);
    expect(result.best.bestMs).toBe(1000);
  });
});
