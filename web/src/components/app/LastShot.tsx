// Home's Last recorded frame card: the frame furthest along the roll last
// recorded on, in whichever camera, on a piece of 35 mm film, with its shot's tags and note. Tapping it opens the
// frame. Before then, the roll in the camera in use, with nothing recorded on it yet. "Analyse a new shot" still
// continues from the last shot analysed, which the card no longer shows.
//
// The strip's edge print is a film's, as real film prints it: DX-style bars and the frame's number along the top,
// the roll's speed and film along the bottom.
import { useLayoutEffect, useRef, useState } from "react";
import type { Aperture, Shutter } from "../../lib/engine/types.ts";
import { settingsSaid, shutterForm } from "../../lib/result.ts";
import { cameraRollLine } from "../../lib/rollText.ts";
import { filmLine } from "../../lib/setup.ts";
import type { Frame, Roll, SavedCamera } from "../../lib/store.ts";
import { strings } from "../../lib/strings.ts";
import { Icon } from "./icons.tsx";
import { Tags, shotTags } from "./ShotTags.tsx";

const text = strings.app;

const BARS = [2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 1];
const edgeText = "type-number flex h-[7px] items-center overflow-hidden font-display text-[7.5px] leading-none font-semibold whitespace-nowrap text-edge-ink";
const card = "flex flex-col rounded-[var(--card-radius)] bg-card px-3.5 pt-3 pb-3.5 shadow-[var(--card-shadow)]";

function Holes() {
  return (
    <span className="flex justify-between">
      {Array.from({ length: 24 }, (_, hole) => (
        <span key={hole} className="h-[5px] w-[7px] rounded-[1.5px] bg-card" />
      ))}
    </span>
  );
}

function Bars() {
  return (
    <span className="flex flex-none items-center gap-[1.5px]">
      {BARS.map((width, bar) => (
        <span key={bar} className="h-[5px] bg-current" style={{ width }} />
      ))}
    </span>
  );
}

/**
 * The roll's speed and film along the bottom edge, "ISO 400 colour", at both ends when two fit side by side, as on
 * film, or else once, in the middle. Measured on the phone, as the print's length and the strip's width both vary.
 */
function EdgePrint({ print }: { print: string }) {
  const row = useRef<HTMLSpanElement>(null);
  const first = useRef<HTMLSpanElement>(null);
  const [twice, setTwice] = useState(true);
  useLayoutEffect(() => {
    const measure = () => {
      if (row.current && first.current) setTwice(first.current.offsetWidth * 2 + 32 <= row.current.clientWidth);
    };
    measure();
    if (typeof ResizeObserver !== "function" || !row.current) return;
    const observer = new ResizeObserver(measure);
    observer.observe(row.current);
    return () => observer.disconnect();
  }, [print]);
  return (
    <span ref={row} className={`${edgeText} tracking-[.14em] uppercase ${twice ? "justify-between" : "justify-center"}`}>
      <span ref={first}>{print}</span>
      {twice && <span>{print}</span>}
    </span>
  );
}

const small = "text-[17px] font-medium opacity-60";

/**
 * The big numbers: 40 px, smaller when the three values are long together, such as f/2.8, 1/30 and a typed
 * 0.75 m on a frame, so they fit the strip on a 320 px phone. `characters` counts the big digits, and B's seconds.
 */
const bigClass = (characters: number) =>
  `${characters <= 7 ? "text-[40px]" : characters <= 8 ? "text-[34px]" : "text-[30px]"} leading-none font-semibold tracking-[-0.03em]`;

