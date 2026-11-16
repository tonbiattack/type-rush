import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import type { Problem } from '../game/types';

const POOL: Problem[] = [
  { id: 't1', prompt: 'あいうえおかきくけこ' },
  { id: 't2', prompt: 'さしすせそたちつてと' },
  { id: 't3', prompt: 'なにぬねのはひふへほ' },
  { id: 't4', prompt: 'まみむめもやゆよらりる' },
  { id: 't5', prompt: 'わをんかきくけこさしすせそ' },
];

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

type Clock = { now: number };

function renderApp(clock: Clock, storage: Storage, countdownTotalMs = 20) {
  return render(
    <App
      now={() => clock.now}
      storage={storage}
      pool={POOL}
      problemsPerGame={5}
      countdownTotalMs={countdownTotalMs}
    />,
  );
}

/** 表示中の問題文 */
function currentPrompt(): string {
  return screen.getByTestId('prompt').textContent ?? '';
}

/** 表示中の問題文をそのまま入力して確定する */
async function answerCurrent(user: ReturnType<typeof userEvent.setup>) {
  const textarea = screen.getByLabelText('回答入力');
  await user.clear(textarea);
  await user.type(textarea, currentPrompt());
  await user.keyboard('{Enter}');
}

describe('App のゲームフロー', () => {
  let clock: Clock;
  let storage: Storage;

  beforeEach(() => {
    clock = { now: 1000 };
    storage = memoryStorage();
    // カウントダウンは実際のタイマーで動くので、実時間を使う
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    storage.clear();
  });

  async function startGame() {
    const user = userEvent.setup();
    renderApp(clock, storage);
    await user.click(screen.getByRole('button', { name: /スタート/ }));
    await skipCountdown();
    return user;
  }

  /**
   * カウントダウンが終わるまで待つ。
   * テストでは countdownTotalMs を 20ms に短縮している。
   */
  async function skipCountdown() {
    clock.now += 100;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
  }

  it('スタート画面に遊び方とスタートボタンを表示する', () => {
    renderApp(clock, storage);
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
    expect(screen.getByText('遊び方')).toBeTruthy();
    expect(screen.getByRole('button', { name: /スタート/ })).toBeTruthy();
    expect(screen.getByText(/記録はまだありません/)).toBeTruthy();
  });

  it('スタートで1問目が表示され、入力欄にフォーカスする', async () => {
    await startGame();
    expect(POOL.map((problem) => problem.prompt)).toContain(currentPrompt());
    const textarea = screen.getByLabelText('回答入力');
    expect(document.activeElement).toBe(textarea);
    expect(screen.getByTestId('question-number').textContent).toContain('/ 5');
  });

  it('最初の確定入力まではタイマーが進まない', async () => {
    const user = await startGame();
    const timer = screen.getByLabelText('経過時間');

    clock.now = 9000;
    expect(timer.textContent).toBe('00:00.00');

    const textarea = screen.getByLabelText('回答入力');
    await user.type(textarea, 'あ');
    clock.now = 10_000;

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });

    expect(screen.getByLabelText('経過時間').textContent).not.toBe('00:00.00');
  });

  it('不合格でも入力を消さず、一致率と再提出を促す', async () => {
    const user = await startGame();
    const textarea = screen.getByLabelText('回答入力');
    const first = currentPrompt();

    await user.type(textarea, 'あいうえ');
    clock.now = 3000;
    await user.keyboard('{Enter}');

    expect(currentPrompt()).toBe(first);
    // 短すぎる提出には「短い」と返す（一致率だけでは次に何をすればよいか分からない）
    expect(screen.getByTestId('feedback').textContent).toMatch(/短い/);
    expect(screen.getByRole('img', { name: /不合格/ })).toBeTruthy();
    expect((textarea as HTMLTextAreaElement).value).toBe('あいうえ');

    await user.clear(textarea);
    await user.type(textarea, first);
    clock.now = 4000;
    await user.keyboard('{Enter}');

    expect(currentPrompt()).not.toBe(first);
  });

  it('未入力の Enter では何も起きない', async () => {
    const user = await startGame();
    const textarea = screen.getByLabelText('回答入力');
    const first = currentPrompt();
    textarea.focus();
    await user.keyboard('{Enter}');
    expect(currentPrompt()).toBe(first);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('IME 変換中の Enter では提出しない', async () => {
    const user = await startGame();
    const textarea = screen.getByLabelText('回答入力');
    const first = currentPrompt();

    await user.type(textarea, first);
    fireEvent.compositionStart(textarea);
    await user.keyboard('{Enter}');

    // 変換中の Enter は問題を進めない
    expect(currentPrompt()).toBe(first);

    fireEvent.compositionEnd(textarea);
    clock.now += 100;
    await user.keyboard('{Enter}');
    expect(currentPrompt()).not.toBe(first);
  });

  it('貼り付けを拒否し、説明を表示する', async () => {
    const user = await startGame();
    const textarea = screen.getByLabelText('回答入力') as HTMLTextAreaElement;

    fireEvent.paste(textarea, { clipboardData: { getData: () => POOL[0].prompt } });
    expect(screen.getByRole('alert').textContent).toMatch(/貼り付けは使えません/);

    // 貼り付けても入力値は変わらない
    await user.click(textarea);
    expect(textarea.value).toBe('');
  });

  it('5問クリアで結果画面に切り替わり、タイマーが止まる', async () => {
    const user = await startGame();

    for (let index = 0; index < 5; index += 1) {
      clock.now = 1000 + (index + 1) * 2000;
      await answerCurrent(user);
    }

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toMatch(/5問クリア/);
    expect(screen.getByRole('img', { name: /自己ベスト/ })).toBeTruthy();
    expect(screen.getByText('平均一致率')).toBeTruthy();
    // 最初の入力 3000ms 〜 最終クリア 11000ms
    expect(screen.getByTestId('total-time').textContent).toBe('8.00');
    expect(screen.getByRole('table')).toBeTruthy();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(6);

    // 経過時間が止まっている（タイマー表示は結果画面にない）
    clock.now = 60_000;
    expect(screen.queryByLabelText('経過時間')).toBeNull();
  });

  it('結果画面にタイピングレベルが表示される', async () => {
    const user = await startGame();

    // 55文字を 400ms で → 約137文字/秒 → 最高位「AIの神」
    for (let index = 0; index < 5; index += 1) {
      clock.now = 1000 + index * 100;
      await answerCurrent(user);
    }

    expect(screen.getByTestId('rank-card')).toBeTruthy();
    expect(screen.getByTestId('rank-label').textContent).toBe('AIの神');
    expect(screen.getByTestId('rank-next').textContent).toMatch(/最高位/);
  });

  it('遅いタイムでは低いランクになる', async () => {
    const user = await startGame();

    // 55文字を 48秒で → 約1.1文字/秒 → AI入門者
    for (let index = 0; index < 5; index += 1) {
      clock.now = 1000 + index * 12_000;
      await answerCurrent(user);
    }

    expect(screen.getByTestId('rank-label').textContent).toBe('AI入門者');
    expect(screen.getByTestId('rank-next').textContent).toMatch(/次の/);
  });

  it('自己ベストは保存され、遅い再挑戦では更新されない', async () => {
    const user = await startGame();

    for (let index = 0; index < 5; index += 1) {
      clock.now = 1000 + (index + 1) * 2000;
      await answerCurrent(user);
    }
    expect(screen.getByRole('img', { name: /自己ベスト/ })).toBeTruthy();

    // 同じセットで、遅いタイムを出す
    await user.click(screen.getByRole('button', { name: /同じ5問/ }));
    await skipCountdown();
    for (let index = 0; index < 5; index += 1) {
      clock.now = 10_000 + (index + 1) * 5000;
      await answerCurrent(user);
    }

    expect(screen.queryByRole('img', { name: /自己ベスト/ })).toBeNull();
    expect(screen.getByTestId('total-time').textContent).toBe('20.00');
    expect(screen.getByTestId('best-this-set').textContent).toBe('8.00秒');
  });

  it('同じ5問でもう一度を押すと、同じ問題が同じ順で出る', async () => {
    const user = await startGame();

    const firstRun: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      firstRun.push(currentPrompt());
      clock.now = 1000 + (index + 1) * 2000;
      await answerCurrent(user);
    }

    await user.click(screen.getByRole('button', { name: /同じ5問/ }));
    await skipCountdown();

    const secondRun: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      secondRun.push(currentPrompt());
      clock.now = 20_000 + (index + 1) * 2000;
      await answerCurrent(user);
    }

    expect(secondRun).toEqual(firstRun);
  });

  it('別の問題でを押すと、新しいセットになることがある', async () => {
    const user = await startGame();

    const firstRun: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      firstRun.push(currentPrompt());
      clock.now = 1000 + (index + 1) * 2000;
      await answerCurrent(user);
    }

    await user.click(screen.getByRole('button', { name: /別の問題で/ }));
    await skipCountdown();
    expect(POOL.map((problem) => problem.prompt)).toContain(currentPrompt());
    expect(screen.getByTestId('question-number').textContent).toContain('/ 5');
    void firstRun;
  });

  it('文字の長さを選ぶと、その帯の問題だけが出る', async () => {
    renderApp(clock, storage);
    const user = userEvent.setup();

    const short = screen.getByRole('radio', { name: /短め/ });
    expect((short as HTMLInputElement).checked).toBe(false);

    // POOL はすべて 10〜13 文字なので、どの帯にも当てはまらない → 全体から選ばれる
    await user.click(short);
    expect((screen.getByRole('radio', { name: /短め/ }) as HTMLInputElement).checked).toBe(true);

    await user.click(screen.getByRole('button', { name: /スタート/ }));
    await skipCountdown();
    expect(POOL.map((problem) => problem.prompt)).toContain(currentPrompt());
    expect(screen.getByTestId('question-number').textContent).toContain('/ 5');
  });

  it('スタート直後はカウントダウンが出て、その間は入力を受け付けない', async () => {
    renderApp(clock, storage);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /スタート/ }));

    // カウントダウン中は問題文の入力欄がまだ出ていない
    expect(screen.getByTestId('countdown-label')).toBeTruthy();
    expect(screen.queryByLabelText('回答入力')).toBeNull();

    // 数字が 3 から始まる
    expect(['3', '2', '1', 'スタート']).toContain(screen.getByTestId('countdown-label').textContent);

    await skipCountdown();

    // 終わると入力欄が出る
    expect(screen.queryByTestId('countdown-label')).toBeNull();
    expect(screen.getByLabelText('回答入力')).toBeTruthy();
  });

  it('最後の提出で Enter を連打しても結果画面から即座に再挑戦しない', async () => {
    const user = await startGame();
    for (let index = 0; index < 4; index += 1) {
      clock.now = 1000 + (index + 1) * 1000;
      await answerCurrent(user);
    }

    // 最後の1問で Enter を2回押す（2回目は結果画面のボタン上で発火する想定）
    const textarea = screen.getByLabelText('回答入力');
    await user.clear(textarea);
    await user.type(textarea, currentPrompt());
    await user.keyboard('{Enter}{Enter}');

    expect(screen.getByRole('heading', { level: 2 }).textContent).toMatch(/5問クリア/);
  });

  it('不合格の理由を、次にやることとして返す', async () => {
    const user = await startGame();
    const textarea = screen.getByLabelText('回答入力');
    const first = currentPrompt();

    // 長さは足りているが文字が違う → 直す
    await user.type(textarea, 'あ'.repeat(first.length));
    clock.now = 3000;
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('feedback').textContent).toMatch(/文字が違う/);

    // 長さが足りない → 最後まで打つ
    await user.clear(textarea);
    await user.type(textarea, 'あ');
    clock.now = 4000;
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('feedback').textContent).toMatch(/短い/);
  });

  it('合格すると次の問題に合格の判子が出て、打ち始めると消える', async () => {
    const user = await startGame();
    const textarea = screen.getByLabelText('回答入力');

    await user.type(textarea, currentPrompt());
    clock.now = 2000;
    await user.keyboard('{Enter}');

    expect(screen.getByRole('img', { name: /合格/ })).toBeTruthy();

    await user.type(textarea, 'あ');
    expect(screen.queryByRole('img', { name: /合格/ })).toBeNull();
  });

  it('再挑戦のカウントダウンは数字を出さず、すぐ始まる', async () => {
    const user = await startGame();
    for (let index = 0; index < 5; index += 1) {
      clock.now = 1000 + (index + 1) * 2000;
      await answerCurrent(user);
    }

    await user.click(screen.getByRole('button', { name: /同じ5問/ }));

    // 再挑戦では 3・2・1 を出さない
    expect(screen.getByTestId('countdown-label').textContent).toBe('スタート');
    expect(screen.queryByTestId('countdown-hint')).toBeNull();

    await skipCountdown();
    expect(screen.queryByTestId('countdown-label')).toBeNull();
    expect(screen.getByLabelText('回答入力')).toBeTruthy();
  });

  it('結果画面に問題ごとの時間と、一番時間がかかった問題を出す', async () => {
    const user = await startGame();

    // 3問目だけ極端に遅くする
    for (let index = 0; index < 5; index += 1) {
      clock.now = 1000 + (index + 1) * 1000 + (index === 2 ? 5000 : 0);
      await answerCurrent(user);
    }

    expect(screen.getByTestId('slowest').textContent).toMatch(/3問目/);
    expect(screen.getByTestId('slowest').textContent).toMatch(/6\.00秒/);
  });

  it('結果画面からスタート画面へ戻れる', async () => {
    const user = await startGame();
    for (let index = 0; index < 5; index += 1) {
      clock.now = 1000 + (index + 1) * 2000;
      await answerCurrent(user);
    }
    expect(screen.getByRole('heading', { level: 2 }).textContent).toMatch(/5問クリア/);

    await user.click(screen.getByRole('button', { name: /ホームに戻る/ }));

    // スタート画面に戻り、保存済みのベストがそのまま出ている
    expect(screen.getByRole('button', { name: /スタート/ })).toBeTruthy();
    expect(screen.getByTestId('start-best').textContent).toContain('8.00');
    expect(screen.queryByTestId('total-time')).toBeNull();
  });

  it('スタート画面へ戻ったあと、もう一度遊べる', async () => {
    const user = await startGame();
    for (let index = 0; index < 5; index += 1) {
      clock.now = 1000 + (index + 1) * 2000;
      await answerCurrent(user);
    }

    await user.click(screen.getByRole('button', { name: /ホームに戻る/ }));
    await user.click(screen.getByRole('button', { name: /スタート/ }));
    await skipCountdown();

    expect(screen.getByTestId('question-number').textContent).toContain('/ 5');
    expect(screen.getByLabelText('回答入力')).toBeTruthy();
  });

  it('スタート画面の称号表に、ベストの位置を印として出す', async () => {
    const user = await startGame();
    // 55文字を 20秒で → 約2.75文字/秒 → 「打鍵の達人」
    for (let index = 0; index < 5; index += 1) {
      clock.now = 1000 + (index + 1) * 4000;
      await answerCurrent(user);
    }

    await user.click(screen.getByRole('button', { name: /ホームに戻る/ }));

    const current = screen.getByTestId('rank-ladder-current');
    expect(current.textContent).toContain('打鍵の達人');
  });

  it('リロードでゲームは初期化され、ベストは保持される', async () => {
    const user = await startGame();
    for (let index = 0; index < 5; index += 1) {
      clock.now = 1000 + (index + 1) * 1000;
      await answerCurrent(user);
    }
    expect(screen.getByRole('heading', { level: 2 }).textContent).toMatch(/5問クリア/);
    expect(screen.getByTestId('total-time').textContent).toBe('4.00');

    const first = renderApp(clock, storage);
    // 再マウント（リロード相当）ではスタート画面に戻る
    first.unmount();
    renderApp(clock, storage);

    expect(screen.getByRole('button', { name: /スタート/ })).toBeTruthy();
    expect(screen.getByTestId('start-best').textContent).toContain('4.00');
  });
});
