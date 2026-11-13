import { RANKS, TOP_RANK } from '../game/rank';

export function RankLadder() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        タイピングレベル（目安）
      </h3>
      <ul className="mt-2 flex flex-wrap gap-1.5" data-testid="rank-ladder">
        {RANKS.map((rank) => (
          <li
            key={rank.id}
            className={`inline-flex items-baseline gap-1 rounded-lg border px-2 py-1 text-xs ${rank.badgeClass}`}
          >
            <span className="text-sm font-bold">{rank.label}</span>
            <span className="tabular-nums opacity-80">
              {rank.minCps > 0 ? `${rank.minCps}+` : '〜'}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        文字/秒の目安です。{TOP_RANK.minCps}文字/秒以上で最高位「{TOP_RANK.label}」。誤字は減点しません。
      </p>
    </div>
  );
}
