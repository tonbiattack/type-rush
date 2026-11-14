import { toRomajiChunks } from '../game/romaji';

type Props = {
  /** お題（ひらがな） */
  prompt: string;
};

/**
 * お題の下に添えるローマ字ガイド。
 *
 * 打鍵の正誤や進捗は示さない。速く打つことが目的なので、
 * 「どのキーを打てばよいか」の参照だけを静かに置く。
 */
export function RomajiGuide({ prompt }: Props) {
  const chunks = toRomajiChunks(prompt);

  return (
    <p
      className="font-mono text-base leading-relaxed tracking-wide text-ink-3 sm:text-lg"
      style={{ overflowWrap: 'anywhere' }}
      aria-hidden="true"
      data-testid="romaji-guide"
    >
      {chunks.map((chunk, index) => (
        <span key={`${chunk.kana}-${index}`}>{chunk.romaji}</span>
      ))}
    </p>
  );
}
