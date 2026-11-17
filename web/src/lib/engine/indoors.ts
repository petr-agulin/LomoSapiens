// ENGINE_SPEC section 5a: indoors by day. Kodak's daylight table doesn't cover it.
//
// Sources, all labelled as estimates in the app:
// - lamps and office: Wikipedia "Exposure value", Table 2, using the darkest value of the range.
// - window and room: ESTIMATES. A well-lit room gets 2-5% of the light outdoors under an overcast
//   sky (the daylight factor, BS 8206-2 as credited by greenbuilding.ft.ugm.ac.id). Heavy overcast
//   is 12 in the same table. 5% is 4.3 steps less, giving 7.7, and 2% is 5.6 steps less, giving 6.4.
//   Both are rounded down, which gives more light.
import { filmStep } from "./film.ts";
import type { Conditions, IndoorLight, StepKind } from "./types.ts";

const INDOOR_VALUE: Record<IndoorLight, number> = { window: 7, room: 6, lamps: 5, office: 7 };

/** A window or room depends on the daylight outside. Lamps and ceiling lights don't. */
export const followsDaylight = (indoor: IndoorLight) => indoor === "window" || indoor === "room";

export const indoorTarget = (indoor: IndoorLight, iso: number) => INDOOR_VALUE[indoor] + filmStep(iso);

/** ESTIMATES. Sun to overcast give the same light indoors: open shade in clear sun and heavy overcast are both 12. */
export function indoorAdjustments({ light, lowSun }: Conditions): Array<{ kind: StepKind; stops: number }> {
  if (light.kind !== "indoors" || !followsDaylight(light.indoor)) return [];
  return [
    ...(light.sky === "storm" ? [{ kind: "dark_sky" as const, stops: 1 }] : []),
    ...(lowSun ? [{ kind: "low_sun" as const, stops: 1 }] : []),
  ];
}
