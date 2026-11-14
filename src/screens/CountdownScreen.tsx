import { RomajiGuide } from '../components/RomajiGuide';

type Props = {
  /** 表示する数字、または「スタート」 */
  label: string;
  /** 何問目から始まるか（予告として出す） */
  problemCount: number;
  /** 最初の問題文（心の準備用に薄く見せる） */
  firstPrompt: string;
};

/**
 * 開始前のカウントダウン。
 * 数字だけを大きく出し、他の情報は控えめにして視線を奪わない。
 */
export function CountdownScreen({ label, problemCount, firstPrompt }: Props) {
  const isGo = label === 'スタート';

  return (
    <section aria-labelledby="countdown-heading" className="flex flex-1 flex-col justify-center">
      <h2 id="countdown-heading" className="sr-only">
        まもなく開始します
      </h2>

      <div className="flex flex-1 flex-col items-center justify-center py-10">
        <p
          className={`font-mono font-bold leading-none tabular-nums ${
            isGo ? 'text-4xl tracking-tight sm:text-5xl' : 'text-[7rem] sm:text-[9rem]'
          } ${isGo ? 'text-shu' : 'text-ink'}`}
          data-testid="countdown-label"
          aria-live="assertive"
        >
          {label}
        </p>
        <p className="mt-4 text-xs text-ink-3" data-testid="countdown-hint">
          {isGo ? '入力してください' : `${problemCount}問`}
        </p>
      </div>

      <div className="border-y border-rule py-5 opacity-50">
        <p
          className="text-lg leading-relaxed sm:text-xl"
          style={{ wordBreak: 'break-word' }}
        >
          {firstPrompt}
        </p>
        <div className="mt-2">
          <RomajiGuide prompt={firstPrompt} inputLength={0} />
        </div>
      </div>
    </section>
  );
}
