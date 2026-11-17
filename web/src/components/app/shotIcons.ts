// Icon paths for the new shot's choices: 24 × 24 strokes, drawn with the Icon component's stroke width.
import type { EveningLight } from "../../lib/store.ts";
import type { Goal, IndoorLight, Scene, Sky, Subject, Support } from "../../lib/engine/types.ts";

export const GROUP_ICON = {
  day: "M12 7.8a4.2 4.2 0 1 1 0 8.4a4.2 4.2 0 1 1 0-8.4zM12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8",
  evening: "M15.5 4.5a7 7 0 1 0 4 11.5 6 6 0 0 1-4-11.5z",
  indoors: "M3.5 11L12 4l8.5 7M5.5 9.5V20h13V9.5M9.5 12.5h5v4h-5z",
} as const;

export const SKY_ICON: Record<Sky, string> = {
  sun: GROUP_ICON.day,
  sun_haze: "M12 5.5a4 4 0 1 1 0 8a4 4 0 1 1 0-8zM12 2.2v1.6M4.8 9.5h1.6M17.6 9.5h1.6M6.9 4.4l1.1 1.1M16 5.5l1.1-1.1M4 16h16M6 19.5h12",
  sun_behind_clouds:
    "M8.5 5.3a3.2 3.2 0 1 1 0 6.4a3.2 3.2 0 1 1 0-6.4zM8.5 2.5v1.3M2.5 8.5h1.3M4.3 4.3l.9.9M12.7 4.3l-.9.9M8 19h10.5a3.5 3.5 0 0 0 0-7 4.8 4.8 0 0 0-9 .8A3.2 3.2 0 0 0 8 19z",
  overcast: "M6.5 18h11a4 4 0 0 0 .3-8 5.6 5.6 0 0 0-10.7 1.3A3.4 3.4 0 0 0 6.5 18z",
  storm: "M6.5 14h11a4 4 0 0 0 .3-8 5.6 5.6 0 0 0-10.7 1.3A3.4 3.4 0 0 0 6.5 14zM8 17l-1 3M12 17l-1 3M16 17l-1 3",
};

export const EVENING_ICON: Record<EveningLight, string> = {
  sun_low: "M7 16a5 5 0 0 1 10 0M2.5 16h19M12 7.5v2M5.5 10.5l1.3 1.3M18.5 10.5l-1.3 1.3M6 19.5h12",
  sun_just_set: "M2.5 14h19M5 17.5h14M8 21h8M8 14a4 4 0 0 1 8 0M12 6v2M6.5 8.5l1 1M17.5 8.5l-1 1",
  dusk: "M15.5 4.5a7 7 0 1 0 4 11.5 6 6 0 0 1-4-11.5zM2.5 20.5h19",
  street_night: "M9 21V6a3 3 0 0 1 3-3h4M14 3h5l-1 3h-3zM16.5 8.5l-2 4M16.5 8.5l2 4M5 21h8",
  floodlit: "M9 21V9l4-3 4 3v12zM11.5 21v-4h3v4M3 21l4-6M21 21l-2-4",
};

export const INDOOR_ICON: Record<IndoorLight, string> = {
  window: "M6 3.5h12a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1zM12 3.5v17M5 12h14",
  room: "M3.5 11L12 4l8.5 7M5.5 9.5V20h13V9.5M10 20v-5h4v5",
  lamps: "M8 4h8l3 7H5zM12 11v8M8 20h8",
  office: "M3 4h18M6 4v2h12V4M8 10l-1.5 3M12 10v3M16 10l1.5 3M5 20h14M8 20v-3h8v3",
};

export const PLACE_ICON: Record<Scene, string> = {
  snow_sand: "M2.5 17c3-3.5 6.5-3.5 9.5-.5s6.5 3 9.5-.5M2.5 21h19M17 3v6M14 6h6M15 4l4 4M19 4l-4 4",
  open: "M2.5 10.5h19M10.8 10.5L6 21M13.2 10.5L18 21M12 13.5v1.5M12 17.5v2.5M17.5 3.3a2.2 2.2 0 1 1 0 4.4a2.2 2.2 0 1 1 0-4.4z",
  under_trees: "M8 3l5 7h-2.5l3.5 5H3l3.5-5H4zM8 15v6M16.5 8l4 6h-2l3 4h-6.5M17.5 18v3M2.5 21h19",
};

