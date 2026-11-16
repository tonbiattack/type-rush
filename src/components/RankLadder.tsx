import { RANKS, rankFor } from '../game/rank';

type Props = {
  /** 自分のベストの速度（文字/秒）。渡すとその段に印を付ける */
  currentCps?: number;
};

/**
 * 称号と到達速度の一覧。目標を確認するための表なので、表として組む。
 * 自分のベストが分かるときは、その段を墨で塗って現在地を示す
 * （目標は遠くに置くより、あと1段という形で目の前に吊るす）。
 */
export function RankLadder({ currentCps }: Props) {
  const currentRankId =
    currentCps !== undefined && currentCps > 0 ? rankFor(currentCps).id : null;

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
        {RANKS.map((rank) => {
          const isCurrent = rank.id === currentRankId;
          return (
            <tr
              key={rank.id}
              className={`border-b border-rule align-top ${isCurrent ? 'bg-ink text-paper' : ''}`}
              data-testid={isCurrent ? 'rank-ladder-current' : undefined}
            >
              <th
                scope="row"
                className={`whitespace-nowrap py-1.5 pr-3 font-bold ${
                  isCurrent ? 'text-paper' : rank.id === RANKS[0].id ? 'text-shu' : 'text-ink'
                }`}
              >
                {rank.label}
              </th>
              <td
                className={`whitespace-nowrap py-1.5 pr-3 font-mono text-xs tabular-nums ${
                  isCurrent ? 'text-paper' : 'text-ink-2'
                }`}
              >
                {rank.minCps > 0 ? `${rank.minCps.toFixed(1)} 以上` : '—'}
              </td>
              <td
                className={`py-1.5 text-xs leading-relaxed ${
                  isCurrent ? 'text-paper' : 'text-ink-2'
                }`}
              >
                {rank.tagline}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
