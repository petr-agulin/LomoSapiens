import { describe, expect, it } from "vitest";
import starter from "../../../testset/parser/starter.json" with { type: "json" };
import {
  FASTEST_SHUTTERS,
  SLOWEST_SHUTTERS,
  SMALLEST_APERTURES,
  WIDEST_APERTURES,
  isRefusal,
  recommend,
  slowestShutter,
} from "../lib/engine/index.ts";
import type { Recommendation } from "../lib/engine/index.ts";
import type { ParseResult } from "../lib/parser.ts";
import { validateConditions, validateParse } from "../lib/validate.ts";
import {
  DEFAULT_FORM,
  FOCAL_LENGTHS,
  NOT_SURE,
  STARTING_CAMERA,
  answersToCamera,
  FILM_SPEEDS,
  FILM_TYPES,
  GOALS,
  LOW_LIGHTS,
  SCENES,
  SKIES,
  SUBJECTS,
  SUPPORTS,
  applyParse,
  filmSpeedChoices,
  formToConditions,
  marksAsUsual,
  sceneUsesSky,
  showsSunOptions,
  withSubject,
} from "./testPageForm.ts";
import type { TestForm } from "./testPageForm.ts";

const conditions = (changes: Partial<TestForm>) =>
  formToConditions({ ...(changes.subject ? withSubject(DEFAULT_FORM, changes.subject) : DEFAULT_FORM), ...changes });

describe("the form's starting values", () => {
  it("are the worked example", () => {
    const result = recommend(formToConditions(DEFAULT_FORM)) as Recommendation;
    expect(result.steps[0]).toEqual({ kind: "daylight_value", aperture: "16", shutter: "1/60" });
    expect(result.final).toMatchObject({ aperture: "4", shutter: "1/250" });
    expect(result).not.toHaveProperty("hours");
  });
});

describe("formToConditions", () => {
  it("sends the sky and scene in daylight, and no low-light value", () => {
    expect(conditions({ lightKind: "daylight", sky: "storm", scene: "snow_sand" }).light).toEqual({
      kind: "daylight",
      sky: "storm",
      scene: "snow_sand",
    });
  });

  it("sends the low-light value otherwise, and no sky or scene", () => {
    expect(conditions({ lightKind: "lowlight", lowlight: "floodlit" }).light).toEqual({
      kind: "lowlight",
      lowlight: "floodlit",
    });
  });

  it("drops low sun in low light, where it doesn't apply, even if it was ticked earlier", () => {
    expect(conditions({ lightKind: "daylight", lowSun: true }).lowSun).toBe(true);
    expect(conditions({ lightKind: "lowlight", lowSun: true }).lowSun).toBe(false);
  });

  it("sends the goal shown on the form", () => {
    expect(conditions({ goal: "sharp" }).goal).toBe("sharp");
    expect(conditions({}).goal).toBe("blur");
  });

  it("sends the support shown on the form, which is by hand unless changed", () => {
    expect(DEFAULT_FORM.support).toBe("hand");
    expect(conditions({}).support).toBe("hand");
    expect(conditions({ support: "braced" }).support).toBe("braced");
  });

  it("reads the film", () => {
    expect(conditions({ iso: "800", filmType: "bw_negative" }).film).toEqual({ iso: 800, type: "bw_negative" });
  });

  it("sends no month or hour", () => {
    expect(conditions({})).not.toHaveProperty("month");
    expect(conditions({})).not.toHaveProperty("hour");
  });

  it.each([
    ["", null],
    ["2.5", 2.5],
    ["0.7", 0.7],
    ["0", null],
    ["-1", null],
    ["abc", null],
    ["   ", null],
  ])('reads a distance of "%s" as %s', (typed, meters) => {
    expect(conditions({ distance: typed }).subjectDistanceM).toBe(meters);
  });

  it("carries the sun options", () => {
    expect(conditions({ sunBehindSubject: true, sunAhead: false })).toMatchObject({
      sunBehindSubject: true,
      sunAhead: false,
    });
    expect(conditions({ sunBehindSubject: false, sunAhead: true })).toMatchObject({
      sunBehindSubject: false,
      sunAhead: true,
    });
  });

  it("sends the camera from the answers, starting at the compact test camera", () => {
    expect(conditions({}).camera).toEqual({
      widestAperture: "2.8",
      smallestAperture: "22",
      focalLengthMm: 40,
      fastestShutter: "1/250",
      slowestShutter: "1/15",
      hasBulb: true,
    });
  });
});

