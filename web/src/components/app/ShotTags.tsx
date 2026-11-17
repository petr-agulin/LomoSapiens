// "Your shot": a tag for every answer of the shot, each switch that was on included.
// On the result and on Home's Last shot card.
import { lowSunApplies, stormApplies, sunBehindApplies } from "../../lib/shot.ts";
import type { ShotAnswers } from "../../lib/store.ts";
import { strings } from "../../lib/strings.ts";
import { PathIcon } from "./icons.tsx";
import { GOAL_ICON, PLACE_ICON, SUBJECT_ICON, SWITCH_ICON, lightIcon } from "./shotIcons.ts";

const text = strings.app.shot;

export interface Tag {
  icon: string;
  label: string;
}

/** The answers in the order they were asked. A switch its light or subject hid is left out, as it never reached the engine. */
export function shotTags(answers: ShotAnswers): Tag[] {
  const { light, subject, goal } = answers;
  const tags: Tag[] = [];
  if (light.group === "day") {
    tags.push({ icon: lightIcon(light), label: text.sky[light.sky].label }, { icon: PLACE_ICON[light.place], label: text.place[light.place].label });
  } else if (light.group === "evening") {
    tags.push({ icon: lightIcon(light), label: text.evening[light.lowlight].label });
  } else {
    tags.push({ icon: lightIcon(light), label: text.indoors[light.indoor].label });
  }
  if (answers.lowSun && lowSunApplies(light)) tags.push({ icon: SWITCH_ICON.lowSun, label: text.switches.lowSun.label });
  if (answers.stormOutside && stormApplies(light)) tags.push({ icon: SWITCH_ICON.stormOutside, label: text.switches.stormOutside.label });
  tags.push({ icon: SUBJECT_ICON[subject], label: text.subjects[subject].label }, { icon: GOAL_ICON[goal], label: text.goals[goal].label });
  if (answers.sunBehind && sunBehindApplies(light, subject)) tags.push({ icon: SWITCH_ICON.sunBehind, label: text.switches.sunBehind.label });
  return tags;
}

export function Tags({ tags }: { tags: Tag[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
      {tags.map((tag) => (
        <li key={tag.label} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-chip pr-[11px] pl-[9px] text-sm font-medium whitespace-nowrap">
          <PathIcon d={tag.icon} size={16} className="flex-none" />
          {tag.label}
        </li>
      ))}
    </ul>
  );
}
