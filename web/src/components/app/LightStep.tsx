// New shot, step 1: what's the light?.
import { useState } from "react";
import type { IndoorLight, Scene, Sky } from "../../lib/engine/types.ts";
import { lowSunApplies, stormApplies, type ShotDraft, type SwitchKey } from "../../lib/shot.ts";
import type { EveningLight, LightChoice } from "../../lib/store.ts";
import { strings } from "../../lib/strings.ts";
import { Icon } from "./icons.tsx";
import { ChoiceCard, Crumb, HelpSheet, MainButton, OptionRow, Screen, ScreenTitle, SectionLabel, Sheet, SwitchRow } from "./parts.tsx";
import { EVENING_ICON, GROUP_ICON, INDOOR_ICON, PLACE_ICON, SKY_ICON, SWITCH_ICON } from "./shotIcons.ts";

const text = strings.app.shot;

export type LightGroup = "day" | "evening" | "indoors";
const SKIES: Sky[] = ["sun", "sun_haze", "sun_behind_clouds", "overcast", "storm"];
const PLACES: Scene[] = ["snow_sand", "open", "under_trees"];
const EVENINGS: EveningLight[] = ["sun_low", "sun_just_set", "dusk", "street_night", "floodlit"];
const INDOORS: IndoorLight[] = ["window", "room", "lamps", "office"];

/** What the group card shows once it holds the answer. By day, the line under the sky is the place. */
function pickedIn(group: LightGroup, light: LightChoice | null) {
  if (light?.group !== group) return undefined;
  if (light.group === "day") return { value: text.sky[light.sky].label, sub: text.place[light.place].label, icon: SKY_ICON[light.sky] };
  if (light.group === "evening") return { value: text.evening[light.lowlight].label, sub: text.evening[light.lowlight].sub, icon: EVENING_ICON[light.lowlight] };
  return { value: text.indoors[light.indoor].label, sub: text.indoors[light.indoor].sub, icon: INDOOR_ICON[light.indoor] };
}

/** One group's sheet. By day it has two pages: the sky, then where you are; only both together are an answer. */
function GroupSheet({ group, light, onPick, onClose, startSky }: { group: LightGroup; light: LightChoice | null; onPick: (light: LightChoice) => void; onClose: () => void; startSky?: Sky }) {
  const [sky, setSky] = useState<Sky | null>(startSky ?? null);
  const torn = <p className="m-0 px-2 pt-0.5 text-[13px] leading-[1.4] text-muted">{text.torn}</p>;

  if (group === "day" && sky) {
    const hadDay = light?.group === "day" ? light : null;
    return (
      <Sheet
        title={text.whereTitle}
        description={text.whereLine}
        closeLabel={strings.app.setup.close}
        onClose={onClose}
        above={
          <button
            type="button"
            aria-label={text.backToSky(text.sky[sky].label)}
            onClick={() => setSky(null)}
            className="mx-1 mt-0.5 flex min-h-11 cursor-pointer items-center gap-1.5 self-start rounded-[22px] bg-chip pr-3.5 pl-2 text-sm font-medium"
          >
            <Icon name="back" size={16} />
            {text.sky[sky].label}
          </button>
        }
      >
        <div role="radiogroup" aria-labelledby="sheet-title" className="flex flex-col gap-1">
          {PLACES.map((place) => (
            <OptionRow
              key={place}
              icon={PLACE_ICON[place]}
              label={text.place[place].label}
              sub={text.place[place].sub}
              on={hadDay?.sky === sky && hadDay.place === place}
              onPick={() => onPick({ group: "day", sky, place })}
            />
          ))}
        </div>
        {torn}
      </Sheet>
    );
  }

  const options =
    group === "day"
      ? SKIES.map((value) => ({ key: value, icon: SKY_ICON[value], ...text.sky[value], on: light?.group === "day" && light.sky === value, pick: () => setSky(value) }))
      : group === "evening"
        ? EVENINGS.map((value) => ({ key: value, icon: EVENING_ICON[value], ...text.evening[value], on: light?.group === "evening" && light.lowlight === value, pick: () => onPick({ group: "evening", lowlight: value }) }))
        : INDOORS.map((value) => ({ key: value, icon: INDOOR_ICON[value], ...text.indoors[value], on: light?.group === "indoors" && light.indoor === value, pick: () => onPick({ group: "indoors", indoor: value }) }));

  return (
    <Sheet
      title={text.groups[group].title}
      description={text.groups[group].sub}
      closeLabel={strings.app.setup.close}
      onClose={onClose}
      below={
        group === "day" && (
          <span className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium">
            <Icon name="arrow" size={14} />
            {text.thenWhere}
          </span>
        )
      }
    >
      <div role="radiogroup" aria-labelledby="sheet-title" className="flex flex-col gap-1">
        {options.map((option) => (
          <OptionRow key={option.key} icon={option.icon} label={option.label} sub={option.sub} on={option.on} onPick={option.pick} />
        ))}
      </div>
      {torn}
    </Sheet>
  );
}

