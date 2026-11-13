import { RANKS } from '../game/rank';

/**
 * ランク一覧は「目標の一覧表」なので、表として組む。
 * 一番下が入門で、上に行くほど速い。
 */
export function RankLadder() {
  return (
    <table className="w-full border-collapse text-left text-sm" data-testid="rank-ladder">
      <caption className="sr-only">タイピングレベルの一覧と目安の速度</caption>
      <thead>
        <tr className="border-b border-ink/25">
          <th scope="col" className="py-1.5 pr-3 text-xs font-normal text-ink-3">
            称号
          </th>
          <th scope="col" className="py-1.5 pr-3 text-xs font-normal text-ink-3">
            目安
          </th>
          <th scope="col" className="py-1.5 text-xs font-normal text-ink-3">
            どんな人
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
              {rank.minCps > 0 ? `${rank.minCps.toFixed(1)}+` : '—'}
            </td>
            <td className="py-1.5 text-xs leading-relaxed text-ink-2">{rank.tagline}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
