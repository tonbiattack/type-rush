import { describe, expect, it } from 'vitest';
import {
  SHARE_MIX_PARAM,
  SHARE_SEED_PARAM,
  buildShareText,
  buildShareUrl,
  readSharedSet,
} from '../game/share';

describe('共有されたセットを URL から読む', () => {
  it('シードと文字数帯を読む', () => {
    const shared = readSharedSet('?seed=abc123&mix=short');
    expect(shared.seed).toBe('abc123');
    expect(shared.mix).toBe('short');
  });

  it('先頭の ? が無くても読む', () => {
    expect(readSharedSet('seed=abc123&mix=long').seed).toBe('abc123');
  });

  it('大文字のシードは小文字にそろえる', () => {
    expect(readSharedSet('?seed=ABC123').seed).toBe('abc123');
  });

  it('壊れたシードは無視する', () => {
    expect(readSharedSet('?seed=***').seed).toBeNull();
    expect(readSharedSet('?seed=').seed).toBeNull();
    expect(readSharedSet('?seed=あいう').seed).toBeNull();
  });

  it('知らない文字数帯は無視する', () => {
    expect(readSharedSet('?mix=unknown').mix).toBeNull();
    expect(readSharedSet('?mix=SHORT').mix).toBeNull();
  });

  it('何も無ければ null', () => {
    expect(readSharedSet('')).toEqual({ seed: null, mix: null });
    expect(readSharedSet('?foo=bar')).toEqual({ seed: null, mix: null });
  });
});

describe('共有用の URL', () => {
  it('シードと文字数帯を載せる', () => {
    const url = buildShareUrl('https://example.com/type-rush/', {
      seed: 'abc123',
      mix: 'short',
    });
    expect(url).toBe('https://example.com/type-rush/?seed=abc123&mix=short');
  });

  it('シードが無ければ文字数帯だけ載せる', () => {
    const url = buildShareUrl('https://example.com/', { seed: null, mix: 'mixed' });
    expect(url).toBe('https://example.com/?mix=mixed');
  });

  it('元のクエリとハッシュは捨てる', () => {
    const url = buildShareUrl('https://example.com/?utm=1#top', { seed: 'abc123', mix: 'long' });
    expect(url).toBe('https://example.com/?seed=abc123&mix=long');
  });

  it('作った URL から同じセットを読み戻せる', () => {
    const url = buildShareUrl('https://example.com/', { seed: 'abc123', mix: 'medium' });
    const shared = readSharedSet(new URL(url).search);
    expect(shared).toEqual({ seed: 'abc123', mix: 'medium' });
  });

  it('パラメーター名は定数と一致する', () => {
    const url = buildShareUrl('https://example.com/', { seed: 'abc123', mix: 'short' });
    expect(url).toContain(`${SHARE_SEED_PARAM}=abc123`);
    expect(url).toContain(`${SHARE_MIX_PARAM}=short`);
  });
});

describe('共有する文字列', () => {
  it('タイム・速度・称号・URL を並べる', () => {
    const text = buildShareText({
      elapsedMs: 21_400,
      charactersPerSecond: 2.8,
      rankLabel: '打鍵の達人',
      mixLabel: '混ぜる',
      problemCount: 5,
      url: 'https://example.com/?seed=abc123&mix=mixed',
    });

    expect(text).toBe(
      [
        'Type Rush 21.40秒（5問・混ぜる）',
        '2.8文字/秒、打鍵の達人',
        'https://example.com/?seed=abc123&mix=mixed',
      ].join('\n'),
    );
  });

  it('煽る言葉を入れない', () => {
    const text = buildShareText({
      elapsedMs: 1000,
      charactersPerSecond: 1,
      rankLabel: 'AI入門者',
      mixLabel: '短め',
      problemCount: 5,
      url: 'https://example.com/',
    });

    for (const word of ['最速', '圧倒的', '革命的', '光速', '人類']) {
      expect(text).not.toContain(word);
    }
  });
});