describe("your camera", () => {
  const notSureAtAll = {
    widestAperture: NOT_SURE,
    smallestAperture: NOT_SURE,
    focalLengthMm: NOT_SURE,
    fastestShutter: NOT_SURE,
    slowestShutter: NOT_SURE,
    hasBulb: "yes",
  } as const;

  it("Not sure counts as values nearly every manual camera has", () => {
    expect(answersToCamera(notSureAtAll)).toEqual({
      widestAperture: "4",
      smallestAperture: "16",
      focalLengthMm: 50,
      fastestShutter: "1/250",
      slowestShutter: "1/30",
      hasBulb: true,
    });
  });

  it("the fast test camera gives its own settings", () => {
    const next = {
      widestAperture: "1.4",
      smallestAperture: "22",
      focalLengthMm: "50",
      fastestShutter: "1/1000",
      slowestShutter: "1",
      hasBulb: "yes",
    } as const;
    const form: TestForm = { ...DEFAULT_FORM, camera: next };
    expect(recommend(formToConditions(form))).toMatchObject({ final: { shutter: "1/1000" } });
    expect(slowestShutter("surface", answersToCamera(next))).toBe("1");
  });

  it("the AI box never changes the camera", () => {
    const form: TestForm = { ...DEFAULT_FORM, camera: { ...STARTING_CAMERA, widestAperture: "1.4" } };
    const reply: ParseResult = { kind: "new_shot", conditions: { subject: "group", light: { kind: "daylight", sky: "sun", scene: "open" } } };
    expect(applyParse(form, reply, "a group in the sun").form.camera).toEqual(form.camera);
  });

  it("every answer gives valid input and an answer", () => {
    const answers: Array<Partial<TestForm["camera"]>> = [
      ...[...WIDEST_APERTURES, NOT_SURE].map((widestAperture) => ({ widestAperture })),
      ...[...SMALLEST_APERTURES, NOT_SURE].map((smallestAperture) => ({ smallestAperture })),
      ...[...FOCAL_LENGTHS.map(String), NOT_SURE].map((focalLengthMm) => ({ focalLengthMm })),
      ...[...FASTEST_SHUTTERS, NOT_SURE].map((fastestShutter) => ({ fastestShutter })),
      ...[...SLOWEST_SHUTTERS, NOT_SURE].map((slowestShutter) => ({ slowestShutter })),
      { hasBulb: "no" },
    ] as Array<Partial<TestForm["camera"]>>;
    for (const answer of answers) {
      const shot = conditions({ camera: { ...STARTING_CAMERA, ...answer } });
      expect({ answer, validation: validateConditions(shot) }).toEqual({ answer, validation: { ok: true } });
      expect(isRefusal(recommend(shot))).toBe(false);
    }
  });
});

