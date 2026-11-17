// Every sheet closes when its top, the line and the title, is dragged down, as on most phones. The sheet follows the finger and the dimmed screen lightens. Let go far enough down, or with
// a quick flick, and the sheet slides away; otherwise it springs back. A tap outside, the phone's Back, and
// Escape still close it, for anyone who can't drag.
import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from "react";

/** How far a finger moves before it counts as a drag rather than a tap, in pixels. */
const START = 6;
/** How long the sheet takes to slide away or spring back, in milliseconds. */
const MOVE_MS = 180;
/** The finger's speed is taken over its last moves, within this time, in milliseconds. */
const SPEED_WINDOW = 100;
/** How far a flick carries the sheet on: where it would be this long after the finger lets go, in milliseconds. */
const CARRY_MS = 100;

/**
 * Whether a drag let go `distance` pixels down, moving at `speed` pixels per millisecond (down is positive),
 * closes a sheet `height` pixels tall. It does when the sheet, carried on by the flick, would pass a third
 * of its height, but never more than 120 px: so a slow pull past that line closes it, a quick flick closes it
 * sooner, and a flick back up keeps it. A drag under 24 px never closes, however quick.
 */
export function dragCloses(distance: number, speed: number, height: number): boolean {
  if (distance < 24) return false;
  return distance + speed * CARRY_MS >= Math.min(120, height / 3);
}

const reducedMotion = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Drag {
  pointer: number;
  startY: number;
  moving: boolean;
  /** Recent positions, for the speed at the moment the finger lets go. */
  samples: { y: number; t: number }[];
}

/**
 * Returns refs for the sheet's panel and its dimmed screen, and the handlers for the part that can be
 * dragged. That part needs `touch-none`, so the browser doesn't take the drag for a scroll.
 */
export function useDragToClose(onClose: () => void) {
  const panel = useRef<HTMLElement | null>(null);
  const scrim = useRef<HTMLElement | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const drag = useRef<Drag | null>(null);
  /** Set when a drag ends, so the click the browser may send after it doesn't also press a button. */
  const dragged = useRef(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  /** Moves the sheet `distance` pixels down, and lightens the dimmed screen to match. */
  const place = (distance: number, animate: boolean) => {
    const sheet = panel.current;
    if (!sheet) return;
    const glide = animate && !reducedMotion();
    sheet.style.transition = glide ? `transform ${MOVE_MS}ms ease-out` : "";
    sheet.style.transform = distance > 0 ? `translateY(${distance}px)` : "";
    const dim = scrim.current;
    if (dim) {
      dim.style.transition = glide ? `opacity ${MOVE_MS}ms ease-out` : "";
      dim.style.opacity = distance > 0 ? String(Math.max(0, 1 - distance / Math.max(sheet.offsetHeight, 1))) : "";
    }
  };

  const finish = (event: PointerEvent<HTMLElement>, letGo: boolean) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    drag.current = null;
    if (!current.moving) return;
    dragged.current = true;
    const sheet = panel.current;
    const distance = Math.max(0, event.clientY - current.startY);
    // The speed over the last moves: from the oldest position within the window, or, when the finger has
    // been still or only one position is that recent, from the one before.
    const { samples } = current;
    const recent = samples.findIndex((sample) => event.timeStamp - sample.t <= SPEED_WINDOW);
    const from = samples[recent === -1 ? samples.length - 1 : Math.max(0, Math.min(recent, samples.length - 2))];
    const elapsed = event.timeStamp - from.t;
    const speed = elapsed > 0 ? (event.clientY - from.y) / elapsed : 0;
    if (letGo && sheet && dragCloses(distance, speed, sheet.offsetHeight)) {
      if (reducedMotion()) return close.current();
      place(sheet.offsetHeight, true);
      timer.current = window.setTimeout(() => close.current(), MOVE_MS);
    } else {
      place(0, true);
    }
  };

  const grab = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      dragged.current = false;
      if (!event.isPrimary || event.button !== 0) return;
      drag.current = { pointer: event.pointerId, startY: event.clientY, moving: false, samples: [{ y: event.clientY, t: event.timeStamp }] };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const current = drag.current;
      if (!current || current.pointer !== event.pointerId) return;
      const distance = event.clientY - current.startY;
      if (!current.moving) {
        if (distance < START) return;
        current.moving = true;
        // From here the drag is the sheet's, even when the finger leaves its top.
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      current.samples.push({ y: event.clientY, t: event.timeStamp });
      while (current.samples.length > 2 && event.timeStamp - current.samples[0].t > SPEED_WINDOW) current.samples.shift();
      place(Math.max(0, distance), false);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => finish(event, true),
    onPointerCancel: (event: PointerEvent<HTMLElement>) => finish(event, false),
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (!dragged.current) return;
      dragged.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };

  const panelRef = useCallback((element: HTMLElement | null) => {
    panel.current = element;
  }, []);
  const scrimRef = useCallback((element: HTMLElement | null) => {
    scrim.current = element;
  }, []);

  return { panelRef, scrimRef, grab };
}
