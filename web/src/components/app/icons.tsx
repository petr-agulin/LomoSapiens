// Inline stroke icons from the design: 24 × 24, round caps, currentColor.
// No icon font and no icon library.

const PATHS = {
  menu: { d: "M4 7h16M4 12h16M4 17h16", width: 2 },
  back: { d: "M15 6l-6 6 6 6", width: 2 },
  chevron: { d: "M9 6l6 6-6 6", width: 2 },
  book: {
    d: "M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5M12 6.5c2-1.5 5-2 8-1.5v13c-3-.5-6 0-8 1.5M12 6.5v13",
    width: 1.8,
  },
  check: { d: "M5 12.5l4.5 4.5L19 7.5", width: 2.6 },
  info: { d: "M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17zM12 11v5.5M12 7.6v.1", width: 1.8 },
  arrow: { d: "M5 12h13M13 6l6 6-6 6", width: 2.2 },
  plus: { d: "M12 5v14M5 12h14", width: 2 },
  close: { d: "M6 6l12 12M18 6L6 18", width: 2 },
  search: { d: "M10.5 4a6.5 6.5 0 1 1 0 13a6.5 6.5 0 1 1 0-13zM15.5 15.5L20 20", width: 2 },
} as const;

/** An icon from a path, such as the choices' own icons in shotIcons.ts. */
export function PathIcon({ d, size = 24, className }: { d: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The cards' own icons, drawn with PathIcon: shared by Cameras, Rolls and the menu. */
export const CARD_ICON = {
  camera: "M3 8.5A1.5 1.5 0 0 1 4.5 7h3L9 4.5h6L16.5 7h3A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5zM12 9.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7z",
  /** A film canister. */
  film: "M7 4.5h9a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1zM9.5 2.5h4v2h-4zM17 8.5h3.5v8H17M6 8.5h11M6 16.5h11",
  /** A canister with an arrow out of it: a roll coming out of its camera. */
  finish: "M5 4.5h8a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1zM7.5 2.5h3v2h-3zM4 8.5h10M4 16.5h10M16.5 12.5H22M19.5 9.5l3 3-3 3",
  bin: "M4 7h16M10 3.5h4M6.5 7l1 13h9l1-13M10 11v6M14 11v6",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  const { d, width } = PATHS[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