describe("indoors as a Scene", () => {
  const indoor = (scene: TestForm["scene"]) => ({ ...DEFAULT_FORM, scene });

  it("offers the three outdoor scenes, then the four indoor ones", () => {
    expect(SCENES).toEqual([
      "snow_sand",
      "open",
      "under_trees",
      "indoor_window",
      "indoor_room",
      "indoor_lamps",
      "indoor_office",
    ]);
  });

  it("sends the sky for the two scenes that follow the daylight", () => {
    expect(formToConditions({ ...indoor("indoor_window"), sky: "storm" }).light).toEqual({ kind: "indoors", indoor: "window", sky: "storm" });
    expect(formToConditions({ ...indoor("indoor_room"), sky: "sun" }).light).toEqual({ kind: "indoors", indoor: "room", sky: "sun" });
  });

  it("sends no sky for lamps or an office, whatever the control held", () => {
    expect(formToConditions({ ...indoor("indoor_lamps"), sky: "storm" }).light).toEqual({ kind: "indoors", indoor: "lamps" });
    expect(formToConditions({ ...indoor("indoor_office"), sky: "storm" }).light).toEqual({ kind: "indoors", indoor: "office" });
  });

  it("uses the Sky control outdoors and for the two daylight scenes only", () => {
    expect(sceneUsesSky("open")).toBe(true);
    expect(sceneUsesSky("indoor_window")).toBe(true);
    expect(sceneUsesSky("indoor_room")).toBe(true);
    expect(sceneUsesSky("indoor_lamps")).toBe(false);
    expect(sceneUsesSky("indoor_office")).toBe(false);
  });

  it("drops low sun for lamps and an office, where it doesn't apply", () => {
    expect(formToConditions({ ...indoor("indoor_lamps"), lowSun: true }).lowSun).toBe(false);
    expect(formToConditions({ ...indoor("indoor_window"), lowSun: true }).lowSun).toBe(true);
  });

  it("hides the sun tick boxes in all four", () => {
    for (const scene of ["indoor_window", "indoor_room", "indoor_lamps", "indoor_office"] as const) {
      expect(showsSunOptions(indoor(scene))).toBe(false);
    }
  });

  it("evening or night ignores the indoor scene and uses the low-light list", () => {
    const form: TestForm = { ...indoor("indoor_window"), lightKind: "lowlight", lowlight: "home_lamps" };
    expect(formToConditions(form).light).toEqual({ kind: "lowlight", lowlight: "home_lamps" });
  });

  it("an AI reply naming lamps or an office doesn't ask for the sky", () => {
    const reply: ParseResult = { kind: "new_shot", conditions: { light: { scene: "indoor_lamps" }, subject: "group" } };
    const { form, notSaid } = applyParse(DEFAULT_FORM, reply, "indoors with lamps");
    expect(form).toMatchObject({ lightKind: "daylight", scene: "indoor_lamps" });
    expect(notSaid).not.toContain("sky");
  });

  it("an AI reply naming a window scene says the sky wasn't given", () => {
    const reply: ParseResult = { kind: "new_shot", conditions: { light: { scene: "indoor_window" }, subject: "group" } };
    expect(applyParse(DEFAULT_FORM, reply, "by a window").notSaid).toContain("sky");
  });
});

describe("the sun tick boxes show only when the sun can be seen", () => {
  const daylight = (sky: TestForm["sky"]) => ({ ...DEFAULT_FORM, lightKind: "daylight" as const, sky });
  const lowLight = (lowlight: TestForm["lowlight"]) => ({ ...DEFAULT_FORM, lightKind: "lowlight" as const, lowlight });

  it.each([
    ["sun", true],
    ["sun_haze", true],
    ["sun_behind_clouds", true],
    ["overcast", false],
    ["storm", false],
  ] as const)("daylight, %s: %s", (sky, shown) => {
    expect(showsSunOptions(daylight(sky))).toBe(shown);
  });

  it.each([
    ["sun_low", true],
    ["sun_just_set", false],
    ["dusk", false],
    ["street_night", false],
    ["home_lamps", false],
    ["floodlit", false],
  ] as const)("low light, %s: %s", (lowlight, shown) => {
    expect(showsSunOptions(lowLight(lowlight))).toBe(shown);
  });

  const everyLight = [...SKIES.map(daylight), ...LOW_LIGHTS.map(lowLight)];

  it("agrees with when the engine gives the flare warning", () => {
    for (const form of everyLight) {
      const result = recommend(formToConditions({ ...form, sunAhead: true })) as Recommendation;
      const warned = result.warnings.some((warning) => warning.code === "flare_risk");
      expect({ form, warned }).toEqual({ form, warned: showsSunOptions(form) });
    }
  });

  it("hiding them can't change the advice, because the engine ignores them there", () => {
    const hidden = everyLight.filter((form) => !showsSunOptions(form));
    expect(hidden).toHaveLength(7);
    for (const form of hidden) {
      for (const subject of SUBJECTS) {
        const clear = { ...form, subject, distance: "2", sunAhead: false, sunBehindSubject: false };
        const ticked = { ...clear, sunAhead: true, sunBehindSubject: true };
        expect(recommend(formToConditions(ticked))).toEqual(recommend(formToConditions(clear)));
      }
    }
  });
});

