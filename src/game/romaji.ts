/**
 * ひらがな → ローマ字のガイド。
 *
 * 入力自体は IME 経由のひらがなだが、どのキーを打てばよいか分かるように
 * お題の下にローマ字を添える（寿司打と同じ考え方）。
 *
 * 表記は「IME に打ち込む文字列」に合わせる。
 * 例: こーど → ko-do（ー は「-」キー）、ほんやく → hon'yaku（ん の曖昧さ回避）。
 */

/** 1文字ぶんの読み。拗音は2文字まとめて1チャンクにする。 */
export type RomajiChunk = {
  /** お題の一部（1〜2文字） */
  kana: string;
  /** 対応するローマ字 */
  romaji: string;
};

const SINGLE: Record<string, string> = {  あ: 'a',
  い: 'i',
  う: 'u',
  え: 'e',
  お: 'o',
  か: 'ka',
  き: 'ki',
  く: 'ku',
  け: 'ke',
  こ: 'ko',
  が: 'ga',
  ぎ: 'gi',
  ぐ: 'gu',
  げ: 'ge',
  ご: 'go',
  さ: 'sa',
  し: 'shi',
  す: 'su',
  せ: 'se',
  そ: 'so',
  ざ: 'za',
  じ: 'ji',
  ず: 'zu',
  ぜ: 'ze',
  ぞ: 'zo',
  た: 'ta',
  ち: 'chi',
  つ: 'tsu',
  て: 'te',
  と: 'to',
  だ: 'da',
  ぢ: 'ji',
  づ: 'zu',
  で: 'de',
  ど: 'do',
  な: 'na',
  に: 'ni',
  ぬ: 'nu',
  ね: 'ne',
  の: 'no',
  は: 'ha',
  ひ: 'hi',
  ふ: 'fu',
  へ: 'he',
  ほ: 'ho',
  ば: 'ba',
  び: 'bi',
  ぶ: 'bu',
  べ: 'be',
  ぼ: 'bo',
  ぱ: 'pa',
  ぴ: 'pi',
  ぷ: 'pu',
  ぺ: 'pe',
  ぽ: 'po',
  ま: 'ma',
  み: 'mi',
  む: 'mu',
  め: 'me',
  も: 'mo',
  や: 'ya',
  ゆ: 'yu',
  よ: 'yo',
  ら: 'ra',
  り: 'ri',
  る: 'ru',
  れ: 're',
  ろ: 'ro',
  わ: 'wa',
  を: 'wo',
  ん: 'n',
  ゔ: 'vu',
  ぁ: 'xa',
  ぃ: 'xi',
  ぅ: 'xu',
  ぇ: 'xe',
  ぉ: 'xo',
  ゃ: 'xya',
  ゅ: 'xyu',
  ょ: 'xyo',
  ー: '-',
};

/** 拗音（2文字で1チャンク） */
const COMBO: Record<string, string> = {
  きゃ: 'kya',
  きゅ: 'kyu',
  きょ: 'kyo',
  しゃ: 'sha',
  しゅ: 'shu',
  しょ: 'sho',
  ちゃ: 'cha',
  ちゅ: 'chu',
  ちょ: 'cho',
  にゃ: 'nya',
  にゅ: 'nyu',
  にょ: 'nyo',
  ひゃ: 'hya',
  ひゅ: 'hyu',
  ひょ: 'hyo',
  みゃ: 'mya',
  みゅ: 'myu',
  みょ: 'myo',
  りゃ: 'rya',
  りゅ: 'ryu',
  りょ: 'ryo',
  ぎゃ: 'gya',
  ぎゅ: 'gyu',
  ぎょ: 'gyo',
  じゃ: 'ja',
  じゅ: 'ju',
  じょ: 'jo',
  びゃ: 'bya',
  びゅ: 'byu',
  びょ: 'byo',
  ぴゃ: 'pya',
  ぴゅ: 'pyu',
  ぴょ: 'pyo',
  ぢゃ: 'ja',
  ぢゅ: 'ju',
  ぢょ: 'jo',
};

/** ん の次に来ると「n」だけだと区切れない文字 */
const NEEDS_APOSTROPHE = new Set([
  'あ',
  'い',
  'う',
  'え',
  'お',
  'や',
  'ゆ',
  'よ',
  'ぁ',
  'ぃ',
  'ぅ',
  'ぇ',
  'ぉ',
]);

/**
 * お題をローマ字のチャンク列に変換する。
 * 変換できない文字は、その文字をそのまま出す（表示が消えるより良い）。
 */
export function toRomajiChunks(prompt: string): RomajiChunk[] {
  const chars = Array.from(prompt);
  const chunks: RomajiChunk[] = [];

  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];
    const next = chars[index + 1];
    const nextNext = chars[index + 2];

    // 促音（っ）: 次の音の子音を重ねる
    if (char === 'っ') {
      const nextChunk = next
        ? COMBO[`${next}${nextNext ?? ''}`] ?? SINGLE[next] ?? ''
        : '';
      const doubled = nextChunk ? nextChunk[0] : 'xtu';
      chunks.push({ kana: char, romaji: doubled });
      continue;
    }

    // 拗音（2文字で1チャンク）
    const combo = next ? COMBO[`${char}${next}`] : undefined;
    if (combo) {
      chunks.push({ kana: `${char}${next}`, romaji: combo });
      index += 1;
      continue;
    }

    // ん: 次が母音・や行なら n' にして区切る
    if (char === 'ん') {
      const romaji = next && NEEDS_APOSTROPHE.has(next) ? "n'" : 'n';
      chunks.push({ kana: char, romaji });
      continue;
    }

    const romaji = SINGLE[char] ?? char;
    chunks.push({ kana: char, romaji });
  }

  return chunks;
}

/** お題全体のローマ字（促音は次の子音に吸収されるので、chunk を連結する） */
export function toRomaji(prompt: string): string {
  return toRomajiChunks(prompt)
    .map((chunk) => chunk.romaji)
    .join('');
}

/**
 * 入力済みの文字数を、表示用のチャンク境界に丸める。
 * 途中まで打った拗音は「まだ」扱いにして、次に打つ音をはっきり見せる。
 */
export function chunkIndexFor(inputLength: number, chunks: RomajiChunk[]): number {
  let consumed = 0;
  for (let index = 0; index < chunks.length; index += 1) {
    consumed += Array.from(chunks[index].kana).length;
    if (inputLength < consumed) return index;
  }
  return chunks.length;
}

