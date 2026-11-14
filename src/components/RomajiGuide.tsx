import { chunkIndexFor, toRomajiChunks } from '../game/romaji';

type Props = {
  /** お題（ひらがな） */
  prompt: string;
  /** いま入力されている文字数（チャンクの色分けに使う） */
  inputLength: number;
};

/**
 * お題の下に添えるローマ字ガイド。
 *
 * 打ち終えた部分は薄く、次に打つ音を濃く、まだ先は中くらいの濃度にして
 * 「いまどこを打つか」が一目で分かるようにする。
 * 拗音（しゃ など）は2文字をひとまとまりで扱う。
 */
export function RomajiGuide({ prompt, inputLength }: Props) {
  const chunks = toRomajiChunks(prompt);
  const current = chunkIndexFor(inputLength, chunks);

  return (
    <p
      className="font-mono text-base leading-relaxed tracking-wide sm:text-lg"
      style={{ overflowWrap: 'anywhere' }}
      aria-hidden="true"
      data-testid="romaji-guide"
    >
      {chunks.map((chunk, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <span
            key={`${chunk.kana}-${index}`}
            className={
              done
                ? 'text-rule'
                : active
                  ? 'bg-shu/12 font-bold text-shu'
                  : 'text-ink-3'
            }
          >
            {chunk.romaji}
          </span>
        );
      })}
    </p>
  );
}