describe("the goal follows the subject", () => {
  it.each([
    ["portrait", "blur"],
    ["two_people", "sharp"],
    ["group", "sharp"],
    ["landscape", "sharp"],
    ["other", "sharp"],
  ] as const)("choosing %s selects %s", (subject, goal) => {
    expect(withSubject(DEFAULT_FORM, subject)).toMatchObject({ subject, goal });
  });

  it.each([
    ["portrait", ["blur"]],
    ["landscape", ["sharp"]],
    ["two_people", ["sharp"]],
    ["group", ["sharp"]],
    ["other", ["sharp"]],
  ] as const)("for %s the list marks %j as usual", (subject, marked) => {
    expect(GOALS.filter((goal) => marksAsUsual(goal, subject))).toEqual(marked);
  });

  it("a goal picked by hand stays until the subject changes", () => {
    const picked: TestForm = { ...DEFAULT_FORM, goal: "moving" };
    expect(formToConditions(picked).goal).toBe("moving");
    expect(withSubject(picked, "landscape").goal).toBe("sharp");
  });

  it("changing the subject changes nothing else", () => {
    const { subject: _subject, goal: _goal, ...rest } = withSubject(DEFAULT_FORM, "group");
    const { subject: _s, goal: _g, ...before } = DEFAULT_FORM;
    expect(rest).toEqual(before);
  });

  it("the settings for a subject and goal are the same as when the engine picks the goal itself", () => {
    for (const subject of SUBJECTS) {
      const form = { ...withSubject(DEFAULT_FORM, subject), distance: "2" };
      const { goal: _goal, ...withoutGoal } = formToConditions(form);
      expect(recommend(formToConditions(form))).toEqual(recommend(withoutGoal));
    }
  });

  it("an AI reply with no goal uses the usual one for the subject it names", () => {
    const reply: ParseResult = { kind: "new_shot", conditions: { subject: "landscape" } };
    const { form, notSaid } = applyParse({ ...DEFAULT_FORM, goal: "moving" }, reply, "a landscape");
    expect(form.goal).toBe("sharp");
    expect(notSaid).toContain("goal");
  });

  it("an AI reply naming neither uses the usual one for the subject already chosen", () => {
    const reply: ParseResult = { kind: "new_shot", conditions: { light: { sky: "sun" } } };
    const earlier: TestForm = { ...withSubject(DEFAULT_FORM, "group"), goal: "moving" };
    expect(applyParse(earlier, reply, "sunny").form.goal).toBe("sharp");
  });

  it("an AI reply naming a goal uses it", () => {
    const reply: ParseResult = { kind: "new_shot", conditions: { subject: "landscape", goal: "blur" } };
    expect(applyParse(DEFAULT_FORM, reply, "x").form.goal).toBe("blur");
  });
});

describe("the film types", () => {
  it("are colour, black and white, and slide, which the app refuses", () => {
    expect(FILM_TYPES).toEqual(["color_negative", "bw_negative", "slide"]);
  });
});

