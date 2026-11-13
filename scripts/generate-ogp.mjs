/**
 * OGP 画像（public/ogp.png, 1200x630）を書き出す。
 *
 * `node scripts/generate-ogp.mjs`
 *
 * scripts/og-template.template.html を Chrome のヘッドレスモードで撮る。
 * デザインを変えたときだけ実行すればよい（画像はリポジトリに含める）。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const template = resolve(root, 'scripts/og-template.template.html');
const output = resolve(root, 'public/ogp.png');

const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const chrome = candidates.find((path) => existsSync(path));
if (!chrome) {
  console.error('Chrome が見つかりません。CHROME_PATH で実行ファイルを指定してください。');
  process.exit(1);
}

mkdirSync(dirname(output), { recursive: true });

execFileSync(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    '--virtual-time-budget=2000',
    `--screenshot=${output}`,
    `file:///${template.replace(/\\/g, '/')}`,
  ],
  { stdio: 'inherit' },
);

console.log(`書き出しました: ${output}`);
