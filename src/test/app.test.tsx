import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

function renderApp(clock: Clock, storage: Storage) {
  return render(
    <App
      // 0.999… は Fisher–Yates で並び替えが起きないため、テストでは POOL 順に出題される
      now={() => clock.now}
      random={() => 0.999999}
      storage={storage}
      pool={POOL}
      problemsPerGame={5}
    />,
  );
}

describe('App のゲームフロー', () => {
  let clock: Clock;
  let storage: Storage;

  beforeEach(() => {
    clock = { now: 1000 };
    storage = memoryStorage();
  });

  afterEach(() => {
    storage.clear();
  });

  async function startGame() {
    const user = userEvent.setup();
    renderApp(clock, storage);
    await user.click(screen.getByRole('button', { name: /スタート/ }));
    return user;
  }

  it('スタート画面に遊び方とスタートボタンを表示する', () => {
    renderApp(clock, storage);
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
    expect(screen.getByText('遊び方')).toBeTruthy();
    expect(screen.getByRole('button', { name: /スタート/ })).toBeTruthy();
    expect(screen.getByText(/まだ記録がありません/)).toBeTruthy();
  });

  it('スタートで1問目が表示され、入力欄にフォーカスする', async () => {
    await startGame();
    expect(screen.getByTestId('prompt').textContent).toBe(POOL[0].prompt);
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

    await user.type(textarea, 'あいうえ');
    clock.now = 3000;
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('prompt').textContent).toBe(POOL[0].prompt);
    expect(screen.getByRole('status').textContent).toMatch(/一致率/);
    expect((textarea as HTMLTextAreaElement).value).toBe('あいうえ');

    await user.type(textarea, 'おかきくけこ');
    clock.now = 4000;
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('prompt').textContent).toBe(POOL[1].prompt);
  });

  it('未入力の Enter では何も起きない', async () => {
    const user = await startGame();
    const textarea = screen.getByLabelText('回答入力');
    textarea.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('prompt').textContent).toBe(POOL[0].prompt);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('IME 変換中の Enter では提出しない', async () => {
    const user = await startGame();
    const textarea = screen.getByLabelText('回答入力');

    await user.type(textarea, POOL[0].prompt);
    fireEvent.compositionStart(textarea);
    await user.keyboard('{Enter}');

    // 変換中の Enter は問題を進めない
    expect(screen.getByTestId('prompt').textContent).toBe(POOL[0].prompt);

    fireEvent.compositionEnd(textarea);
    clock.now += 100;
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('prompt').textContent).toBe(POOL[1].prompt);
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
    const textarea = screen.getByLabelText('回答入力');

    for (const [index, problem] of POOL.entries()) {
      clock.now = 1000 + (index + 1) * 2000;
      await user.clear(textarea);
      await user.type(textarea, problem.prompt);
      await user.keyboard('{Enter}');
    }

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toMatch(/5問クリア/);
    expect(screen.getByText('自己ベスト更新！')).toBeTruthy();
    expect(screen.getByText('総時間')).toBeTruthy();
    // 最初の入力 3000ms 〜 最終クリア 11000ms
    expect(screen.getByTestId('total-time').textContent).toBe('8.00秒');
    expect(screen.getByRole('table')).toBeTruthy();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(6);

    // 経過時間が止まっている（タイマー表示は結果画面にない）
    clock.now = 60_000;
    expect(screen.queryByLabelText('経過時間')).toBeNull();
  });

  it('結果画面にタイピングレベルが表示される', async () => {
    const user = await startGame();
    const textarea = screen.getByLabelText('回答入力');

    // 55文字を 400ms で → 約137文字/秒 → 最高位「神」
    for (const [index, problem] of POOL.entries()) {
      clock.now = 1000 + index * 100;
      await user.clear(textarea);
      await user.type(textarea, problem.prompt);
      await user.keyboard('{Enter}');
    }

    expect(screen.getByTestId('rank-card')).toBeTruthy();
    expect(screen.getByTestId('rank-label').textContent).toBe('神');
    expect(screen.getByTestId('rank-next').textContent).toMatch(/最高ランク「神」/);
  });

  it('遅いタイムでは低いランクになる', async () => {
    const user = await startGame();
    const textarea = screen.getByLabelText('回答入力');

    // 55文字を 48秒で → 約1.1文字/秒 → 見習い
    for (const [index, problem] of POOL.entries()) {
      clock.now = 1000 + index * 12_000;
      await user.clear(textarea);
      await user.type(textarea, problem.prompt);
      await user.keyboard('{Enter}');
    }

    expect(screen.getByTestId('rank-label').textContent).toBe('見習い');
    expect(screen.getByTestId('rank-next').textContent).toMatch(/^あと /);
  });

  it('自己ベストは保存され、再挑戦で更新されない場合は表示される', async () => {
    const user = await startGame();
    const textarea = screen.getByLabelText('回答入力');

    for (const [index, problem] of POOL.entries()) {
      clock.now = 1000 + (index + 1) * 2000;
      await user.clear(textarea);
      await user.type(textarea, problem.prompt);
      await user.keyboard('{Enter}');
    }
    expect(screen.getByText('自己ベスト更新！')).toBeTruthy();

    // 再挑戦して遅いタイムを出す
    await user.click(screen.getByRole('button', { name: /もう一度/ }));
    for (const [index, problem] of POOL.entries()) {
      clock.now = 10_000 + (index + 1) * 5000;
      await user.clear(screen.getByLabelText('回答入力'));
      await user.type(screen.getByLabelText('回答入力'), problem.prompt);
      await user.keyboard('{Enter}');
    }

    expect(screen.queryByText('自己ベスト更新！')).toBeNull();
    expect(screen.getByTestId('total-time').textContent).toBe('20.00秒');
    expect(screen.getByTestId('best-this-set').textContent).toBe('8.00秒');
  });

  it('最後の提出で Enter を連打しても結果画面から即座に再挑戦しない', async () => {
    const user = await startGame();
    for (const [index, problem] of POOL.entries()) {
      clock.now = 1000 + (index + 1) * 1000;
      await user.clear(screen.getByLabelText('回答入力'));
      await user.type(screen.getByLabelText('回答入力'), problem.prompt);
      if (index < POOL.length - 1) await user.keyboard('{Enter}');
    }

    // 最後の1問で Enter を2回押す（2回目は結果画面のボタン上で発火する想定）
    const textarea = screen.getByLabelText('回答入力');
    await user.type(textarea, '{Enter}{Enter}');

    expect(screen.getByRole('heading', { level: 2 }).textContent).toMatch(/5問クリア/);
  });

  it('リロードでゲームは初期化され、ベストは保持される', async () => {
    const user = await startGame();
    for (const [index, problem] of POOL.entries()) {
      clock.now = 1000 + (index + 1) * 1000;
      await user.clear(screen.getByLabelText('回答入力'));
      await user.type(screen.getByLabelText('回答入力'), problem.prompt);
      await user.keyboard('{Enter}');
    }
    expect(screen.getByRole('heading', { level: 2 }).textContent).toMatch(/5問クリア/);
    expect(screen.getByTestId('total-time').textContent).toBe('4.00秒');

    const first = renderApp(clock, storage);
    // 再マウント（リロード相当）ではスタート画面に戻る
    first.unmount();
    renderApp(clock, storage);

    expect(screen.getByRole('button', { name: /スタート/ })).toBeTruthy();
    expect(screen.getByTestId('start-best').textContent).toContain('4.00秒');
  });
});
