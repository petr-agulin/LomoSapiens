import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { recommend } from "../lib/engine/index.ts";
import type { Conditions } from "../lib/engine/index.ts";
import { ParseReportPanel } from "./DescribeBox";
import { ResultPanel } from "./ResultPanel";
import TestPage from "./TestPage";
import {
  DEFAULT_FORM,
  FILM_SPEEDS,
  GOALS,
  LOW_LIGHTS,
  SCENES,
  STARTING_CAMERA,
  SKIES,
  SUBJECTS,
  SUPPORTS,
  formToConditions,
  withSubject,
} from "./testPageForm.ts";
import type { TestForm } from "./testPageForm.ts";

// Text as a person reads it: tags removed, the few entities React escapes restored.
const readable = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

const conditions = (changes: Partial<TestForm>) =>
  formToConditions({ ...(changes.subject ? withSubject(DEFAULT_FORM, changes.subject) : DEFAULT_FORM), ...changes });

function panel(input: Conditions) {
  return readable(renderToStaticMarkup(<ResultPanel conditions={input} result={recommend(input)} />));
}
const show = (changes: Partial<TestForm>) => panel(conditions(changes));

describe("the page", () => {
  const page = renderToStaticMarkup(<TestPage />);
  const text = readable(page);

  it("replaces the placeholder and says it is independent", () => {
    expect(text).toContain("LomoSapiens");
    expect(text).toContain("An independent project, not affiliated with LOMO or Lomography.");
    expect(text).not.toContain("Camera advice comes next");
  });

  it.each([
    "Time of day",
    "Sky",
    "Scene",
    "Subject",
    "Distance in metres",
    "Goal",
    "Film speed (ISO)",
    "Film type",
    "Low sun",
    "Sun behind the subject",
    "Sun ahead of the camera",
    "Camera support",
    "Widest aperture",
    "Smallest aperture",
    "Focal length",
    "Fastest shutter",
    "Slowest shutter, before B",
    "B on the shutter dial",
  ])("has the %s control", (label) => {
    expect(text).toContain(label);
  });

  it("has no Month or Hour, and no hours section in the advice", () => {
    expect(page).not.toMatch(/>(Month|Hour)<\/label>/);
    expect(text).not.toContain("Daylight table hours");
    expect(text).not.toContain("daylight table's hours");
  });

  it("names no camera model and no camera manual, apart from the app's name and the independence note", () => {
    const rest = text.replace(/LomoSapiens/g, "").replace("not affiliated with LOMO or Lomography", "");
    expect(rest).not.toMatch(/LOMO|135M|1982|camera manual|manual's/i);
  });

  it("asks about your camera first, starting at the compact test camera without naming it, with Not sure on each list but B", () => {
    expect(text.indexOf("Your camera")).toBeLessThan(text.indexOf("The shot"));
    expect(text).toContain("Read these off your camera, once. Not sure uses a value nearly every manual camera has.");
    expect(page).toContain('<option value="2.8" selected="">f/2.8</option>');
    expect(page).toContain('<option value="22" selected="">f/22</option>');
    expect(page).toContain('<option value="40" selected="">40 mm</option>');
    expect(page).toContain('<option value="1/15" selected="">1/15</option>');
    expect(page).toContain('<option value="yes" selected="">Yes</option>');
    for (const notSure of ["f/4", "f/16", "50 mm", "1/250", "1/30"]) {
      expect(page).toContain(`>Not sure (counts as ${notSure})</option>`);
    }
    expect(page.match(/>Not sure \(counts as /g)).toHaveLength(5);
    expect(text).toContain("On the front of the lens: 1:2 means f/2.");
    // f/1.7 and f/1.8 are separate choices, and f/4.5 and f/5.6 lenses are covered.
    for (const mark of ["1.7", "1.8", "4.5", "5.6"]) expect(page).toContain(`>f/${mark}</option>`);
    expect(page).not.toContain("f/1.7–1.8");
    expect(page).toContain(">1 s</option>");
  });

  it("names each sky with Kodak's description, and has one scene for snow or sand", () => {
    for (const name of ["Sun - ", "Sun in haze - ", "Sun behind clouds - ", "Overcast - ", "Storm clouds - "]) expect(text).toContain(name);
    for (const name of ["Snow or sand - ", "Open terrain - ", "Under trees - "]) expect(text).toContain(name);
    expect(text).not.toContain("Beach - ");
  });

  it("asks for the time of day, and says what each choice means", () => {
    expect(page).toMatch(/<label for="([^"]+)">Time of day<\/label>/);
    const id = page.match(/<label for="([^"]+)">Time of day<\/label>/)![1];
    expect(page).toContain(`<select id="${id}"`);
    expect(page).toContain(">Daytime - Daylight in any weather, or indoors</option>");
    expect(page).toContain(">Twilight or night - Daylight fading or not yet full, or dark</option>");
    // Clouds hide the sun but don't make it evening, so neither option depends on seeing the sun.
    expect(page).not.toMatch(/<option[^>]*>(Daytime|Twilight or night) - [^<]*\bSun\b/);
  });

  describe("the ? beside Time of day", () => {
    const button = page.match(/<button[^>]*aria-label="Explain Time of day"[^>]*>/)?.[0] ?? "";
    const panelId = button.match(/aria-controls="([^"]+)"/)?.[1] ?? "missing";
    const panel = page.match(new RegExp(`<div[^>]*id="${panelId}"[^>]*>.*?</div>`))?.[0] ?? "";

    it("is a button that starts closed", () => {
      expect(button).toContain('type="button"');
      expect(button).toContain('aria-expanded="false"');
      expect(panel).toContain("hidden");
    });

    it("is not part of the field's name", () => {
      expect(page).not.toMatch(/<label[^>]*>[^<]*Time of day[^<]*<button/);
    });

    it("explains why the question exists and what each choice does", () => {
      const words = readable(panel);
      expect(words).toContain("Why this question?");
      expect(words).toContain("Daytime: the app starts from the daylight table.");
      expect(words).toContain("Twilight or night: the daylight table doesn't cover this light, morning or evening.");
      expect(words).not.toContain("symbols");
      expect(words).toContain("These are estimates.");
      expect(words).toContain("Indoors after dark, choose Twilight or night.");
    });

    it("says when Kodak's daylight table applies, in Kodak's terms, with no camera manual", () => {
      const words = readable(panel);
      expect(words).toContain("Kodak's daylight table is meant for about 2 hours after sunrise to 2 hours before sunset.");
      expect(words).not.toMatch(/1982|manual|April|September/);
    });

    it("is the only ? on the page for now", () => {
      expect(page.match(/aria-label="Explain /g)).toHaveLength(1);
    });
  });

  it("says the distance is needed for the subject Other, and optional for the rest", () => {
    expect(text).toContain(
      'Needed when Subject is "Other". For Portrait, Two people, Group or Landscape, it\'s optional and replaces the usual focus distance.',
    );
    expect(text).not.toContain("Needed for Other.");
  });

  it("asks for the camera support you have, says what each allows, and starts by hand", () => {
    expect(page).toMatch(/<label for="[^"]+">Camera support<\/label>/);
    expect(page).toMatch(/<option value="hand" selected="">By hand - 1\/60 or faster<\/option>/);
    expect(page).toContain(">Braced - Down to 1/30</option>");
    expect(page).toContain(">On a surface - Down to 1/15, or B</option>");
    expect(text).not.toContain("Let the app decide");
  });

  it("marks the subject's usual goal, with no second line for the same goal", () => {
    expect(text).toContain("Blurred background (usual for selected subject)");
    expect(text).not.toContain("Default:");
    for (const goal of ["Everything sharp", "Moving subject"]) expect(text).toContain(goal);
    expect(text).not.toContain("No preference");
    expect(page.match(/<option[^>]*>Blurred background[^<]*<\/option>/g)).toHaveLength(1);
  });

  it("starts with the example from the scope already worked out", () => {
    expect(text).toContain("f/4, 1/250");
  });

  it("selects the starting values", () => {
    expect(page).toMatch(/<option value="sun_behind_clouds" selected="">/);
    expect(page).toMatch(/<option value="open" selected="">/);
    expect(page).toMatch(/<option value="400" selected="">/);
  });

  it("hides the low-light choice and shows the sky in daylight", () => {
    expect(text).not.toContain("What the light looks like");
    expect(renderToStaticMarkup(<TestPage />)).toContain("Sky");
  });
});

describe("the AI box", () => {
  const page = renderToStaticMarkup(<TestPage />);
  const text = readable(page);

  it("has a text box and the provider's fields", () => {
    for (const label of ["Describe the shot", "Provider address", "Model", "API key"]) expect(text).toContain(label);
    expect(page).toContain("<textarea");
    expect(page).toMatch(/type="password"/);
  });

  it("starts with the default provider and model", () => {
    expect(page).toContain('value="https://generativelanguage.googleapis.com/v1beta/openai"');
    expect(page).toContain('value="gemini-3.5-flash-lite"');
  });

  it("says where the key and the words go, and that the controls work without it", () => {
    expect(text).toContain("Your key stays in this browser tab");
    expect(text).toContain("The controls below work without it.");
  });

  it("shows no Forget key button when there is no key to forget", () => {
    expect(text).not.toContain("Forget key");
  });

  it("does not ask for film names", () => {
    expect(text).not.toContain("chromogenic");
    for (const name of ["Colour", "Black and white", "Slide"]) expect(text).toContain(name);
  });
});

describe("what the AI understood", () => {
  const report = (changes: Partial<Parameters<typeof ParseReportPanel>[0]["report"]>) =>
    readable(
      renderToStaticMarkup(
        <ParseReportPanel report={{ form: DEFAULT_FORM, notSaid: [], assumptions: [], notice: null, ...changes }} />,
      ),
    );

  it("says to check the controls", () => {
    expect(report({})).toContain("The controls below now show what the AI understood. You can change any of them.");
  });

  it("lists assumptions by the page's own names, with the reason", () => {
    const text = report({ assumptions: [{ field: "lowSun", why: "said 'winter in Sweden'" }] });
    expect(text).toContain("What the AI assumed");
    expect(text).toContain("Low sun: said 'winter in Sweden'");
  });

  it("copes with an assumption it can't name, or one with its reason dropped", () => {
    expect(report({ assumptions: [{ field: "film.type", why: null }] })).toContain("Film type");
    expect(report({ assumptions: [{ field: "mystery", why: "because" }] })).toContain("because");
  });

  it("lists what wasn't said, and what happens instead", () => {
    const text = report({ notSaid: ["subject", "iso", "goal", "distance", "support", "light", "sky", "scene"] });
    expect(text).toContain("Not in your description");
    expect(text).toContain("Subject: left as it was");
    expect(text).toContain("Film speed: left as it was");
    expect(text).toContain("Goal: the usual one for this subject");
    expect(text).toContain("Distance: the usual one for this subject");
    expect(text).toContain("Camera support: by hand");
    expect(text).not.toContain("Month");
    expect(text).not.toContain("Hour");
    expect(text).toContain("Light: left as it was");
    expect(text).toContain("Sky: left as it was");
    expect(text).toContain("Scene: left as it was");
  });

  it("refuses what isn't about a shot, in the agreed words", () => {
    const text = report({ notice: "out_of_scope" });
    expect(text).toContain("My knowledge base has no answer to this. I can help with exposure, focus, film and handling the camera.");
    expect(text).not.toContain("now show what the AI understood");
  });

  it("says follow-up questions come later", () => {
    const text = report({ notice: "follow_up" });
    expect(text).toContain("Follow-up questions come in a later version. For now, describe a shot.");
    expect(text).not.toContain("now show what the AI understood");
  });

});

describe("the Sky options", () => {
  const page = renderToStaticMarkup(<TestPage />);

  it.each([
    "Sun - Distinct shadows",
    "Sun in haze - Soft shadows",
    "Sun behind clouds - No shadows",
    "Overcast - Heavy cloud",
    "Storm clouds - Darker than heavy cloud",
  ])("shows %s", (option) => {
    expect(page).toContain(`>${option}</option>`);
  });

  it("name no shutter", () => {
    expect(page).not.toMatch(/<option[^>]*>[^<]* - Shutter /);
  });
});

describe("the Scene options", () => {
  const text = readable(renderToStaticMarkup(<TestPage />));

  it.each([
    "Snow or sand - Snowy fields, ski slopes, beaches, dunes",
    "Open terrain - Streets, squares, parks, fields, gardens",
    "Under trees - Forest, shade, building's shadow, porch",
    "Indoors by a window - Apartment, cafe, next to the glass",
    "Indoors away from a window - Apartment, middle of a room",
    "Indoors with lamps - No daylight, lamps only",
    "Office or shop - School, bright ceiling lights",
  ])("shows %s", (option) => {
    expect(text).toContain(option);
  });

  it("name no aperture", () => {
    expect(text).not.toMatch(/ - Aperture /);
  });

  it("keeps one short note: what to do when torn", () => {
    expect(text).toContain("If you're torn between two scenes, pick the darker one.");
    expect(text).not.toContain("These are the camera's own settings");
  });

  it("no longer has the examples or the older notes under the fields", () => {
    expect(text).not.toContain("Each shutter speed is what");
    expect(text).not.toContain("Each aperture is what");
    expect(text).not.toContain("Open terrain: streets");
  });
});

describe("the Subject options", () => {
  const text = readable(renderToStaticMarkup(<TestPage />));

  it.each([
    "Portrait - One person, head and shoulders - About 1 m",
    "Two people - Head and shoulders - About 1.4 m",
    "Group - Three or more, standing - About 4 m",
    "Landscape - Views, distant buildings - Focus keeps ∞ sharp",
    "Other - Anything else - Enter the distance below",
  ])("shows %s with a 40 mm lens", (option) => {
    expect(text).toContain(option);
  });

  it("follow the lens: with 50 mm, a step further back", () => {
    const fifty = readable(
      renderToStaticMarkup(<TestPage initialForm={{ ...DEFAULT_FORM, camera: { ...STARTING_CAMERA, focalLengthMm: "50" } }} />),
    );
    expect(fifty).toContain("Portrait - One person, head and shoulders - About 1.3 m");
    expect(fifty).toContain("Two people - Head and shoulders - About 1.8 m");
    expect(fifty).toContain("Group - Three or more, standing - About 5 m");
  });
});

describe("the Light options", () => {
  it("are Daytime, and Twilight or night", () => {
    const text = readable(renderToStaticMarkup(<TestPage />));
    expect(text).toContain("Daytime");
    expect(text).toContain("Twilight or night");
    expect(text).not.toContain("Evening, night or indoors");
  });
});

describe("indoor results", () => {
  const indoor = (scene: TestForm["scene"], changes: Partial<TestForm> = {}) =>
    show({ scene, subject: "group", lowSun: false, ...changes });

  it("start from the estimate, with nothing about a camera's own answer", () => {
    const text = indoor("indoor_window");
    expect(text).toContain("How the app got there Estimated light for this room");
    expect(text).not.toContain("camera's answer");
    expect(text).not.toContain("helper");
  });

  it("are marked as estimates", () => {
    for (const scene of ["indoor_window", "indoor_room", "indoor_lamps", "indoor_office"] as const) {
      expect(indoor(scene)).toContain("Final settings Estimate");
    }
  });

  it("explain the reasoning in words", () => {
    expect(indoor("indoor_window")).toContain("Estimated light for this room: f/2.8, 1/60");
    expect(indoor("indoor_lamps", { support: "surface" })).toContain("Published value for this light (estimate): f/2.8, 1/15");
    expect(indoor("indoor_window", { sky: "storm", support: "braced" })).toContain("Storm clouds outside (estimate), 1 extra step: f/2.8, 1/30");
  });
});

describe("low sun", () => {
  it("says what it means: how low the sun sits, not whether it can be seen", () => {
    expect(readable(renderToStaticMarkup(<TestPage />))).toContain("Low sun (winter far north, or long shadows)");
  });

  it("still adds 1 step under an overcast sky", () => {
    const overcast = { sky: "overcast", scene: "open", subject: "group", support: "hand" } as const;
    expect(show({ ...overcast, lowSun: false })).toContain("f/8, 1/125");
    const withLowSun = show({ ...overcast, lowSun: true });
    expect(withLowSun).toContain("Low sun (estimate), 1 extra step");
    expect(withLowSun).toContain("Same light, at a shutter your support allows: f/8, 1/60");
  });
});

describe("handling advice follows the support", () => {
  it("on B, no hold time", () => {
    const text = show({ lightKind: "lowlight", lowlight: "floodlit", subject: "landscape", support: "surface" });
    expect(text).toContain("Camera on a surface. Use a cable release if you have one.");
    expect(text).not.toContain("after the click");
  });

  it("on a surface at 1/30, not camera to face", () => {
    const text = show({ sky: "overcast", scene: "open", subject: "group", lowSun: false, support: "surface" });
    expect(text).toContain("1/30");
    expect(text).toContain("Camera on a surface, hold the button about 1 s after the click (estimate).");
    expect(text).not.toContain("Camera to face");
  });

  it("by hand at 1/60, camera to face", () => {
    const text = show({ lightKind: "lowlight", lowlight: "sun_just_set", subject: "group" });
    expect(text).toContain("Camera to face");
  });

  it("at 1/250, no handling section at all", () => {
    const text = show({});
    expect(text).toContain("1/250");
    expect(text).not.toContain("Handling");
    expect(text).not.toContain("Smooth press");
  });

  it("at 1/125, the section is back", () => {
    const text = show({ sky: "overcast", scene: "open", subject: "landscape", lowSun: false });
    expect(text).toContain("1/125");
    expect(text).toContain("Handling");
    expect(text).toContain("Smooth press, elbows tucked.");
  });
});

describe("the result, in the order of the plan", () => {
  const text = show({});

  it("names the camera's settings it used, and nothing about a film speed dial", () => {
    expect(text).toContain("For your camera: f/2.8–f/22, 40 mm, 1/15–1/250, B");
    expect(text).not.toContain("ASA");
  });

  it("shows the camera, each step, the final settings, sharp zone and warnings, in order, with no handling at 1/250", () => {
    const expected = [
      "For your camera",
      "How the app got there",
      "Kodak's table for this sky and scene: f/16, 1/60",
      "Low sun (estimate), 1 extra step: f/11, 1/60",
      "Same light, adjusted for your goal: f/5.6, 1/250",
      "Blurred background, 1 extra step: f/4, 1/250",
      "Final settings",
      "f/4",
      "1/250",
      "1 m, the usual distance for this subject (estimate)",
      "0.93–1.08 m",
      "By hand",
      "Warnings",
      "This value is an estimate.",
      "Measure the distance carefully.",
    ];
    let position = 0;
    for (const part of expected) {
      const found = text.indexOf(part, position);
      expect(found, `"${part}" should come next`).toBeGreaterThanOrEqual(0);
      position = found + part.length;
    }
  });

  it("marks an estimate, and only an estimate", () => {
    expect(text).toContain("Final settings Estimate");
    expect(show({ sky: "sun", scene: "open", subject: "group", lowSun: false })).not.toContain("Estimate");
  });

  it("says nothing about a camera's own symbols or answer", () => {
    expect(text).not.toContain("symbols");
    expect(text).not.toContain("camera's answer");
  });
});

describe("other results", () => {
  it("starts from a faster shutter when the light needs more than the smallest aperture", () => {
    const text = show({ iso: "800", sky: "overcast", scene: "snow_sand", subject: "group", lowSun: false, support: "hand" });
    expect(text).toContain("How the app got there Kodak's table for this sky and scene: f/22, 1/60");
    expect(text).not.toContain("symbol");
  });

  it("in low light, starts from the published value", () => {
    const text = show({ lightKind: "lowlight", lowlight: "floodlit", subject: "landscape" });
    expect(text).toContain("How the app got there Published value for this light (estimate)");
    expect(text).not.toContain("helper");
  });

  it("shows B with the seconds and tells you to count them", () => {
    const text = show({ lightKind: "lowlight", lowlight: "floodlit", subject: "landscape", support: "surface" });
    expect(text).toContain("f/5.6");
    expect(text).toContain("B for 1 s");
    expect(text).toContain("Hold the button for 1 second.");
  });

  it("shows infinity for focus and for the sharp zone", () => {
    const text = show({ iso: "25", sky: "sun_behind_clouds", scene: "open", subject: "landscape", lowSun: false });
    expect(text).toContain("Focus ∞ Sharp zone 13.37 m to ∞");
  });

  it("gives a landscape's focus as a round distance that keeps infinity sharp", () => {
    const text = show({ sky: "overcast", scene: "open", subject: "landscape", lowSun: false });
    expect(text).toContain("10 m or the next mark beyond it, so ∞ stays sharp");
    expect(text).toContain("4.01 m to ∞");
  });

  it("labels a usual distance as an estimate, and a given one plainly", () => {
    expect(show({ subject: "two_people", lowSun: false })).toContain("1.4 m, the usual distance for this subject (estimate)");
    expect(show({ subject: "portrait", distance: "2", lowSun: false })).toContain("Focus 2 m Sharp zone");
  });

  it("asks to check the lens below 1 m, rather than refusing the distance", () => {
    const text = show({ subject: "portrait", distance: "0.7", lowSun: false });
    expect(text).toContain("Focus 0.7 m");
    expect(text).toContain("Check that your lens focuses this close.");
  });

  it("asks the same when a wide lens's usual distance is below 1 m", () => {
    const text = show({ camera: { ...STARTING_CAMERA, focalLengthMm: "28" }, subject: "portrait", lowSun: false });
    expect(text).toContain("0.7 m, the usual distance for this subject (estimate)");
    expect(text).toContain("Check that your lens focuses this close.");
  });

  it("keeps the support the user chose, even when the light is too dim for it", () => {
    const text = show({ lightKind: "lowlight", lowlight: "home_lamps", subject: "group" });
    expect(text).toContain("Support By hand");
    expect(text).not.toContain("so the app chose this");
  });

  it("says how far short the light falls, and the settings for the support that would reach it", () => {
    const text = show({ lightKind: "lowlight", lowlight: "home_lamps", subject: "group", support: "hand" });
    expect(text).toContain("Not enough light: 2 steps short. On a surface: f/2.8, 1/15.");
    expect(text).toContain("Published value for this light (estimate): no matching setting");
    expect(text).toContain("The most light your support allows: f/2.8, 1/60");
  });

  it("suggests bracing when that is enough", () => {
    const text = show({ lightKind: "lowlight", lowlight: "street_night", iso: "200", subject: "group", support: "hand" });
    expect(text).toContain("Not enough light: 1 step short. Braced: f/2.8, 1/30.");
  });

  it("suggests B on a surface when only that reaches the light", () => {
    const text = show({ lightKind: "lowlight", lowlight: "floodlit", subject: "landscape", support: "braced" });
    expect(text).toContain("Not enough light: 3 steps short. On a surface: f/5.6, B for 1 s.");
  });

  it("falling short in daylight gives the settings for the support that would reach the light", () => {
    const text = show({ iso: "25", sky: "storm", scene: "under_trees", subject: "group", lowSun: false, support: "hand" });
    expect(text).toContain("Not enough light: 2 steps short. On a surface: f/2.8, 1/15.");
  });

  it("on a camera without B, says when no support would reach the light", () => {
    const text = show({ camera: { ...STARTING_CAMERA, hasBulb: "no" }, lightKind: "lowlight", lowlight: "floodlit", subject: "landscape", support: "surface" });
    expect(text).toContain("Not enough light: 2 steps short, and no support on this camera would reach it.");
    expect(text).not.toContain("B for");
  });

  it("labels storm clouds, and snow or sand outside sun, as estimates", () => {
    expect(show({ sky: "storm", scene: "open", subject: "group", lowSun: false })).toContain("This value is an estimate.");
    expect(show({ sky: "overcast", scene: "snow_sand", subject: "group", lowSun: false })).toContain("This value is an estimate.");
  });

  it("says when there are no warnings", () => {
    const text = show({ sky: "sun", scene: "snow_sand", subject: "group", lowSun: false });
    expect(text).toContain("None.");
  });
});

describe("refusals are explained, with no settings shown", () => {
  it.each([
    [{ filmType: "slide" as const }, "Slide film isn't supported in this version."],
    [{ subject: "other" as const, distance: "" }, "Enter the distance to the subject."],
  ])("%j", (changes, message) => {
    const text = show(changes);
    expect(text).toContain(message);
    expect(text).not.toContain("Final settings");
  });
});

describe("nothing broken ever reaches the page", () => {
  it("every combination reads properly", () => {
    const lights: Array<Partial<TestForm>> = [
      ...SKIES.flatMap((sky) => SCENES.map((scene) => ({ lightKind: "daylight" as const, sky, scene }))),
      ...LOW_LIGHTS.map((lowlight) => ({ lightKind: "lowlight" as const, lowlight })),
    ];
    let shown = 0;
    for (const light of lights)
      for (const subject of SUBJECTS)
        for (const goal of GOALS)
          for (const support of SUPPORTS)
            for (const iso of [FILM_SPEEDS[1], "100", "400", FILM_SPEEDS[FILM_SPEEDS.length - 1]]) {
              const form = { ...light, subject, goal, support, iso: String(iso), distance: subject === "other" ? "2" : "" };
              const text = show(form);
              shown += 1;
              expect(text, JSON.stringify(form)).not.toMatch(/undefined|NaN|\[object|\bnull\b/);
            }
    expect(shown).toBe(41 * 5 * 3 * 3 * 4);
  }, 60_000);
});
