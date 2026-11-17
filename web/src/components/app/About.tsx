// About the app: the problem the app answers, what it is, how it
// works, what it keeps and where, and that it is an independent project, not professional software. The last place
// in the menu. Home's figures sit small at the top, toned by the theme like Home's, then the title.
import { strings } from "../../lib/strings.ts";
import { Crumb, Screen } from "./parts.tsx";

const text = strings.app.about;

export function AboutScreen({ onBack }: { onBack: () => void }) {
  return (
    <Screen top={<Crumb backLabel={strings.app.back} onBack={onBack}>{strings.app.back}</Crumb>}>
      <img src="./images/hero-march.png" alt="" className="mt-1 block h-[76px] w-full object-contain [filter:var(--hero-filter)]" />
      <h1 className="m-0 pb-1 text-center font-display text-[26px] leading-[1.15] font-semibold tracking-[-0.02em]">{text.title}</h1>
      {text.paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 24)} className="m-0 px-1 text-base leading-[1.55]">
          {paragraph}
        </p>
      ))}
      <span className="flex-[1_0_8px]" />
    </Screen>
  );
}
