// The engine's inputs and outputs. See docs/ENGINE_SPEC.md sections 1, 1a and 12.
// JSON Schemas for the same shapes live in schema/.

export type FilmType = "color_negative" | "bw_negative" | "slide";
export type Sky = "sun" | "sun_haze" | "sun_behind_clouds" | "overcast" | "storm";
export type Scene = "snow_sand" | "open" | "under_trees";
export type IndoorLight = "window" | "room" | "lamps" | "office";
/** What the Scene choice offers: the three outdoor scenes, then indoors. */
export type AnyScene = Scene | `indoor_${IndoorLight}`;
export type LowLight = "sun_low" | "sun_just_set" | "dusk" | "street_night" | "home_lamps" | "floodlit";
export type Subject = "portrait" | "two_people" | "group" | "landscape" | "other";
export type Goal = "blur" | "sharp" | "moving";
export type Support = "hand" | "braced" | "surface";

/** Every aperture a camera can have. "1.7", "1.8", "3.5" and "4.5" only ever appear as a lens's widest aperture. */
export type Aperture = "1.4" | "1.7" | "1.8" | "2" | "2.8" | "3.5" | "4" | "4.5" | "5.6" | "8" | "11" | "16" | "22" | "32";
export type TimedShutter =
  | "1"
  | "1/2"
  | "1/4"
  | "1/8"
  | "1/15"
  | "1/30"
  | "1/60"
  | "1/125"
  | "1/250"
  | "1/500"
  | "1/1000"
  | "1/2000";
export type Shutter = TimedShutter | "B";

export type WidestAperture = "1.4" | "1.7" | "1.8" | "2" | "2.8" | "3.5" | "4" | "4.5" | "5.6";
export type SmallestAperture = "11" | "16" | "22" | "32";
export type FastestShutter = "1/125" | "1/250" | "1/500" | "1/1000" | "1/2000";
export type SlowestShutter = "1" | "1/2" | "1/4" | "1/8" | "1/15" | "1/30" | "1/60";

/** The user's own camera, read off the camera itself. ENGINE_SPEC section 1a. */
export interface Camera {
  widestAperture: WidestAperture;
  smallestAperture: SmallestAperture;
  focalLengthMm: number;
  fastestShutter: FastestShutter;
  /** The slowest timed speed, before B. */
  slowestShutter: SlowestShutter;
  hasBulb: boolean;
}

export type Light =
  | { kind: "daylight"; sky: Sky; scene: Scene }
  | { kind: "lowlight"; lowlight: LowLight }
  | { kind: "indoors"; indoor: IndoorLight; sky?: Sky | null };

export interface Conditions {
  film: { iso: number; type: FilmType };
  light: Light;
  subject: Subject;
  subjectDistanceM?: number | null;
  goal?: Goal;
  lowSun?: boolean;
  sunBehindSubject?: boolean;
  sunAhead?: boolean;
  support?: Support | null;
  camera: Camera;
}

export type WarningCode =
  | "least_light_limit"
  | "not_enough_light"
  | "dusk_no_value"
  | "light_estimate"
  | "flare_risk"
  | "blur_limited"
  | "motion_blur_risk"
  | "focus_critical"
  | "close_focus"
  | "people_hold_still"
  | "people_not_recommended"
  | "b_counted_seconds"
  | "long_exposure";

export interface Warning {
  code: WarningCode;
  stops?: number;
  suggestSupport?: Support;
  seconds?: number;
}

export type StepKind =
  | "daylight_value"
  | "published_value"
  | "indoor_estimate"
  | "dark_sky"
  | "dusk_no_value"
  | "shade"
  | "backlight"
  | "low_sun"
  | "same_light_for_goal"
  | "same_light_for_support"
  | "blur_extra"
  | "least_light_limit"
  | "not_enough_light";

export interface Step {
  kind: StepKind;
  stops?: number;
  /** Null if this point in the reasoning has no matching setting on the camera. */
  aperture: Aperture | null;
  shutter: Shutter | null;
  bulbSeconds?: number;
}

/** Why a result is an estimate (ENGINE_SPEC section 12a): the light, then the corrections, then the focus. */
export type EstimateReason =
  | "storm"
  | "snow_sand_not_sun"
  | "shade_not_sun"
  | "indoor"
  | "evening"
  | "dusk"
  | "hazy_backlight"
  | "storm_outside"
  | "low_sun"
  | "usual_distance";

export type ShakeRisk = "none" | "low" | "medium" | "high" | "very_high";

/** default: the subject's usual distance, an estimate. given: the user's own. landscape: keeps infinity sharp. */
export type FocusSource = "default" | "given" | "landscape";
/** Null means infinity. */
export type Focus = { meters: number | null; source: FocusSource };
/** Null means infinity. */
export type SharpZone = { nearM: number; farM: number | null };

export interface Recommendation {
  steps: Step[];
  final: {
    aperture: Aperture;
    shutter: Shutter;
    bulbSeconds: number | null;
    support: Support;
    focus: Focus;
    sharpZone: SharpZone;
    shakeRisk: ShakeRisk;
  };
  estimate: boolean;
  /** Empty when nothing is estimated. */
  estimates: EstimateReason[];
  warnings: Warning[];
  facts: Array<{ id: string; text: string; kb: string[] }>;
}

export type RefusalCode = "unsupported_film" | "unsupported_camera" | "unsupported_lens" | "missing_distance" | "not_on_camera";

export interface Refusal {
  refused: RefusalCode;
}

export type EngineResult = Recommendation | Refusal;

export interface WhatIfOptions {
  aperture?: Aperture;
  shutter?: Shutter;
  bulbSeconds?: number;
  /** Null means infinity. */
  focusM?: number | null;
  support?: Support;
}

export interface WhatIf {
  aperture: Aperture;
  shutter: Shutter;
  bulbSeconds: number | null;
  support: Support;
  /** Compared with the recommendation. Positive means more light. */
  stepsVsRecommendation: number;
  focus: Focus;
  sharpZone: SharpZone;
  shakeRisk: ShakeRisk;
  warnings: Warning[];
}
