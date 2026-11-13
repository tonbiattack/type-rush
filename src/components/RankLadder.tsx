import { RANKS } from '../game/rank';

/**
 * 称号と到達速度の一覧。目標を確認するための表なので、表として組む。
 */
export function RankLadder() {
  return (
    <table className="w-full border-collapse text-left text-sm" data-testid="rank-ladder">
      <caption className="sr-only">タイピングレベルの一覧と到達速度</caption>
      <thead>
        <tr className="border-b border-ink/25">
          <th scope="col" className="py-1.5 pr-3 text-xs font-normal text-ink-3">
            称号
          </th>
          <th scope="col" className="py-1.5 pr-3 text-xs font-normal text-ink-3">
            文字/秒
          </th>
          <th scope="col" className="py-1.5 text-xs font-normal text-ink-3">
            表記
          </th>
        </tr>
      </thead>
      <tbody>
        {RANKS.map((rank) => (
          <tr key={rank.id} className="border-b border-rule align-top">
            <th
              scope="row"
              className={`whitespace-nowrap py-1.5 pr-3 font-bold ${
                rank.id === RANKS[0].id ? 'text-shu' : 'text-ink'
              }`}
            >
              {rank.label}
            </th>
            <td className="whitespace-nowrap py-1.5 pr-3 font-mono text-xs tabular-nums text-ink-2">
              {rank.minCps > 0 ? `${rank.minCps.toFixed(1)} 以上` : '—'}
            </td>
            <td className="py-1.5 text-xs leading-relaxed text-ink-2">{rank.tagline}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
