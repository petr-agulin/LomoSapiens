import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { newDraft, type SetupDraft } from "../../lib/setup.ts";
import { FilmStep, Setup, type SetupStep } from "./Setup.tsx";
import type { QuestionKey } from "../../lib/setup.ts";

const readable = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

const noop = () => undefined;
const render = (step: SetupStep, draft: SetupDraft = newDraft(), openAt?: QuestionKey) =>
  renderToStaticMarkup(<Setup step={step} draft={draft} onChange={noop} onBack={noop} onNext={noop} openAt={openAt} />);

const inOrder = (text: string, parts: string[]) => {
  let position = 0;
  for (const part of parts) {
    const found = text.indexOf(part, position);
    expect(found, `"${part}" should come next`).toBeGreaterThanOrEqual(0);
    position = found + part.length;
  }
};

describe("step 1: your camera", () => {
  const page = render("camera");
  const text = readable(page);

  it("says where you are, and has a back button", () => {
    expect(text).toContain("Step 1 of 2 · Camera");
    expect(page).toContain('aria-label="Back"');
  });

  it("asks for a name and the six questions, lens first, each starting at Not sure, B at No", () => {
    inOrder(text, [
      "Your camera",
      "Read these off the camera, once. Not sure is fine too.",
      "Name",
      "Lens",
      "Widest aperture",
      "On the lens: 1:2.8 means f/2.8",
      "Not sure",
      "Smallest aperture",
      "The biggest number on the ring",
      "Not sure",
      "Focal length",
      "On the lens, such as 40 mm",
      "Not sure",
      "Shutter speed dial",
      "Fastest",
      "The biggest number on the dial",
      "Not sure",
      "Slowest, before B",
      "The smallest number before B",
      "Not sure",
      "B for long exposures",
      "Holds open while you press",
      "No",
      "Next: your film",
    ]);
    expect(page).toContain('placeholder="Any name you like"');
  });

  it("shows answers as the camera marks them", () => {
    const draft = newDraft();
    draft.answers = { widestAperture: "2.8", smallestAperture: "22", focalLengthMm: "40", fastestShutter: "1/250", slowestShutter: "1", hasBulb: "yes" };
    inOrder(readable(render("camera", draft)), ["f/ 2.8", "f/ 22", "40 mm", "1/ 250", "1 s", "Yes"]);
  });
});

describe("a camera question's sheet", () => {
  it("offers the engine's apertures as tiles, then Not sure with what it counts as", () => {
    const page = render("camera", newDraft(), "widestAperture");
    const text = readable(page);
    inOrder(text, [
      "Widest aperture",
      "The smallest f-number on your lens. On the front ring, 1:2.8 means f/2.8.",
      "f/ 1.4",
      "f/ 1.7",
      "f/ 1.8",
      "f/ 2",
      "f/ 2.8",
      "f/ 3.5",
      "f/ 4",
      "f/ 4.5",
      "f/ 5.6",
      "Not sure",
      "Counts as f/4, which almost every lens has",
    ]);
    expect(page).toContain('role="dialog"');
    expect(page).toContain('aria-label="Close"');
  });

  it.each([
    ["smallestAperture", "Counts as f/16, which almost every lens has"],
    ["focalLengthMm", "Counts as 50 mm, a common lens"],
    ["fastestShutter", "Counts as 1/250, which almost every camera has"],
    ["slowestShutter", "Counts as 1/30, which almost every camera has"],
  ] as const)("has Not sure for %s", (question, counts) => {
    expect(readable(render("camera", newDraft(), question))).toContain(`Not sure ${counts}`);
  });

  it("marks the current answer, and has no Not sure for B, which is printed on the dial", () => {
    const page = render("camera", newDraft(), "hasBulb");
    expect(readable(page)).toContain("A B on the dial: the shutter stays open while you press.");
    expect(page).toMatch(/aria-checked="true"[^>]*>.*?No</);
    expect(readable(page)).not.toContain("Counts as");
    expect(render("camera", newDraft(), "widestAperture")).toMatch(new RegExp(`aria-checked="true"[^>]*>.{0,200}Not sure`));
  });

  it("marks a picked aperture, not Not sure, once the user has answered", () => {
    const draft = { ...newDraft(), answers: { ...newDraft().answers, widestAperture: "2.8" as const } };
    const page = render("camera", draft, "widestAperture");
    expect(page.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(page).toMatch(/aria-checked="true"[^>]*>.{0,200}2\.8/);
  });
});

describe("step 2: the film in that camera", () => {
  it("names the camera, shows the speed big in its row, then colour or black and white, the length and a name", () => {
    const page = render("film", { ...newDraft(), name: "Old rangefinder" });
    const text = readable(page);
    inOrder(text, [
      "Step 2 of 2 · Film",
      "Your film",
      "Which roll is in Old rangefinder? The speed is on the box and the canister.",
      "Film speed (ISO)", "On the box and the canister", "ISO", "400",
      "Colour or black and white",
      "Colour",
      "Black and white",
      "Frames on the roll", "The number on the box", "36",
      "Name (optional)",
      "This film stays with Old rangefinder until you load a new roll. Each camera keeps its own film.",
      "Done",
    ]);
    expect(page).toMatch(/aria-haspopup="dialog"[^>]*>.{0,300}?Film speed \(ISO\).{0,400}?text-\[34px\][^>]*>400</);
  });

  it("says your camera when it has no name yet", () => {
    expect(readable(render("film"))).toContain("Which roll is in your camera?");
  });

  it("shows a typed speed big in its row, as a picked one", () => {
    expect(render("film", { ...newDraft(), speed: "other", otherSpeed: "125" })).toMatch(/text-\[34px\][^>]*>125</);
  });

  it("offers the four speeds in a sheet, then another typed and kept with Done", () => {
    const sheet = renderToStaticMarkup(<FilmStep draft={newDraft()} onChange={noop} openAt="speed" />);
    inOrder(readable(sheet), [
      "Film speed (ISO)",
      "On the box and the canister. Another speed, such as 125 or 3200, can be typed.",
      "ISO 100", "ISO 200", "ISO 400", "ISO 800",
      "Other speed",
      "Done",
    ]);
    expect(sheet).toMatch(/role="radio" aria-checked="true"[^>]*>.{0,300}?400/);
    expect(sheet).toContain('placeholder="Such as 125"');
    expect(sheet).toMatch(/aria-disabled="true"[^>]*>Done/);
  });

  it("opens on a typed speed in its field, and explains one that isn't a number above 0", () => {
    const typed = renderToStaticMarkup(<FilmStep draft={{ ...newDraft(), speed: "other", otherSpeed: "125" }} onChange={noop} openAt="speed" />);
    expect(typed).toContain('value="125"');
    expect(readable(typed)).not.toContain("Type a speed above 0");
    const wrong = renderToStaticMarkup(<FilmStep draft={{ ...newDraft(), speed: "other", otherSpeed: "0" }} onChange={noop} openAt="speed" />);
    expect(readable(wrong)).toContain("Type a speed above 0, such as 125.");
    expect(wrong).toMatch(/aria-disabled="true"[^>]*>Done/);
  });

  it("keeps the screen's Done faded while the speed typed isn't valid", () => {
    expect(render("film", { ...newDraft(), speed: "other", otherSpeed: "0" })).toMatch(/aria-disabled="true"[^>]*>Done/);
    expect(render("film", { ...newDraft(), speed: "other", otherSpeed: "125" })).not.toContain('aria-disabled="true"');
  });
});
