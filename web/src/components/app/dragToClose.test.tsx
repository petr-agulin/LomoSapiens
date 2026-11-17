import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { dragCloses } from "./dragToClose.ts";
import { MenuSheet } from "./MenuSheet.tsx";
import { ConfirmSheet, Sheet } from "./parts.tsx";

const noop = () => undefined;

describe("dragging a sheet's top down closes it", () => {
  it("closes when pulled slowly past a third of the sheet", () => {
    expect(dragCloses(100, 0, 300)).toBe(true);
    expect(dragCloses(99, 0, 300)).toBe(false);
  });

  it("never asks for more than 120 px, however tall the sheet", () => {
    expect(dragCloses(120, 0, 600)).toBe(true);
    expect(dragCloses(119, 0, 600)).toBe(false);
  });

  it("closes sooner on a quick flick: where the flick would carry the sheet 0.1 s on", () => {
    expect(dragCloses(40, 0.8, 600)).toBe(true); // 40 + 80 = 120
    expect(dragCloses(60, 0.5, 600)).toBe(false); // 60 + 50 = 110
    expect(dragCloses(30, 1.5, 330)).toBe(true); // the menu: 30 + 150 = 180, past 110
  });

  it("never closes on a drag under 24 px, however quick", () => {
    expect(dragCloses(23, 5, 300)).toBe(false);
    expect(dragCloses(0, 3, 300)).toBe(false);
    expect(dragCloses(-40, 3, 300)).toBe(false);
  });

  it("keeps the sheet when the finger flicks back up before letting go", () => {
    expect(dragCloses(150, -1.5, 600)).toBe(false); // 150 − 150 = 0
  });
});

/** The part of a sheet that can be dragged: the element with `touch-none`, up to the end of its title. */
const grabZone = (html: string) => {
  const start = html.indexOf('touch-none');
  expect(start, "a sheet's top can be dragged").toBeGreaterThan(-1);
  return html.slice(start, html.indexOf("</h2>", start));
};

describe("every sheet's top, the line and the title, can be dragged", () => {
  it("a sheet, with what sits above its title", () => {
    const html = renderToStaticMarkup(
      <Sheet title="Where are you?" above={<button type="button">Sun</button>} closeLabel="Close" onClose={noop}>
        <p>Choices</p>
      </Sheet>,
    );
    const zone = grabZone(html);
    expect(zone).toContain("h-1 w-10"); // the line
    expect(zone).toContain("Sun");
    expect(zone).toContain("Where are you?");
    expect(zone).not.toContain("Choices");
  });

  it("a question before deleting", () => {
    const zone = grabZone(renderToStaticMarkup(<ConfirmSheet title="Delete this camera?" body="Its film goes too." yes="Delete" no="Keep it" closeLabel="Close" onYes={noop} onClose={noop} />));
    expect(zone).toContain("h-1 w-10");
    expect(zone).toContain("Delete this camera?");
    expect(zone).not.toContain("Its film goes too.");
  });

  it("the menu, but not its rows", () => {
    const zone = grabZone(renderToStaticMarkup(<MenuSheet current="home" cameraName="Mine" onPick={noop} onClose={noop} />));
    expect(zone).toContain("h-1 w-10");
    expect(zone).toContain("Menu");
    expect(zone).not.toContain("Cameras");
  });

  it("dims the whole screen, under the sheet too, so a sheet dragged down shows no gap", () => {
    const html = renderToStaticMarkup(<Sheet title="Where are you?" closeLabel="Close" onClose={noop}>x</Sheet>);
    expect(html).toMatch(/aria-label="Close" class="absolute inset-0 [^"]*bg-\[var\(--scrim\)\]"/);
    expect(html).toMatch(/role="dialog"[^>]*class="relative /);
  });
});