export function LightStep({
  draft,
  onPick,
  onToggle,
  onBack,
  onNext,
  openAt,
}: {
  draft: ShotDraft;
  onPick: (light: LightChoice) => void;
  onToggle: (key: SwitchKey) => void;
  onBack: () => void;
  onNext: () => void;
  /** For the tests: a sheet open at once, and by day its second page. */
  openAt?: { group: LightGroup; sky?: Sky } | { help: SwitchKey };
}) {
  const [sheet, setSheet] = useState<LightGroup | null>(openAt && "group" in openAt ? openAt.group : null);
  const [help, setHelp] = useState<SwitchKey | null>(openAt && "help" in openAt ? openAt.help : null);
  const switches = (["lowSun", "stormOutside"] as const).filter((key) => (key === "lowSun" ? lowSunApplies(draft.light) : stormApplies(draft.light)));

  return (
    <Screen
      top={<Crumb backLabel={text.backToHome} onBack={onBack}>{text.stepLight}</Crumb>}
      action={
        <MainButton onClick={onNext} disabled={!draft.light}>
          {text.next}
        </MainButton>
      }
    >
      <ScreenTitle title={text.lightTitle} line={text.lightLine} />
      {(["day", "evening", "indoors"] as const).map((group) => {
        const picked = pickedIn(group, draft.light);
        return (
          <ChoiceCard
            key={group}
            icon={picked?.icon ?? GROUP_ICON[group]}
            title={text.groups[group].title}
            sub={text.groups[group].sub}
            picked={picked}
            pickedLabel={text.picked}
            onClick={() => setSheet(group)}
          />
        );
      })}
      {switches.length > 0 && <SectionLabel>{text.ifItApplies}</SectionLabel>}
      {switches.map((key) => (
        <SwitchRow
          key={key}
          label={text.switches[key].label}
          sub={text.switches[key].sub}
          on={draft[key]}
          fromLast={draft[key] && draft.fromLast[key]}
          fromLastText={text.fromLastShot}
          helpLabel={text.whatCounts(text.switches[key].label)}
          onFlip={() => onToggle(key)}
          onHelp={() => setHelp(key)}
        />
      ))}
      <span className="flex-[1_0_8px]" />

      {sheet && (
        <GroupSheet
          group={sheet}
          light={draft.light}
          startSky={openAt && "group" in openAt ? openAt.sky : undefined}
          onPick={(light) => {
            onPick(light);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {help && (
        <HelpSheet
          icon={SWITCH_ICON[help]}
          title={text.switches[help].label}
          text={text.switches[help].helper}
          doneLabel={text.helpDone}
          closeLabel={strings.app.setup.close}
          onClose={() => setHelp(null)}
        />
      )}
    </Screen>
  );
}
