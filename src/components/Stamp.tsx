type Props = {
  /** 押される文字（短く） */
  verdict: string;
  /** 判子の下に添える一行 */
  detail?: string;
  /** 合格なら朱、不合格なら墨 */
  tone?: 'pass' | 'retry';
};

/**
 * 判定の判子。この画面で唯一大きく動く要素なので、
 * 色・傾き・縁取りだけに絞って他の装飾は足さない。
 */
export function Stamp({ verdict, detail, tone = 'pass' }: Props) {
  const isPass = tone === 'pass';

  return (
    <div
      className={[
        'stamp inline-flex flex-col items-center justify-center gap-1 border-[2.5px] px-3 py-2 leading-none',
        isPass ? 'border-shu text-shu' : 'border-ink-3 text-ink-3',
      ].join(' ')}
      role="img"
      aria-label={detail ? `${verdict}、${detail}` : verdict}
    >
      <span className="text-xl font-bold tracking-[0.14em]">{verdict}</span>
      {detail ? (
        <span className="font-mono text-[10px] tracking-[0.06em] opacity-80">{detail}</span>
      ) : null}
    </div>
  );
}
