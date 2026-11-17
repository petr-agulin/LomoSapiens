// ENGINE_SPEC section 3: light for the sky and scene, in daylight.
// Source: Kodak Ultra Max 400 data sheet, publication E-7023, daylight table, rewritten as light numbers so it
// works for any camera and film. At ISO 400, open terrain in sun is 16 (Kodak: f/11 at 1/500).
import { filmStep } from "./film.ts";
import type { Scene, Sky } from "./types.ts";

/** Kodak's rows: distinct shadows, soft shadows, no shadows, heavy overcast. Storm clouds are an ESTIMATE, one step darker. */
const SKY_VALUE: Record<Sky, number> = { sun: 8, sun_haze: 7, sun_behind_clouds: 6, overcast: 5, storm: 4 };
/** Kodak: sand or snow is one step less light than open terrain. Under trees is open shade, with the correction in section 4. */
const SCENE_VALUE: Record<Scene, number> = { snow_sand: 7, open: 6, under_trees: 5 };

/**
 * The app's own way of showing the light, not a fact about it: one shutter step slower for each step darker sky,
 * so a scene and film keep the same aperture under every sky (1/250 down to 1/15).
 */
export const SKY_START_S: Record<Sky, number> = { sun: 8, sun_haze: 7, sun_behind_clouds: 6, overcast: 5, storm: 4 };

/** L0 = sky + scene + filmStep. */
export const daylightValue = (sky: Sky, scene: Scene, iso: number) => SKY_VALUE[sky] + SCENE_VALUE[scene] + filmStep(iso);

/**
 * Kodak's table has no storm row, and covers snow or sand and open shade only in sun. Anything else is an ESTIMATE.
 */
export const daylightIsEstimate = (sky: Sky, scene: Scene) => sky === "storm" || (scene !== "open" && sky !== "sun");
