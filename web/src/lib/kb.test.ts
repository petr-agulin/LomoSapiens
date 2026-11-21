import { describe, expect, it } from "vitest";
import {
  APERTURE_INDEX,
  SHUTTER_INDEX,
  evaluate,
  filmStep,
  isRefusal,
  landscapeFocus,
  recommend,
  sharpZone,
  slowestShutter,
  usualDistanceM,
} from "./engine/index.ts";
import { shutterAt, wholeStepAperture } from "./engine/light.ts";
import type { Camera, Conditions, Goal, Light, Recommendation, Subject, Support, TimedShutter } from "./engine/types.ts";
import { ARTICLES, TOPICS, articleById, findArticles, parseKb, segments } from "./kb.ts";

// ------------------------------------------------------------ the example set-up the articles state

/** "A 40 mm lens", as the articles say, on a camera wide enough that only the light decides. */
const LENS_40: Camera = { widestAperture: "2.8", smallestAperture: "22", focalLengthMm: 40, fastestShutter: "1/2000", slowestShutter: "1", hasBulb: true };
/** Same light, different settings: "up to 1/500". */
const UP_TO_500: Camera = { ...LENS_40, fastestShutter: "1/500", slowestShutter: "1/15" };

const day = (sky: Extract<Light, { kind: "daylight" }>["sky"], scene: Extract<Light, { kind: "daylight" }>["scene"] = "open"): Light => ({ kind: "daylight", sky, scene });

function ask(light: Light, { iso = 400, subject = "landscape" as Subject, goal = undefined as Goal | undefined, support = "hand" as Support, camera = LENS_40, sunBehindSubject = false } = {}) {
  const conditions: Conditions = { film: { iso, type: "color_negative" }, light, subject, goal, support, camera, sunBehindSubject };
  const result = recommend(conditions);
  if (isRefusal(result)) throw new Error(result.refused);
  return { conditions, result: result as Recommendation };
}

/** The light for the sky and scene, with its corrections, in steps: the aperture's index plus the shutter's. */
function lightValue(light: Light, iso: number, { subject = "landscape" as Subject, sunBehindSubject = false } = {}) {
  const { result } = ask(light, { iso, subject, sunBehindSubject, support: "surface" });
  const forLight = result.steps.filter((step) => ["daylight_value", "shade", "backlight", "low_sun"].includes(step.kind));
  const last = forLight[forLight.length - 1];
  return APERTURE_INDEX[last.aperture!] + SHUTTER_INDEX[last.shutter as TimedShutter];
}

/** That light as the pair at a given shutter: "f/16 at 1/250". */
const lightAt = (light: Light, iso: number, shutter: TimedShutter = "1/250", who: Parameters<typeof lightValue>[2] = {}) =>
  `f/${wholeStepAperture(lightValue(light, iso, who) - SHUTTER_INDEX[shutter])} at ${shutter}`;

/** A face, lit from the front or with the sun behind it. */
const face = (sunBehindSubject: boolean) => ({ subject: "portrait" as Subject, sunBehindSubject });

/** The lights in which a portrait with the sun behind it gets the flare warning, by their names on the light step. */
function flareLights() {
  const named: [Light, string][] = [
    [day("sun"), "Sun"], [day("sun_haze"), "sun in haze"], [day("sun_behind_clouds"), "sun behind clouds"], [day("overcast"), "overcast"], [day("storm"), "storm clouds"],
    ...(["sun_low", "sun_just_set", "dusk", "street_night", "home_lamps", "floodlit"] as const).map((lowlight): [Light, string] => [{ kind: "lowlight", lowlight }, lowlight === "sun_low" ? "sun on the horizon" : lowlight]),
    ...(["window", "room", "lamps", "office"] as const).map((indoor): [Light, string] => [{ kind: "indoors", indoor }, indoor]),
  ];
  const warned = named.filter(([light]) => ask(light, face(true)).result.warnings.some((warning) => warning.code === "flare_risk"));
  return warned.map(([, name]) => name).join(", ");
}