/** Home's card for the last recorded frame. The whole card opens the frame. */
export function LastFrameCard({ frame, roll, camera, inUse, onOpen }: { frame: Frame; roll: Roll; camera: SavedCamera; inUse: boolean; onOpen: () => void }) {
  const { aperture, shutter, bulbSeconds, focusM } = frame.set;
  const heading = inUse ? text.home.lastFrame : text.home.lastFrameIn(camera.name);
  const position = text.home.frameOf(frame.number, roll.frames);
  return (
    <section aria-labelledby="last-frame" className={`relative gap-2.5 ${card}`}>
      <h2 id="last-frame" className="type-label m-0 flex items-center gap-2 text-[13px] font-normal text-muted">
        <span className="min-w-0 flex-1 truncate">{heading}</span>
        <Icon name="chevron" size={18} className="flex-none" />
      </h2>
      <SettingsStrip aperture={aperture} shutter={shutter} bulbSeconds={bulbSeconds} focusM={focusM} frameLabel={position} print={filmLine(roll)} album />
      <Tags tags={shotTags(frame.answers)} />
      {frame.note && <p className="m-0 line-clamp-2 px-0.5 text-[15px] leading-[1.4] [overflow-wrap:anywhere]">{frame.note}</p>}
      {/* Over the whole card, so a tap anywhere opens the frame; the card's lists can't sit inside a button. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={text.home.lastFrameSaid(heading, position, settingsSaid(aperture, shutter, bulbSeconds, { meters: focusM, source: "given" }))}
        className="absolute inset-0 z-[1] cursor-pointer rounded-[inherit]"
      />
    </section>
  );
}

/** Before any frame: the roll in the camera in use, and where its frames will appear. */
export function NoFrameCard({ roll }: { roll: Roll }) {
  return (
    <section aria-labelledby="last-frame" className={`gap-1 ${card}`}>
      <h2 id="last-frame" className="type-label m-0 text-[13px] font-normal text-muted">
        {text.home.lastFrame}
      </h2>
      <p className="m-0 font-medium [overflow-wrap:anywhere]">{roll.name ? `${roll.name} · ${cameraRollLine(roll, 0)}` : cameraRollLine(roll, 0)}</p>
      <p className="m-0 text-sm text-muted">{text.home.noFrameYet}</p>
    </section>
  );
}

/**
 * Three settings on a piece of 35 mm film: Home's last recorded frame, and what was set on a frame's own page. On
 * Home, the Archive paper theme mounts it like a negative in an album, with photo corners (index.css).
 */
export function SettingsStrip({
  aperture,
  shutter,
  bulbSeconds,
  focusM,
  frameLabel,
  print,
  album = false,
}: {
  aperture: Aperture;
  shutter: Shutter;
  bulbSeconds: number | null;
  focusM: number | null;
  /** Along the top edge, between the bars: "Frame 12 of 36". */
  frameLabel: string;
  /** Along the bottom edge: the roll's speed and film, "ISO 400 colour". */
  print: string;
  album?: boolean;
}) {
  const form = shutterForm(shutter, bulbSeconds);
  const focus = { meters: focusM, source: "given" as const };
  const shutterBig = form.form === "bulb" ? "B" : form.big;
  const focusBig = focusM === null ? "∞" : String(focusM);
  const big = bigClass(aperture.length + shutterBig.length + focusBig.length + (form.form === "bulb" ? String(form.seconds).length + 1 : 0));
  return (
    <div className={`flex flex-col rounded-lg bg-hero px-2.5 text-hero-ink ${album ? "album-strip" : ""}`}>
      {album && ["tl", "tr", "bl", "br"].map((corner) => <span key={corner} aria-hidden="true" className={`photo-corner ${corner}`} />)}
      <span aria-hidden="true" className="flex flex-col gap-0.5 pt-[3px]">
        <span className={`${edgeText} gap-[7px]`}>
          <Bars />
          <span className="min-w-0 flex-1 truncate text-center tracking-[.14em] uppercase">{frameLabel}</span>
          <Bars />
        </span>
        <Holes />
      </span>
      <p
        role="img"
        aria-label={settingsSaid(aperture, shutter, bulbSeconds, focus)}
        className="type-number m-0 flex pt-[11px] pb-3 font-display"
      >
        {/* Each value takes the room it needs, so a long one, such as 0.75 m, never runs off the strip. */}
        <span aria-hidden="true" className="flex flex-auto items-baseline gap-0.5 pl-1">
          <span className={small}>f/</span>
          <span className={big}>{aperture}</span>
        </span>
        <span aria-hidden="true" className="flex flex-auto items-baseline gap-0.5 border-l border-hero-line pl-2.5">
          {form.form === "fraction" && <span className={small}>1/</span>}
          <span className={big}>{shutterBig}</span>
          {form.form !== "fraction" && (
            <span className={`${small} whitespace-nowrap`}>{form.form === "bulb" ? `${form.seconds} ${text.result.seconds}` : text.result.seconds}</span>
          )}
        </span>
        <span aria-hidden="true" className="flex flex-auto items-baseline gap-[3px] border-l border-hero-line pl-2.5">
          <span className={big}>{focusBig}</span>
          {focus.meters !== null && <span className={small}>{text.result.metres}</span>}
        </span>
      </p>
      <span aria-hidden="true" className="flex flex-col gap-0.5 pb-[3px]">
        <Holes />
        <EdgePrint print={print} />
      </span>
    </div>
  );
}
