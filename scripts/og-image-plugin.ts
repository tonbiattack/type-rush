import type { Plugin } from 'vite';

/**
 * ビルド時に index.html の og:image / twitter:image を絶対 URL に置き換える。
 *
 * OGP の仕様上、クローラーは相対 URL を解決しないことが多い。
 * デプロイ先が決まっていれば環境変数 SITE_URL で指定する。
 * 未指定のときは相対 URL のままにする（ローカル確認用）。
 */
const SITE_URL = (process.env.SITE_URL ?? '').replace(/\/+$/, '');

export default function ogImagePlugin(): Plugin {
  return {
    name: 'type-rush-og-image',
    transformIndexHtml(html) {
      if (!SITE_URL) return html;
      return html
        .replace(/content="\.\/ogp\.png"/g, `content="${SITE_URL}/ogp.png"`)
        .replace(/href="\.\/icon\.svg"/g, `href="${SITE_URL}/icon.svg"`);
    },
  };
}
