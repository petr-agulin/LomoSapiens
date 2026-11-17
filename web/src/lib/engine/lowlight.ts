// ENGINE_SPEC section 5: evening and night.
//
// Source: Wikipedia "Exposure value", Table 2, which warns that these are general guidelines.
// Where the table gives a range, this uses the darkest value. All results are labelled as estimates.
import { filmStep } from "./film.ts";
import type { LowLight } from "./types.ts";

const PUBLISHED_VALUE: Record<Exclude<LowLight, "dusk">, number> = {
  sun_low: 12,
  sun_just_set: 9,
  street_night: 7,
  home_lamps: 5,
  floodlit: 3,
};

/** The light number to aim for. Dusk has none, because the table has no value for it. */
export function lowLightTarget(lowlight: Exclude<LowLight, "dusk">, iso: number) {
  return PUBLISHED_VALUE[lowlight] + filmStep(iso);
}
