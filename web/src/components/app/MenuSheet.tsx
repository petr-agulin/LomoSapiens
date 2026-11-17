// The menu, opened by the round button at the top right of Home and the result: the app's places, the same
// list on every screen, with the one you're on marked. While it is open, a round ×
// sits where the menu button was, so the button that opened it also closes it. Dragging its top down, a tap
// outside, the phone's Back, Escape, or any row closes it too.
import { strings } from "../../lib/strings.ts";
import { CARD_ICON, Icon, PathIcon } from "./icons.tsx";
import { useDragToClose } from "./dragToClose.ts";
import { useBackCloses } from "./navigation.ts";
import { SCRIM, SHEET_FRAME, SheetHandle } from "./parts.tsx";

export type MenuItem = "home" | "cameras" | "rolls" | "theory" | "settings" | "about";

const text = strings.app.menuItems;

const ROWS: { item: MenuItem; icon: string }[] = [
  { item: "home", icon: "M3.5 11L12 4l8.5 7M6 9.5V20h12V9.5M10 20v-5h4v5" },
  {
    item: "cameras",
    icon: "M4 8h3l1.6-2.5h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 10.5a3.25 3.25 0 1 1 0 6.5a3.25 3.25 0 1 1 0-6.5z",
  },
  { item: "rolls", icon: CARD_ICON.film },
  { item: "theory", icon: "M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5M12 6.5c2-1.5 5-2 8-1.5v13c-3-.5-6 0-8 1.5M12 6.5v13" },
  { item: "settings", icon: "M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5" },
  // About the app, last: the "i" of the app's help.
  { item: "about", icon: "M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17zM12 11v5.5M12 7.6v.1" },
];

export function MenuSheet({
  current,
  cameraName,
  rollLine = null,
  onPick,
  onClose,
}: {
  /** The place the menu was opened on, if it is one of the menu's places. */
  current: MenuItem | null;
  /** The camera in use, named under "Cameras". */
  cameraName: string | null;
  /** The roll in the camera in use, under "Rolls": "In use: 12 of 36 recorded". */
  rollLine?: string | null;
  onPick: (item: MenuItem) => void;
  onClose: () => void;
}) {
  useBackCloses(onClose);
  const { panelRef, scrimRef, grab } = useDragToClose(onClose);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="menu-title" className={SHEET_FRAME} onKeyDown={(event) => event.key === "Escape" && onClose()}>
      {/* A tap outside closes the menu. The × below does the same for keyboards and screen readers. */}
      <button ref={scrimRef} type="button" aria-hidden="true" tabIndex={-1} onClick={onClose} className={SCRIM} />
      {/* Exactly over the menu button: the screen's top row is 16 px in, and the button is 48 px round. */}
      <button
        type="button"
        aria-label={text.closeMenu}
        onClick={onClose}
        className="absolute top-4 right-4 grid size-12 cursor-pointer place-items-center rounded-full bg-card text-ink"
      >
        <Icon name="close" size={22} />
      </button>
      <nav ref={panelRef} aria-labelledby="menu-title" className="relative flex flex-col rounded-t-[var(--sheet-radius)] bg-card px-3 pt-2.5 pb-[18px] shadow-[var(--sheet-shadow)]">
        <div {...grab} className="-mx-3 -mt-2.5 flex touch-none flex-col px-3 pt-2.5">
          <SheetHandle />
          <h2 id="menu-title" className="m-0 pt-1 pb-1.5 pl-2 font-display text-[22px] font-semibold tracking-[-0.01em]">
            {text.title}
          </h2>
        </div>
        {ROWS.map(({ item, icon }) => {
          const here = item === current;
          const sub = item === "cameras" && cameraName ? text.inUse(cameraName) : item === "rolls" ? rollLine : null;
          return (
            <button
              key={item}
              type="button"
              aria-current={here ? "page" : undefined}
              onClick={() => (here ? onClose() : onPick(item))}
              className={`flex min-h-14 cursor-pointer items-center gap-3.5 rounded-[14px] px-2 text-left ${here ? "bg-hero text-hero-ink" : ""}`}
            >
              <span aria-hidden="true" className={`grid size-10 flex-none place-items-center rounded-xl ${here ? "bg-[var(--on-hero-icon-bg)]" : "bg-chip"}`}>
                <PathIcon d={icon} size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[17px] font-medium">{text[item]}</span>
                {sub && <span className={`truncate text-sm ${here ? "opacity-75" : "text-muted"}`}>{sub}</span>}
              </span>
              {/* The place you're on is marked by its dark row alone, and has no arrow: it goes nowhere. */}
              {!here && <Icon name="chevron" size={18} className="flex-none text-muted" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
