/**
 * 画面確認用のスクリーンショット撮影（開発時のみ）。
 *
 * Chrome を CDP で操作し、スタート画面・プレイ画面・結果画面を撮る。
 * 依存を増やさないため、Node の組み込み WebSocket と fetch だけで書いている。
 *
 *   node scripts/shoot.mjs <baseUrl> <outDir>
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const baseUrl = process.argv[2] ?? 'http://localhost:4173/';
const outDir = resolve(process.argv[3] ?? 'shots');
mkdirSync(outDir, { recursive: true });

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

const port = 9333;
const child = spawn(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${port}`,
    '--user-data-dir=' + resolve(outDir, '.chrome-profile'),
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

async function shoot(cdp, name, width, height) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });
  await sleep(350);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(resolve(outDir, `${name}.png`), Buffer.from(data, 'base64'));
  console.log(`撮影: ${name}.png (${width}x${height})`);
}

/** React の onChange を発火させるため、ネイティブの setter 経由で値を入れる */
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

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
}

async function pressEnter(cdp) {
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
  });
}

async function main() {
  await waitForDevtools();
  const cdp = await connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  // 自己ベストがある状態を作る（称号表の現在地を確認するため）
  await cdp.send('Page.navigate', { url: baseUrl });
  await sleep(1200);
  await evaluate(
    cdp,
    `localStorage.setItem('type-rush:bests:v1', JSON.stringify({
      version: 1,
      records: [{
        rulesVersion: 'mvp-2',
        signature: 'mvp-2::p01,p02,p03,p04,p05',
        problemIds: ['p01','p02','p03','p04','p05'],
        seed: 'abc123',
        mix: 'mixed',
        bestMs: 21400,
        averageSimilarity: 0.97,
        charactersPerSecond: 2.8,
        achievedAt: new Date().toISOString(),
      }],
    }))`,
  );
  await cdp.send('Page.reload');
  await sleep(1200);

  await shoot(cdp, 'start-desktop', 1280, 1000);
  await shoot(cdp, 'start-mobile', 390, 900);

  // スタート → カウントダウン → プレイ
  await evaluate(cdp, `document.querySelector('button').click()`);
  await sleep(300);
  await shoot(cdp, 'countdown', 1280, 1000);
  await sleep(3200);

  // 1問目を正しく入力して合格させる
  const prompt = await evaluate(cdp, `document.querySelector('[data-testid="prompt"]').textContent`);
  await evaluate(cdp, SET_VALUE.replace('%VALUE%', JSON.stringify(prompt)));
  await sleep(200);
  await pressEnter(cdp);
  await sleep(400);
  await shoot(cdp, 'play-passed', 1280, 1000);
  await shoot(cdp, 'play-passed-mobile', 390, 900);

  // 2問目でわざと短く提出して、不合格の表示を撮る
  await evaluate(cdp, SET_VALUE.replace('%VALUE%', JSON.stringify('あ')));
  await sleep(150);
  await pressEnter(cdp);
  await sleep(300);
  await shoot(cdp, 'play-rejected', 1280, 1000);
  await shoot(cdp, 'play-rejected-mobile', 390, 900);

  // 残り4問を合格させて結果画面へ
  for (let i = 0; i < 4; i += 1) {
    const next = await evaluate(
      cdp,
      `document.querySelector('[data-testid="prompt"]').textContent`,
    );
    await evaluate(cdp, SET_VALUE.replace('%VALUE%', JSON.stringify(next)));
    await sleep(150);
    await pressEnter(cdp);
    await sleep(300);
  }
  await sleep(400);
  await shoot(cdp, 'result-desktop', 1280, 1100);
  await shoot(cdp, 'result-mobile', 390, 1200);

  // 「ホームに戻る」でスタート画面に戻り、ベストが残っていることを撮る
  await evaluate(
    cdp,
    `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('ホームに戻る')).click()`,
  );
  await sleep(500);
  await shoot(cdp, 'home-after-result', 1280, 1000);

  child.kill();
}

main().catch((error) => {
  console.error(error);
  child.kill();
  process.exit(1);
});
