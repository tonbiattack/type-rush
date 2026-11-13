import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const assets = readdirSync('dist/assets');
const js = readFileSync(join('dist/assets', assets.find((f) => f.endsWith('.js'))), 'utf8');

const testFixtures = ['あいうえおかきくけこ', 'さしすせそたちつてと', 'なにぬねのはひふへほ'];
const testRunners = ['vitest', 'beforeEach', 'expect(', 'describe('];

console.log('--- test fixtures in bundle ---');
for (const value of testFixtures) {
  console.log(js.includes(value) ? `LEAKED: ${value}` : 'clean');
}

console.log('--- test runners in bundle ---');
for (const value of testRunners) {
  console.log(js.includes(value) ? `LEAKED: ${value}` : 'clean');
}

console.log('--- production problem prompts present (expected) ---');
console.log(js.includes('このぶんをよんでかんたんにまとめてください') ? 'ok: 問題文あり' : 'missing');