describe("the starter set: what a correct reply does to the form", () => {
  type Case = {
    id: string;
    utterance: string;
    sampleReply: ParseResult;
    expectForm?: Partial<TestForm>;
    expectFinal?: { aperture: string; shutter: string };
    expectNotSaid?: string[];
    expectUnchanged?: boolean;
    expectNotice?: string;
  };

  for (const item of starter.cases as unknown as Case[]) {
    describe(item.id, () => {
      const report = applyParse(DEFAULT_FORM, item.sampleReply, item.utterance);

      it("the sample reply fits the schema", () => {
        expect(validateParse(item.sampleReply)).toEqual({ ok: true });
      });

      if (item.expectForm) {
        it("fills the controls", () => {
          expect(report.form).toMatchObject(item.expectForm!);
        });
      }
      if (item.expectUnchanged) {
        it("leaves the controls alone", () => {
          expect(report.form).toEqual(DEFAULT_FORM);
          expect(report.notSaid).toEqual([]);
        });
      }
      if (item.expectNotice) {
        it("explains itself", () => {
          expect(report.notice).toBe(item.expectNotice);
        });
      } else {
        it("needs no explanation", () => {
          expect(report.notice).toBeNull();
        });
      }
      if (item.expectNotSaid) {
        it("lists what wasn't said", () => {
          expect([...report.notSaid].sort()).toEqual([...item.expectNotSaid!].sort());
        });
      }
      if (item.expectFinal) {
        it("gives the settings from the engine", () => {
          const result = recommend(formToConditions(report.form)) as Recommendation;
          expect(result.final).toMatchObject(item.expectFinal!);
        });
      }
    });
  }
});

describe("applyParse", () => {
  const shot = (conditions: NonNullable<ParseResult["conditions"]>, rest: Partial<ParseResult> = {}): ParseResult => ({
    kind: "new_shot",
    conditions,
    ...rest,
  });

  it("treats each description as a new scene: what it doesn't say goes back to the default", () => {
    const earlier: TestForm = {
      ...DEFAULT_FORM,
      goal: "moving",
      distance: "3",
      support: "surface",
      lowSun: true,
      sunBehindSubject: true,
      sunAhead: true,
    };
    const { form } = applyParse(earlier, shot({ subject: "group" }), "a group");
    expect(form).toMatchObject({
      goal: "sharp",
      distance: "",
      support: "hand",
      lowSun: false,
      sunBehindSubject: false,
      sunAhead: false,
    });
  });

  it("keeps the light, subject and film speed when they aren't said, and says so", () => {
    const earlier: TestForm = { ...DEFAULT_FORM, sky: "storm", scene: "snow_sand", subject: "group", iso: "800" };
    const { form, notSaid } = applyParse(earlier, shot({ goal: "sharp" }), "everything sharp");
    expect(form).toMatchObject({ sky: "storm", scene: "snow_sand", subject: "group", iso: "800", goal: "sharp" });
    expect(notSaid).toEqual(expect.arrayContaining(["light", "subject", "iso"]));
  });

  it("moves to low light when the description does", () => {
    const { form } = applyParse(DEFAULT_FORM, shot({ light: { kind: "lowlight", lowlight: "dusk" } }), "dusk");
    expect(form).toMatchObject({ lightKind: "lowlight", lowlight: "dusk" });
  });

  it("moves back to daylight when the description does", () => {
    const earlier: TestForm = { ...DEFAULT_FORM, lightKind: "lowlight" };
    const { form } = applyParse(earlier, shot({ light: { sky: "sun", scene: "open" } }), "sunny park");
    expect(form).toMatchObject({ lightKind: "daylight", sky: "sun", scene: "open" });
  });

  it("names the part of the daylight that wasn't said", () => {
    const sky = applyParse(DEFAULT_FORM, shot({ light: { sky: "sun" } }), "sunny");
    expect(sky.form.scene).toBe(DEFAULT_FORM.scene);
    expect(sky.notSaid).toContain("scene");
    expect(sky.notSaid).not.toContain("light");

    const scene = applyParse(DEFAULT_FORM, shot({ light: { scene: "snow_sand" } }), "on the beach");
    expect(scene.form.sky).toBe(DEFAULT_FORM.sky);
    expect(scene.notSaid).toContain("sky");
  });

  it("reads the distance and the booleans", () => {
    const { form } = applyParse(
      DEFAULT_FORM,
      shot({ subject: "other", subjectDistanceM: 2.5, lowSun: true, sunBehindSubject: true, sunAhead: true }),
      "2.5 metres",
    );
    expect(form).toMatchObject({ subject: "other", distance: "2.5", lowSun: true, sunBehindSubject: true, sunAhead: true });
  });

  it("accepts a film speed the list doesn't have, and the control can show it", () => {
    const { form } = applyParse(DEFAULT_FORM, shot({ film: { iso: 640, type: "color_negative" } }), "ISO 640");
    expect(form.iso).toBe("640");
    expect(filmSpeedChoices(form.iso)).toContain(640);
    expect(filmSpeedChoices("400")).toEqual(FILM_SPEEDS);
    const withExtra = filmSpeedChoices("640");
    expect(withExtra).toEqual([...withExtra].sort((a, b) => a - b));
  });

  it("a film type on its own changes the type and not the speed", () => {
    const { form, notSaid } = applyParse(DEFAULT_FORM, shot({ film: { iso: null, type: "bw_negative" } }), "black and white");
    expect(form).toMatchObject({ iso: DEFAULT_FORM.iso, filmType: "bw_negative" });
    expect(notSaid).toContain("iso");
  });

  describe("kinds that aren't a new shot leave everything alone", () => {
    it.each([
      ["what_if", "follow_up"],
      ["question", "follow_up"],
      ["camera_howto", "follow_up"],
      ["out_of_scope", "out_of_scope"],
    ] as const)("%s", (kind, notice) => {
      const report = applyParse(DEFAULT_FORM, { kind, conditions: { subject: "group" } }, "x");
      expect(report.form).toEqual(DEFAULT_FORM);
      expect(report.notice).toBe(notice);
      expect(report.assumptions).toEqual([]);
    });
  });

  describe("assumptions", () => {
    it("carries the AI's reason", () => {
      const report = applyParse(
        DEFAULT_FORM,
        shot({ lowSun: true }, { assumptions: [{ field: "lowSun", value: true, why: "said 'winter in Sweden'" }] }),
        "winter in Sweden",
      );
      expect(report.assumptions).toEqual([{ field: "lowSun", why: "said 'winter in Sweden'" }]);
    });

    it("keeps numbers the person said", () => {
      const report = applyParse(
        DEFAULT_FORM,
        shot({}, { assumptions: [{ field: "film", why: "said 'UltraMax 400'" }] }),
        "UltraMax 400, a group",
      );
      expect(report.assumptions[0].why).toBe("said 'UltraMax 400'");
    });

    it("drops a reason holding a number the person never said, as settings may only come from the engine", () => {
      const report = applyParse(
        DEFAULT_FORM,
        shot({}, { assumptions: [{ field: "goal", why: "use f/8 at 1/125 for this" }] }),
        "a group in the sun",
      );
      expect(report.assumptions).toEqual([{ field: "goal", why: null }]);
    });
  });
});

