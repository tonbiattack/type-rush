/**
 * 共有ボタンの動作確認（開発時のみ）。
 *
 * 結果画面まで進めて「スコアをコピー」を押し、クリップボードの中身を読む。
 * クリップボードの読み取り権限は CDP で与える。
 *
 *   node scripts/check-share.mjs <baseUrl>
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const baseUrl = process.argv[2] ?? 'http://localhost:4173/';

const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].filter(Boolean);
const chrome = candidates.find((path) => existsSync(path));
if (!chrome) {
  console.error('Chrome が見つかりません');
  process.exit(1);
}

const port = 9334;
const child = spawn(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--user-data-dir=' + resolve('shots', '.chrome-profile-share'),
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDevtools() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {
      // まだ起動していない
    }
    await sleep(250);
  }
  throw new Error('DevTools に接続できません');
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve: done, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else done(message.result);
      }
    });
  }

  send(method, params = {}) {
    this.id += 1;
    const id = this.id;
    return new Promise((done, reject) => {
      this.pending.set(id, { resolve: done, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function connect() {
  const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done, reject) => {
    ws.addEventListener('open', done, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  return new Cdp(ws);
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

const SET_VALUE = `
  (function (value) {
    const el = document.querySelector('#answer');
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    ).set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  })(%VALUE%)
`;

async function pressEnter(cdp) {
  for (const type of ['keyDown', 'keyUp']) {
    await cdp.send('Input.dispatchKeyEvent', {
      type,
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
    });
  }
}

async function main() {
  await waitForDevtools();
  const cdp = await connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Browser.grantPermissions', {
    origin: new URL(baseUrl).origin,
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
  });

  await cdp.send('Page.navigate', { url: baseUrl });
  await sleep(1200);
  await evaluate(cdp, `document.querySelector('button').click()`);
  await sleep(3200);

  const originalPrompts = [];
  for (let i = 0; i < 5; i += 1) {
    const prompt = await evaluate(
      cdp,
      `document.querySelector('[data-testid="prompt"]').textContent`,
    );
    originalPrompts.push(prompt);
    await evaluate(cdp, SET_VALUE.replace('%VALUE%', JSON.stringify(prompt)));
    await sleep(150);
    await pressEnter(cdp);
    await sleep(300);
  }

  await sleep(400);
  await evaluate(
    cdp,
    `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('スコアをコピー')).click()`,
  );
  await sleep(500);

  const status = await evaluate(
    cdp,
    `document.querySelector('[data-testid="share-status"]').textContent`,
  );
  const clipboard = await evaluate(cdp, `navigator.clipboard.readText()`);

  console.log('状態:', status);
  console.log('--- クリップボード ---');
  console.log(clipboard);

  // 共有された URL を開いて、同じ5問が同じ順で出るか確かめる
  const sharedUrl = clipboard.split('\n').pop();
  await cdp.send('Page.navigate', { url: sharedUrl });
  await sleep(1200);
  const notice = await evaluate(
    cdp,
    `document.querySelector('[data-testid="shared-set"]')?.textContent ?? '(案内なし)'`,
  );
  await evaluate(cdp, `document.querySelector('button').click()`);
  await sleep(3200);

  const sharedPrompts = [];
  for (let i = 0; i < 5; i += 1) {
    const prompt = await evaluate(
      cdp,
      `document.querySelector('[data-testid="prompt"]').textContent`,
    );
    sharedPrompts.push(prompt);
    await evaluate(cdp, SET_VALUE.replace('%VALUE%', JSON.stringify(prompt)));
    await sleep(150);
    await pressEnter(cdp);
    await sleep(300);
  }

  console.log('--- 共有 URL を開いた結果 ---');
  console.log('案内:', notice);
  console.log('同じ5問が同じ順で出た:', JSON.stringify(originalPrompts) === JSON.stringify(sharedPrompts));
  console.log('1問目:', sharedPrompts[0]);

  child.kill();
}

main().catch((error) => {
  console.error(error);
  child.kill();
  process.exit(1);
});