/** A shutter speed by its step index, past the engine's dial too: 1/4000 and 1/8000 above it, whole seconds below 1 s. */
const speedAt = (index: number) => (index < 0 ? `${2 ** -index} s` : (shutterAt(index) ?? { 12: "1/4000", 13: "1/8000" }[index] ?? "?"));

/** The steps an ND filter takes away: its number is the share of light it keeps, ND8 an eighth (Wikipedia, "Neutral-density filter"). */
const ndSteps = (factor: number) => Math.round(Math.log2(factor));

/** That light as the shutter at a given aperture, with an ND filter or without: "1/8000". */
const shutterFor = (light: Light, iso: number, aperture: keyof typeof APERTURE_INDEX, ndFactor = 1) =>
  speedAt(lightValue(light, iso) - APERTURE_INDEX[aperture] - ndSteps(ndFactor));

const COUNT = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const lessLight = (steps: number) => `${COUNT[steps]} step${steps === 1 ? "" : "s"} less light`;

const finalPair = ({ result }: ReturnType<typeof ask>) => `f/${result.final.aperture} at ${result.final.shutter}`;

const zone = (aperture: keyof typeof APERTURE_INDEX, metres: number) => {
  const { nearM, farM } = sharpZone(LENS_40, aperture, metres);
  return `${nearM} to ${farM} m`;
};

function landscape(aperture: keyof typeof APERTURE_INDEX) {
  const focus = landscapeFocus(LENS_40, aperture);
  return `Focus ${focus} m, sharp from ${sharpZone(LENS_40, aperture, focus).nearM} m to ∞`;
}

/** The dial's speed nearest 1 over a number, such as the film speed or the focal length. */
function nearestSpeed(over: number) {
  const speeds = Object.keys(SHUTTER_INDEX).filter((speed) => speed.startsWith("1/")) as TimedShutter[];
  return speeds.reduce((best, speed) =>
    Math.abs(Math.log2(Number(speed.slice(2)) / over)) < Math.abs(Math.log2(Number(best.slice(2)) / over)) ? speed : best,
  );
}

/** The classic Sunny 16 rule: f/16 at the dial's speed nearest 1 over the film speed. */
const sunny16 = (iso: number) => `f/16 at ${nearestSpeed(iso)}`;

/** The angle a lens takes in across the 36 mm frame, in whole degrees: 2 × arctan(18 ÷ the focal length). */
const across = (focalMm: number) => Math.round((2 * Math.atan(18 / focalMm) * 180) / Math.PI);

const bySupport = (support: Support) => `${slowestShutter(support, LENS_40)} or faster`;

/** On a surface the app goes down to the dial's slowest speed, and uses B when the light needs longer. */
function onSurface() {
  const slowest = slowestShutter("surface", { ...LENS_40, slowestShutter: "1/15" });
  const { result } = ask({ kind: "lowlight", lowlight: "floodlit" }, { iso: 100, support: "surface", camera: { ...LENS_40, slowestShutter: "1/15" } });
  return slowest === "1/15" && result.final.shutter === "B" ? "Any speed, and B" : "?";
}

/** A moving subject: no warning at 1/125, a warning below it. */
function movingLimit() {
  const { conditions } = ask(day("overcast"), { subject: "group", goal: "moving" });
  const warns = (shutter: TimedShutter) => {
    const what = evaluate(conditions, { shutter, aperture: "2.8" });
    return !isRefusal(what) && what.warnings.some((warning) => warning.code === "motion_blur_risk");
  };
  return !warns("1/125") && warns("1/60") ? "1/125 or faster" : "?";
}

