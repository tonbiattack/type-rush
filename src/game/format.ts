export function formatDuration(ms: number): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds - minutes * 60;
    return `${minutes}分${seconds.toFixed(2)}秒`;
  }
  return `${totalSeconds.toFixed(2)}秒`;
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, ms) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 経過時間を秒（小数2桁）で表す */
export function formatMs(ms: number): string {
  return (ms / 1000).toFixed(2);
}

/** 0〜1 の一致率をパーセント表記にする */
export function formatSimilarity(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export type FormattedStats = {
  elapsedSeconds: string;
  charactersPerSecond: string;
  charactersPerMinute: string;
  averageSimilarity: string;
};

export function formatStats(input: {
  elapsedMs: number;
  charactersPerSecond: number;
  charactersPerMinute: number;
  averageSimilarity: number;
}): FormattedStats {
  return {
    elapsedSeconds: formatMs(input.elapsedMs),
    charactersPerSecond: input.charactersPerSecond.toFixed(1),
    charactersPerMinute: input.charactersPerMinute.toFixed(0),
    averageSimilarity: formatSimilarity(input.averageSimilarity),
  };
}