describe("every choice on the form gives valid input", () => {
  const each: Array<Partial<TestForm>> = [
    ...SKIES.map((sky) => ({ sky })),
    ...SCENES.map((scene) => ({ scene })),
    ...LOW_LIGHTS.map((lowlight) => ({ lightKind: "lowlight" as const, lowlight })),
    ...SUBJECTS.map((subject) => ({ subject, distance: subject === "other" ? "2" : "" })),
    ...GOALS.map((goal) => ({ goal })),
    ...SUPPORTS.map((support) => ({ support })),
    ...FILM_SPEEDS.map((iso) => ({ iso: String(iso) })),
    ...FILM_TYPES.map((filmType) => ({ filmType })),
  ];

  it("passes the schema", () => {
    for (const change of each) {
      expect({ change, validation: validateConditions(conditions(change)) }).toEqual({
        change,
        validation: { ok: true },
      });
    }
  });

  it("an answer or a clear refusal, never a crash", () => {
    for (const change of each) {
      const result = recommend(conditions(change));
      expect(isRefusal(result) || result.final.aperture.length > 0).toBe(true);
    }
  });

  it("has an option for the film refusal, and gives advice for every film speed", () => {
    expect(recommend(conditions({ filmType: "slide" }))).toEqual({ refused: "unsupported_film" });
    expect(isRefusal(recommend(conditions({ iso: "10" })))).toBe(false);
  });

  it("subject other with no distance is refused, and asks for the distance", () => {
    expect(recommend(conditions({ subject: "other", distance: "" }))).toEqual({ refused: "missing_distance" });
  });
});