/** "Everything sharp" lands on f/8 or f/11 whenever the light allows, as in two everyday cases. */
function sharpChoice() {
  const apertures = [day("sun"), day("sun_behind_clouds")].map((light) => ask(light, { subject: "group", goal: "sharp" }).result.final.aperture);
  return apertures.every((aperture) => aperture === "8" || aperture === "11") ? "f/8 or f/11" : "?";
}

/**
 * Every "In practice" row, worked out again: by the engine, by plain maths, or, for the one fact the
 * engine doesn't hold, its source. A new row fails until it is added here.
 */
const PRACTICE: Record<string, () => string> = {
  "step|One step more light, at 1/250": () => `f/11 to f/${wholeStepAperture(APERTURE_INDEX["11"] - 1)}`,
  "step|Or keep f/11 and slow down": () => `1/250 to ${shutterAt(SHUTTER_INDEX["1/250"] - 1)}`,
  "step|ISO 200 to ISO 400": () => (filmStep(400) - filmStep(200) === 1 ? "One step less light needed" : "?"),
  "aperture|40 mm lens at f/2.8": () => `An opening of about ${Math.round(40 / 2.8)} mm`,
  "aperture|40 mm lens at f/22": () => `An opening of about ${(40 / 22).toFixed(1)} mm`,
  "aperture|Everything sharp, the app's choice": sharpChoice,
  "shutter-speed|Moving subject": movingLimit,
  "shutter-speed|By hand": () => bySupport("hand"),
  "shutter-speed|Braced": () => bySupport("braced"),
  "shutter-speed|On a surface": onSurface,
  "film-speed|Sun, open terrain, ISO 100": () => lightAt(day("sun"), 100),
  "film-speed|The same light, ISO 400": () => lightAt(day("sun"), 400),
  "film-speed|Snow or sand in sun, ISO 400": () => lightAt(day("sun", "snow_sand"), 400),
  "sunny-16|Sun, ISO 400, the classic rule": () => sunny16(400),
  // Kodak's own pair for bright sun at ISO 400 is at 1/500, the shutter its table gives every row (E-7023).
  "sunny-16|Sun, ISO 400, Kodak's table": () => lightAt(day("sun"), 400, "1/500"),
  "sunny-16|Sun, ISO 400, the app": () => lightAt(day("sun"), 400),
  "sunny-16|Overcast, ISO 400, the app": () => lightAt(day("overcast"), 400),
  "sunny-16|In the shade in sun, ISO 400, the app": () => lightAt(day("sun", "under_trees"), 400),
  "sunny-16|Snow or sand in sun, ISO 400, the app": () => lightAt(day("sun", "snow_sand"), 400),
  "same-light|Sun behind clouds, ISO 400, up to 1/500, moving subject": () =>
    finalPair(ask(day("sun_behind_clouds"), { subject: "group", goal: "moving", camera: UP_TO_500 })),
  "same-light|The same, blurred background": () => finalPair(ask(day("sun_behind_clouds"), { subject: "portrait", goal: "blur", camera: UP_TO_500 })),
  "same-light|The same, everything sharp": () => finalPair(ask(day("sun_behind_clouds"), { subject: "group", goal: "sharp", camera: UP_TO_500 })),
  "flare|Face in sun, ISO 400, sun behind you": () => lightAt(day("sun"), 400, "1/250", face(false)),
  "flare|The same, sun behind them": () => lightAt(day("sun"), 400, "1/250", face(true)),
  // Kodak's own pair for a backlit close-up subject in bright sun at ISO 400 is at 1/500 (E-7023).
  "flare|Kodak's table, backlit face, ISO 400": () => lightAt(day("sun"), 400, "1/500", face(true)),
  "flare|The flare warning, with the sun behind them": flareLights,
  // Exposure triangle, Depth of field and Movement.
  "triangle|Sun behind clouds, ISO 400": () => lightAt(day("sun_behind_clouds"), 400),
  "triangle|The same, one step wider": () => lightAt(day("sun_behind_clouds"), 400, "1/500"),
  "triangle|The same, on ISO 100 film": () => lightAt(day("sun_behind_clouds"), 100),
  "creative-exposure|Overcast, ISO 400, up to 1/500, moving subject": () => finalPair(ask(day("overcast"), { subject: "group", goal: "moving", camera: UP_TO_500 })),
  "creative-exposure|The same, blurred background": () => finalPair(ask(day("overcast"), { subject: "portrait", goal: "blur", camera: UP_TO_500 })),
  "creative-exposure|The same, everything sharp": () => finalPair(ask(day("overcast"), { subject: "group", goal: "sharp", camera: UP_TO_500 })),
  "grain|ISO 800 against ISO 100": () => lessLight(filmStep(800) - filmStep(100)),
  "grain|Overcast, ISO 100": () => lightAt(day("overcast"), 100),
  "grain|Overcast, ISO 800": () => lightAt(day("overcast"), 800),
  "nd-filter|ND2": () => lessLight(ndSteps(2)),
  "nd-filter|ND8": () => lessLight(ndSteps(8)),
  "nd-filter|ND1000": () => lessLight(ndSteps(1000)),
  "nd-filter|Sun, ISO 400, f/2.8": () => shutterFor(day("sun"), 400, "2.8"),
  "nd-filter|The same with an ND8": () => shutterFor(day("sun"), 400, "2.8", 8),
  "sharp-zone|40 mm, portrait at 1 m, f/2.8": () => zone("2.8", 1),
  "sharp-zone|40 mm, group at 4 m, f/8": () => zone("8", 4),
  "sharp-zone|40 mm, landscape at f/22": () => landscape("22"),
  "sharp-zone|40 mm, landscape at f/8": () => landscape("8"),
  "shallow-deep|40 mm, f/2.8, focused at 2 m": () => zone("2.8", 2),
  "shallow-deep|40 mm, f/11, focused at 3 m": () => zone("11", 3),
  "shallow-deep|Everything sharp, the app's choice": sharpChoice,
  // Wikipedia, "Shutter speed": 1/500 and 1/250 for people in motion; about half a second or longer on running water.
  "movement|People moving, everyday": () => "1/250 or 1/500",
  "movement|Soft running water": () => "1/2 or slower",
  "movement|Overcast, ISO 100, f/22": () => shutterFor(day("overcast"), 100, "22"),
  "movement|The same with an ND8": () => `${shutterFor(day("overcast"), 100, "22", 8)}, on B`,
  // Wikipedia, "Pace (unit)": a double step is about 1.5 m. Not the engine's, so it is the source's figure.
  "focusing|Two walking steps": () => "About 1.5 m",
  "focusing|40 mm, portrait": () => `About ${usualDistanceM(LENS_40, "portrait")} m`,
  "focusing|40 mm, group": () => `About ${usualDistanceM(LENS_40, "group")} m`,
  "focusing|40 mm, landscape at f/16": () => `${landscapeFocus(LENS_40, "16")} m`,
  "holding|By hand": () => bySupport("hand"),
  "holding|Braced": () => bySupport("braced"),
  "holding|On a surface": onSurface,
  // Lenses: plain maths, and the sources' own figures where the engine has none.
  "lenses|28 mm, across the frame": () => `About ${across(28)}°`,
  "lenses|50 mm, across the frame": () => `About ${across(50)}°`,
  "lenses|28 mm, a scene 10 m away": () => `About ${Math.round((36 * 10) / 28)} m across`,
  "lenses|50 mm, a scene 10 m away": () => `About ${Math.round((36 * 10) / 50)} m across`,
  "lenses|f/1.4 against f/2.8, wide open": () => (APERTURE_INDEX["2.8"] - APERTURE_INDEX["1.4"] === 2 ? "Two steps more light" : "?"),
  // Wikipedia, "Normal lens", "Wide-angle lens" and "Perspective distortion".
  "lens-types|Normal lens, 35 mm film": () => "40 to 58 mm, most often 50 mm",
  "lens-types|Wide-angle lens": () => "35 mm or shorter",
  "lens-types|Portrait lens": () => "85 to 135 mm",
  "lens-types|135 mm, by hand": () => `${nearestSpeed(135)} or faster`,
  "zoom|A 28–70 mm zoom": () => `${70 / 28}×`,
  "zoom|A 35–105 mm zoom": () => `${105 / 35}×`,
  // Wikipedia, "Zoom lens": superzooms are typically more than 5×.
  "zoom|Past 5×": () => "A superzoom",
  // Wikipedia, "Wide-angle lens", "Street photography", "Perspective distortion" and "Macro photography".
  "choosing-lens|Landscape, buildings, rooms": () => "35 mm or shorter",
  "choosing-lens|Street": () => "35 mm, classically",
  "choosing-lens|Faces": () => "85 to 135 mm",
  "choosing-lens|Small things, life-size": () => "A macro lens",
  // The two buying guides in the article's sources.
  "buying-lens|Dust, small scratches": () => "Seldom show in pictures",
  "buying-lens|Much separation": () => "Shows, and can't be fixed",
  "buying-lens|A dent": () => "A sign of a drop: walk away",
};