export const SUBJECT_ICON: Record<Subject, string> = {
  portrait: "M12 4a3.6 3.6 0 1 1 0 7.2a3.6 3.6 0 1 1 0-7.2zM4.5 20.5c0-4 3.3-6.8 7.5-6.8s7.5 2.8 7.5 6.8",
  two_people:
    "M8.5 6a3 3 0 1 1 0 6a3 3 0 1 1 0-6zM16.2 7a2.6 2.6 0 1 1 0 5.2a2.6 2.6 0 1 1 0-5.2zM2.5 20.5c0-3.4 2.7-5.8 6-5.8s6 2.4 6 5.8M14.8 14.8c.5-.1.9-.2 1.4-.2 2.9 0 5.3 2.2 5.3 5.9",
  group:
    "M12 5a2.4 2.4 0 1 1 0 4.8a2.4 2.4 0 1 1 0-4.8zM5.5 8a2.1 2.1 0 1 1 0 4.2a2.1 2.1 0 1 1 0-4.2zM18.5 8a2.1 2.1 0 1 1 0 4.2a2.1 2.1 0 1 1 0-4.2zM7.5 20c0-2.8 2-4.8 4.5-4.8s4.5 2 4.5 4.8M1.8 18.5c0-2.2 1.6-3.8 3.7-3.8 1 0 1.8.3 2.5.8M22.2 18.5c0-2.2-1.6-3.8-3.7-3.8-1 0-1.8.3-2.5.8",
  landscape: "M2.5 19.5l6-9 4 5.5 3-4 6 7.5zM16.5 4a2 2 0 1 1 0 4a2 2 0 1 1 0-4z",
  other: "M3 15.5L15.5 3l5.5 5.5L8.5 21zM7 11.5l2 2M10 8.5l2 2M13 5.5l2 2",
};

export const GOAL_ICON: Record<Goal, string> = {
  blur: "M12 7a2.8 2.8 0 1 1 0 5.6a2.8 2.8 0 1 1 0-5.6zM6.5 20.5c0-3.2 2.5-5.4 5.5-5.4s5.5 2.2 5.5 5.4M4.5 4.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3zM19.5 4.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3zM3.5 11a1 1 0 1 1 0 2a1 1 0 1 1 0-2zM20.5 11a1 1 0 1 1 0 2a1 1 0 1 1 0-2z",
  sharp: "M3 7V3h4M17 3h4v4M21 17v4h-4M7 21H3v-4M6.5 16.5l3.5-5 2.5 3 2-2.5 3 4.5z",
  moving: "M14.5 3.5a2 2 0 1 1 0 4a2 2 0 1 1 0-4zM9 21l3-5.5 3 2.5v3.5M8 12l3.5-3 3.5 2.5 2.5 2.5M2.5 10h3M2 14h3.5M3.5 18h3",
};

export const SWITCH_ICON = {
  lowSun: "M5.5 9.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5zM2.5 19h19M13 9v10M13 19l8.5-2.5",
  stormOutside: "M4 3.5h16v17H4zM8.5 11h7a2.4 2.4 0 0 0 0-4.8 3.4 3.4 0 0 0-6.3.6A2.1 2.1 0 0 0 8.5 11zM12.5 12.5l-1.5 3h2.5l-1.5 3",
  sunBehind:
    "M16.5 4a3.5 3.5 0 1 1 0 7M16.5 1.5v1M21.5 7.5h1M20 3.5l.7-.7M9.5 8a3 3 0 1 1 0 6a3 3 0 1 1 0-6zM3.5 21c0-3.5 2.7-5.8 6-5.8s6 2.3 6 5.8",
} as const;

/** The icon for whatever light is picked. */
export function lightIcon(light: { group: "day"; sky: Sky } | { group: "evening"; lowlight: EveningLight } | { group: "indoors"; indoor: IndoorLight }) {
  if (light.group === "day") return SKY_ICON[light.sky];
  if (light.group === "evening") return EVENING_ICON[light.lowlight];
  return INDOOR_ICON[light.indoor];
}

/** The three ways of holding the camera, with the design's icons. */
export const HOLD_ICON: Record<Support, string> = {
  hand: "M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6a1.5 1.5 0 0 1 3 0v8.5c0 3.6-2.6 6-6 6-2.6 0-4.2-1.3-5.4-3.3L3.8 14a1.5 1.5 0 0 1 2.6-1.5L8 15",
  braced:
    "M3.5 3v18M3.5 7h3M3.5 12h3M3.5 17h3M10 9h9a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1zM14.5 11.2a1.8 1.8 0 1 1 0 3.6a1.8 1.8 0 1 1 0-3.6z",
  surface: "M8 3.5h8a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zM12 9.5v4M12 13.5l-6 7M12 13.5l6 7M12 13.5v7",
};