const tiles = (id: string) => articleById(id)!.picture;
const bigs = (id: string) => tiles(id).map((tile) => tile.big);
const text = (parts: { text: string }[]) => parts.map((part) => part.text).join("");

// ------------------------------------------------------------ the tests

describe("the theory articles", () => {
  it("are the nine articles of the design, then Lenses, Exposure triangle, Depth of field, Movement and Into the light", () => {
    expect(ARTICLES.map((article) => `${article.topic}: ${article.title}`)).toEqual([
      "The basics: A step of light",
      "The basics: Aperture",
      "The basics: Shutter speed",
      "The basics: Film speed",
      "Reading the light: Sunny 16",
      "Reading the light: Same light, different settings",
      "Reading the light: Into the light",
      "Exposure triangle: The exposure triangle",
      "Exposure triangle: Creatively correct exposure",
      "Exposure triangle: Film grain",
      "Exposure triangle: Neutral density filters",
      "Depth of field: Sharp zone",
      "Depth of field: Shallow or deep",
      "Depth of field: Focusing by distance",
      "Movement: Freezing or blurring movement",
      "Movement: Holding the camera still",
      "Lenses: How lenses differ",
      "Lenses: Wide, normal and long",
      "Lenses: Zoom lenses",
      "Lenses: Which lens for which picture",
      "Lenses: Before buying a lens",
    ]);
    for (const article of ARTICLES) expect(TOPICS).toContain(article.topic);
    // The file runs topic by topic, in the list's order, so the file reads as the screen does.
    expect([...new Set(ARTICLES.map((article) => article.topic))]).toEqual([...TOPICS]);
  });

  it("each have a teaser, a lead, a body, a picture with a caption, In practice and sources", () => {
    for (const article of ARTICLES) {
      expect(article.teaser, article.id).not.toBe("");
      expect(text(article.lead).length, article.id).toBeGreaterThan(40);
      expect(article.body.length, article.id).toBeGreaterThan(0);
      expect(article.picture.length, article.id).toBeGreaterThan(2);
      expect(article.caption, article.id).not.toBe("");
      expect(article.practice.length, article.id).toBeGreaterThan(1);
      expect(article.sources.length, article.id).toBeGreaterThan(0);
    }
  });

  it("link only to articles that exist, never to themselves", () => {
    const ids = ARTICLES.map((article) => article.id);
    for (const article of ARTICLES) {
      for (const next of article.readNext) {
        expect(ids, `${article.id} → ${next}`).toContain(next);
        expect(next).not.toBe(article.id);
      }
      for (const link of [...article.lead, ...article.body.flat()].filter((part) => part.link)) {
        expect(link.link, article.id).toMatch(/^#/);
        expect(ids, `${article.id} → ${link.link}`).toContain(link.link!.slice(1));
      }
    }
  });

  it("cite only the agreed kinds of source: Wikipedia, Kodak's data sheet, plain maths, or the app's own rules", () => {
    // What no Wikipedia page holds, for that article only: checking a used lens, two buying guides;
    // the name "exposure triangle", a camera dealer's guide; the cost of much extra light, and flare from a bright
    // sky in the shade, Kodak's own 1997 data sheet, no longer on Kodak's site, in the copy kept by the University
    // of Zurich's film colour archive.
    const kodakE182 = "https://filmcolors.org/wp-content/uploads/2025/12/KODAK-Pro-Films_E-182.pdf";
    const guides: Record<string, string[]> = {
      "buying-lens": ["https://www.japancamerahunter.com/2014/03/classic-lens-buyers-guide/", "https://phillipreeve.net/blog/?p=805"],
      triangle: ["https://www.mpb.com/en-us/blog/article/12745/"],
      "sunny-16": [kodakE182],
      flare: [kodakE182],
    };
    for (const article of ARTICLES) {
      for (const source of article.sources) {
        const line = text(source);
        const web = source.find((part) => part.link);
        if (web && guides[article.id]?.includes(web.link!)) continue;
        if (web) expect(web.link, article.id).toMatch(/^https:\/\/(en\.wikipedia\.org\/wiki\/|kodakprofessional\.com\/)/);
        else expect(line, article.id).toMatch(/^(Plain maths|The app's own)/);
      }
    }
  });

  it("call the app's own rules and estimates what they are", () => {
    const all = (id: string) => [text(articleById(id)!.lead), ...articleById(id)!.body.map(text)].join(" ");
    expect(all("sunny-16")).toContain("That step is the app's own estimate.");
    expect(all("holding")).toContain("This is the app's own advice, not from a published source.");
    expect(all("focusing")).toContain("The heights are the app's own estimates");
    expect(all("same-light")).toContain("These are the app's own rules.");
    expect(all("lenses")).toContain("that range is the app's own");
    expect(all("zoom")).toContain("This is the app's own advice.");
    expect(all("creative-exposure")).toContain("These are the app's own rules.");
    expect(all("nd-filter")).toContain("This is the app's own advice.");
    expect(all("movement")).toContain("This is the app's own advice.");
    expect(all("flare")).toContain("the hand is the app's own advice");
    expect(all("flare")).toContain("These are the app's own rules.");
  });

  it("call the sharp zone by its usual name too, depth of field", () => {
    expect(text(articleById("sharp-zone")!.lead)).toContain("which photographers call depth of field");
    expect(articleById("sharp-zone")!.teaser).toMatch(/^Depth of field/);
  });

  it("name no camera, no place and no film brand, and show no notes for developers", () => {
    const shown = JSON.stringify(ARTICLES);
    // Whole words only: "portrait" is not the film "Portra".
    expect(shown).not.toMatch(/\b(LOMO|135M|Nikkormat|Zenit|Industar|Pentax|Nikon|Canon|Sweden|Gothenburg|Portra|Ilford|UltraMax)\b/i);
    expect("A Portra 400 roll").toMatch(/\b(Portra)\b/i);
    expect(shown).not.toMatch(/docs\/|ENGINE_SPEC|<!--/);
  });

  it("say Kodak only as the source of the app's daylight table, or of a film's own data sheet", () => {
    for (const article of ARTICLES) {
      for (const paragraph of [article.lead, ...article.body]) {
        if (/Kodak/.test(text(paragraph))) expect(text(paragraph), article.id).toMatch(/Kodak's (daylight )?table|Kodak's sheet for its/);
      }
    }
  });

  it("say why the app gives one step more light than Sunny 16", () => {
    const body = articleById("sunny-16")!.body.map(text).join(" ");
    expect(body).toContain("Why one step more?");
    expect(body).toContain("two steps too little light and three steps too much");
  });
});

describe("the numbers in the articles are the app's own", () => {
  const rows = ARTICLES.flatMap((article) => article.practice.map((row) => ({ key: `${article.id}|${row.what}`, value: row.value })));

  it("check every In practice row, and no row is left unchecked", () => {
    expect(rows.map((row) => row.key).sort()).toEqual(Object.keys(PRACTICE).sort());
  });

  for (const { key, value } of rows) {
    it(`${key}: ${value}`, () => {
      const check = PRACTICE[key];
      expect(check, key).toBeDefined();
      expect(value).toBe(check());
    });
  }

  it("draw Sunny 16's skies as the app's apertures at ISO 400 and 1/250", () => {
    expect(tiles("sunny-16").map((tile) => `${tile.top} ${tile.big}`)).toEqual(
      (["sun", "sun_haze", "sun_behind_clouds", "overcast", "storm"] as const).map(
        (sky, index) => `${["Sun", "Haze", "Clouds", "Overcast", "Storm"][index]} ${lightAt(day(sky), 400).replace(" at 1/250", "")}`,
      ),
    );
    expect(tiles("sunny-16").filter((tile) => tile.on).map((tile) => tile.top)).toEqual(["Sun"]);
  });

  it("draw the sharp zone at 3 m with a 40 mm lens, rounded for the tiles", () => {
    const shown = (aperture: keyof typeof APERTURE_INDEX) => {
      const { nearM, farM } = sharpZone(LENS_40, aperture, 3);
      const round = (metres: number) => (metres < 10 ? metres.toFixed(1) : String(Math.round(metres)));
      return `${round(nearM)}–${farM === null ? "∞" : round(farM)}`;
    };
    expect(bigs("sharp-zone")).toEqual([shown("2.8"), shown("8"), shown("16")]);
  });

  it("draw the usual distances of the subject step, and the slowest speed for each hold", () => {
    expect(bigs("focusing")).toEqual([...(["portrait", "two_people", "group"] as const).map((subject) => String(usualDistanceM(LENS_40, subject))), "∞"]);
    expect(bigs("holding")).toEqual([slowestShutter("hand", LENS_40), slowestShutter("braced", LENS_40), "Any"]);
  });

  it("draw pictures whose steps are whole steps of light", () => {
    expect(bigs("step")).toEqual(["2.8", "4", "5.6", "8", "11", "16", "22"]);
    const pairs = tiles("same-light").map((tile) => APERTURE_INDEX[tile.top.slice(2) as keyof typeof APERTURE_INDEX] + SHUTTER_INDEX[tile.big as TimedShutter]);
    expect(new Set(pairs).size).toBe(1);
    expect(`f/16 at 1/60`).toBe(lightAt(day("sun_behind_clouds"), 400, "1/60"));
    expect(bigs("film-speed").map(Number)).toEqual([100, 200, 400, 800]);
  });

  it("draw the triangle's corners as the app's pair for sun behind clouds on ISO 400 film", () => {
    expect(tiles("triangle").map((tile) => tile.top)).toEqual(["Aperture", "Shutter", "Film speed"]);
    const [aperture, shutter, iso] = bigs("triangle");
    expect(`${aperture} at ${shutter}`).toBe(lightAt(day("sun_behind_clouds"), 400));
    expect(iso).toBe("400");
  });

  it("draw four correct pairs for one light, overcast on ISO 400 film", () => {
    const pairs = tiles("creative-exposure").map((tile) => APERTURE_INDEX[tile.top.slice(2) as keyof typeof APERTURE_INDEX] + SHUTTER_INDEX[tile.big as TimedShutter]);
    expect(pairs).toEqual([1, 2, 3, 4].map(() => lightValue(day("overcast"), 400)));
  });

  it("draw grain from slow film to fast, and the shutter each ND filter needs at f/2.8 in sun", () => {
    expect(bigs("grain").map(Number)).toEqual([100, 200, 400, 800]);
    expect(bigs("nd-filter")).toEqual([1, 2, 4, 8].map((factor) => shutterFor(day("sun"), 400, "2.8", factor)));
  });

  it("draw the zone at f/11 and 3 m with a 40 mm lens, the focus highlighted", () => {
    const { nearM, farM } = sharpZone(LENS_40, "11", 3);
    expect(bigs("shallow-deep")).toEqual([nearM.toFixed(1), "3", farM!.toFixed(1)]);
    expect(tiles("shallow-deep").filter((tile) => tile.on).map((tile) => tile.top)).toEqual(["Focus"]);
  });

  it("draw movement at speeds on the dial (Wikipedia, \"Shutter speed\")", () => {
    expect(bigs("movement")).toEqual(["1/500", "1/15", "1/2"]);
    for (const speed of bigs("movement")) expect(SHUTTER_INDEX).toHaveProperty([speed]);
  });

  it("draw each lens's angle across the frame, and a zoom's range with its ratio", () => {
    expect(tiles("lenses").map((tile) => `${tile.top} ${tile.big}`)).toEqual([28, 50, 85, 135].map((mm) => `${mm} mm ${across(mm)}°`));
    expect(bigs("zoom")).toEqual(["28", "35", "50", "70"]);
    expect(articleById("zoom")!.caption).toContain(`${70 / 28}× zoom`);
  });
});

describe("searching the articles", () => {
  it("keeps every article while nothing is typed", () => {
    expect(findArticles("")).toHaveLength(21);
    expect(findArticles("   ")).toHaveLength(21);
  });

  it("matches the title or the teaser, ignoring case, with every word typed", () => {
    expect(findArticles("APERTURE").map((article) => article.id)).toEqual(["aperture", "triangle", "nd-filter"]);
    expect(findArticles("iso").map((article) => article.id)).toEqual(["film-speed"]);
    expect(findArticles("shutter").map((article) => article.id)).toEqual(["shutter-speed", "triangle", "nd-filter", "holding"]);
    expect(findArticles("slow shake").map((article) => article.id)).toEqual(["holding"]);
    expect(findArticles("tripod")).toEqual([]);
    expect(findArticles("used lens").map((article) => article.id)).toEqual(["buying-lens"]);
    expect(findArticles("zoom").map((article) => article.id)).toEqual(["zoom"]);
  });

  it("finds the newer articles by the words they are about", () => {
    expect(findArticles("depth of field").map((article) => article.id)).toEqual(["sharp-zone"]);
    expect(findArticles("triangle").map((article) => article.id)).toEqual(["triangle"]);
    expect(findArticles("grain").map((article) => article.id)).toEqual(["grain"]);
    expect(findArticles("water").map((article) => article.id)).toEqual(["movement"]);
    expect(findArticles("filter").map((article) => article.id)).toEqual(["nd-filter"]);
    expect(findArticles("flare").map((article) => article.id)).toEqual(["flare"]);
    expect(findArticles("haze").map((article) => article.id)).toEqual(["flare"]);
  });
});

describe("reading the file", () => {
  it("splits text into runs and links", () => {
    expect(segments("See [same light](#same-light), then more.")).toEqual([
      { text: "See " },
      { text: "same light", link: "#same-light" },
      { text: ", then more." },
    ]);
  });

  it("refuses an article without its parts, so a broken file fails the tests rather than the screen", () => {
    expect(() => parseKb("## No ID\n\nTopic: The basics")).toThrow(/title and an ID/);
    expect(() => parseKb("## Bare {#bare}\n\nTopic: The basics\n\nJust a lead.")).toThrow(/In practice/);
  });
});
