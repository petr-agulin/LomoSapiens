// The pieces every screen shares.
import type { ReactNode } from "react";
import { Icon, PathIcon, type IconName } from "./icons.tsx";
import { useDragToClose } from "./dragToClose.ts";
import { useBackCloses, useScrollMemory } from "./navigation.ts";

/** An inner screen's top row: back, and a crumb saying where you are. */
export function Crumb({ backLabel, onBack, children }: { backLabel: string; onBack: () => void; children: ReactNode }) {
  return (
    <>
      <RoundButton icon="back" label={backLabel} onClick={onBack} />
      <span className="type-label flex-1 text-[13px] text-muted">{children}</span>
    </>
  );
}

/** A screen's title and the line under it, and a second line when a screen needs one, such as a roll's. */
export function ScreenTitle({ title, line, more }: { title: string; line: string; more?: string }) {
  return (
    <div className="flex flex-col gap-1 px-0.5 pt-2.5 pb-1.5">
      <h1 className="m-0 font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]">{title}</h1>
      <p className="m-0 text-sm leading-[1.35] text-muted">
        {line}
        {more && (
          <>
            <br />
            {more}
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Parts joined by " · " that break only between parts, so "1/15 to 1/250" stays on one line. A name the user
 * typed, such as a camera's, is given as `{ named }`: it may break inside too, so a long one never runs out of its card.
 */
export function Unbroken({ parts }: { parts: (string | { named: string })[] }) {
  return parts.map((part, index) => (
    <span key={index}>
      {index > 0 && " · "}
      {typeof part === "string" ? <span className="whitespace-nowrap">{part}</span> : <span className="[overflow-wrap:anywhere]">{part.named}</span>}
    </span>
  ));
}

/** A dashed card that adds something: a camera, or a roll. */
export function AddCard({ title, line, onClick }: { title: string; line: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full cursor-pointer items-center gap-3.5 rounded-[var(--card-radius)] border-[1.5px] border-dashed border-line py-2 pr-3.5 pl-4 text-left"
    >
      <span aria-hidden="true" className="grid size-12 flex-none place-items-center rounded-[14px] bg-card">
        <Icon name="plus" size={22} />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="text-[17px] font-semibold">{title}</span>
        <span className="text-sm text-muted">{line}</span>
      </span>
    </button>
  );
}

/** A small section label, such as "If it applies". */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="type-label m-0 px-1 pt-1.5 text-[13px] font-semibold text-muted">{children}</h2>;
}

/**
 * A card that holds an answer: unpicked it shows its title and line with a chevron; holding the answer
 * it turns dark, like the film strip, with a small title, the answer, its line and a check.
 */
export function ChoiceCard({
  icon,
  title,
  sub,
  picked,
  pickedLabel,
  onClick,
  minHeight = 96,
}: {
  icon: string;
  title: string;
  sub: string;
  /** The answer this card holds, if any. */
  picked?: { value: string; sub: string };
  pickedLabel: string;
  onClick: () => void;
  minHeight?: number;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onClick}
      style={{ minHeight }}
      className={`flex w-full cursor-pointer items-center gap-3.5 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] py-3 pr-3.5 pl-4 text-left ${picked ? "bg-hero text-hero-ink" : "bg-card text-ink"}`}
    >
      <span aria-hidden="true" className={`grid size-12 flex-none place-items-center rounded-[14px] ${picked ? "bg-[var(--on-hero-icon-bg)]" : "bg-chip"}`}>
        <PathIcon d={icon} size={26} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {picked ? (
          <>
            <span className="text-[13px] opacity-65">{title}</span>
            <span className="font-display text-[22px] leading-[1.15] font-semibold tracking-[-0.01em]">{picked.value}</span>
            <span className="text-sm opacity-75">{picked.sub}</span>
          </>
        ) : (
          <>
            <span className="font-display text-[19px] leading-[1.2] font-semibold tracking-[-0.01em]">{title}</span>
            <span className="text-sm leading-[1.35] text-muted">{sub}</span>
          </>
        )}
      </span>
      {picked ? (
        <span role="img" aria-label={pickedLabel} className="grid size-7 flex-none place-items-center rounded-full bg-hero-ink text-hero">
          <Icon name="check" size={16} />
        </span>
      ) : (
        <Icon name="chevron" size={18} className="flex-none text-muted" />
      )}
    </button>
  );
}

/** One choice in a sheet or a list: an icon square, a label and, mostly, a line. Picked, it turns dark with a check. */
export function OptionRow({
  icon,
  label,
  sub,
  note,
  on,
  onPick,
  compact,
}: {
  icon: string;
  label: string;
  /** The line under the label. A choice that explains itself, such as a theme, has none. */
  sub?: string;
  /** A third line, such as "Usual for a portrait". */
  note?: string;
  on: boolean;
  onPick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onPick}
      className={`flex w-full cursor-pointer items-center rounded-2xl py-2 pr-3 pl-2 text-left ${compact ? "min-h-[58px] gap-3" : "min-h-[62px] gap-3.5"} ${on ? "bg-hero text-hero-ink" : "bg-transparent"}`}
    >
      <span
        aria-hidden="true"
        className={`grid flex-none place-items-center rounded-xl ${compact ? "size-10" : "size-11"} ${on ? "bg-[var(--on-hero-icon-bg)]" : "bg-chip"}`}
      >
        <PathIcon d={icon} size={compact ? 22 : 24} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`leading-[1.25] font-medium ${compact ? "text-base" : "text-[17px]"}`}>{label}</span>
        {sub && <span className={`leading-[1.3] ${compact ? "text-[13px]" : "text-sm"} ${on ? "opacity-75" : "text-muted"}`}>{sub}</span>}
        {note && <span className={`text-xs leading-[1.4] font-semibold ${on ? "opacity-75" : "text-muted"}`}>{note}</span>}
      </span>
      {on && <Icon name="check" size={20} className="flex-none" />}
    </button>
  );
}

/**
 * A switch that applies only to some answers, or a setting such as the phone's theme. The whole row flips it;
 * the "i", if it has one, opens its explanation. A switch that is on only because of the last shot says so,
 * until it's touched.
 */
export function SwitchRow({
  label,
  sub,
  on,
  fromLast = false,
  fromLastText = "",
  helpLabel,
  onFlip,
  onHelp,
}: {
  label: string;
  sub: string;
  on: boolean;
  fromLast?: boolean;
  fromLastText?: string;
  helpLabel?: string;
  onFlip: () => void;
  onHelp?: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onFlip}
        className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card py-2.5 pr-3.5 pl-[18px] text-left"
      >
        <span className={`flex min-w-0 flex-1 flex-col ${onHelp ? "pr-10" : ""}`}>
          <span className="text-[17px] leading-[1.25] font-medium">{label}</span>
          <span className={`text-sm leading-[1.3] ${fromLast ? "font-medium text-ink" : "text-muted"}`}>{fromLast ? fromLastText : sub}</span>
        </span>
        <span aria-hidden="true" className={`relative h-[31px] w-[51px] flex-none rounded-2xl transition-colors ${on ? "bg-ink" : "bg-line"}`}>
          <span
            className={`absolute top-[3px] size-[25px] rounded-full shadow-[0_1px_3px_rgba(0,0,0,.25)] transition-[left] ${on ? "left-[23px] bg-card" : "left-[3px] bg-[var(--knob)]"}`}
          />
        </span>
      </button>
      {onHelp && (
        <button
          type="button"
          aria-label={helpLabel}
          aria-haspopup="dialog"
          onClick={onHelp}
          className="absolute top-1/2 right-[67px] -mt-[22px] grid size-11 cursor-pointer place-items-center rounded-full text-muted"
        >
          <Icon name="info" size={20} />
        </button>
      )}
    </div>
  );
}

/** The explanation behind a switch's "i": its icon, name and helper text, and Done. It never repeats the switch. */
export function HelpSheet({ icon, title, text, doneLabel, closeLabel, onClose }: { icon: string; title: string; text: string; doneLabel: string; closeLabel: string; onClose: () => void }) {
  return (
    <Sheet title={title} icon={icon} closeLabel={closeLabel} onClose={onClose}>
      <p className="m-0 px-1 text-base leading-normal">{text}</p>
      <MainButton onClick={onClose}>{doneLabel}</MainButton>
    </Sheet>
  );
}

/**
 * A whole screen: the top row, the content that scrolls, and one main action in thumb reach.
 * It is as tall as the app (--app-h in index.css): the phone's screen, or on a computer the phone frame.
 */
export function Screen({ top, children, action }: { top: ReactNode; children: ReactNode; action?: ReactNode }) {
  const column = useScrollMemory<HTMLElement>();
  return (
    <div className="mx-auto flex h-[var(--app-h)] max-w-[480px] flex-col bg-bg text-ink">
      <div className="flex items-center gap-2 px-4 pt-4 pb-1.5">{top}</div>
      {/* Nothing in the column shrinks: when it is taller than the screen, it scrolls instead. Back returns to where it was scrolled. */}
      <main ref={column} className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 [scrollbar-width:none] [&>*]:shrink-0">
        {children}
      </main>
      {action && <div className="flex flex-col px-4 pt-2.5 pb-3.5">{action}</div>}
    </div>
  );
}

/** The 48 px round button: back on inner screens, menu on main screens. */
export function RoundButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-12 flex-none cursor-pointer place-items-center rounded-full bg-card text-ink shadow-[var(--card-shadow)]"
    >
      <Icon name={icon} size={22} />
    </button>
  );
}

/** The one main action of a screen: full width, at the bottom. Faded and inert until the screen's answers are given. */
export function MainButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
      className={`min-h-[52px] rounded-[18px] bg-ink text-[17px] font-semibold text-bg ${disabled ? "opacity-30" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

/** A choice that opens as a sheet from the bottom, over a dimmed screen. */
export function Sheet({
  title,
  description,
  icon,
  above,
  below,
  closeLabel,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  /** An icon square beside the title, as in a switch's help. */
  icon?: string;
  /** Something above the title, such as a chip that goes back a page. */
  above?: ReactNode;
  /** Something under the description, such as "Then: where are you?". */
  below?: ReactNode;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useBackCloses(onClose);
  const { panelRef, scrimRef, grab } = useDragToClose(onClose);
  return (
    <div className={SHEET_FRAME} onKeyDown={(event) => event.key === "Escape" && onClose()}>
      <button ref={scrimRef} type="button" aria-label={closeLabel} onClick={onClose} className={SCRIM} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="relative flex max-h-[calc(var(--app-h)*0.88)] flex-col gap-3 overflow-y-auto rounded-t-[var(--sheet-radius)] bg-card px-3 pt-2.5 pb-4 shadow-[var(--sheet-shadow)]"
      >
        <div {...grab} className="-mx-3 -mt-2.5 flex touch-none flex-col gap-3 px-3 pt-2.5">
          <SheetHandle />
          {above}
          <div className={`flex gap-3.5 px-2 ${icon ? "items-center" : "flex-col gap-0.5"}`}>
            {icon && (
              <span aria-hidden="true" className="grid size-11 flex-none place-items-center rounded-xl bg-chip">
                <PathIcon d={icon} />
              </span>
            )}
            <h2 id="sheet-title" className="m-0 font-display text-[22px] font-semibold tracking-[-0.01em]">
              {title}
            </h2>
            {description && <p className="m-0 text-sm leading-[1.4] text-muted">{description}</p>}
            {below}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Around every sheet: the whole screen, with the sheet at the bottom and at least 48 px of dimmed screen
 * above it to tap. The dimmed screen reaches under the sheet too, so dragging the sheet down shows no gap.
 */
export const SHEET_FRAME = "fixed inset-0 z-10 mx-auto flex max-w-[480px] flex-col justify-end pt-12";
export const SCRIM = "absolute inset-0 cursor-pointer bg-[var(--scrim)]";

/** The line at the top of a sheet, which can be dragged down to close it. */
export function SheetHandle() {
  return <span aria-hidden="true" className="h-1 w-10 flex-none self-center rounded-sm bg-line" />;
}

/**
 * A question before something that can't be undone, such as deleting a camera: the question, what follows, the action, and "Keep it".
 */
export function ConfirmSheet({
  title,
  body,
  yes,
  no,
  closeLabel,
  onYes,
  onClose,
}: {
  title: string;
  body: string;
  yes: string;
  no: string;
  closeLabel: string;
  onYes: () => void;
  onClose: () => void;
}) {
  useBackCloses(onClose);
  const { panelRef, scrimRef, grab } = useDragToClose(onClose);
  return (
    <div className={SHEET_FRAME} onKeyDown={(event) => event.key === "Escape" && onClose()}>
      <button ref={scrimRef} type="button" aria-label={closeLabel} onClick={onClose} className={SCRIM} />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        className="relative flex flex-col gap-3 rounded-t-[var(--sheet-radius)] bg-card px-4 pt-2.5 pb-3.5 shadow-[var(--sheet-shadow)]"
      >
        <div {...grab} className="-mx-4 -mt-2.5 flex touch-none flex-col gap-3 px-4 pt-2.5">
          <SheetHandle />
          <h2 id="confirm-title" className="m-0 px-1 font-display text-[22px] font-semibold tracking-[-0.01em]">
            {title}
          </h2>
        </div>
        <p id="confirm-body" className="m-0 px-1 pb-1 text-base leading-normal">
          {body}
        </p>
        <MainButton onClick={onYes}>{yes}</MainButton>
        <button type="button" onClick={onClose} className="min-h-[52px] cursor-pointer rounded-[18px] bg-chip text-[17px] font-semibold">
          {no}
        </button>
      </div>
    </div>
  );
}

/** A value as the camera marks it: a small f/, 1/, mm or s around a big number. */
export function CameraValue({ before, big, after, size = 22 }: { before: string; big: string; after: string; size?: number }) {
  return (
    <span className="type-number flex items-baseline gap-0.5 font-display">
      {before && <span className="text-sm font-medium opacity-60">{before}</span>}
      <span className="font-semibold tracking-[-0.02em]" style={{ fontSize: size }}>
        {big}
      </span>
      {after && <span className="text-sm font-medium opacity-60">{after}</span>}
    </span>
  );
}

/** Single-choice tiles: the picked one is inverted, as every selection is. */
export function Tiles<T extends string>({
  label,
  options,
  value,
  onPick,
  columns = 4,
  render,
}: {
  label: string;
  options: readonly T[];
  value: T | null;
  onPick: (value: T) => void;
  columns?: number;
  render: (option: T) => ReactNode;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((option) => {
        const on = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onPick(option)}
            className={`flex min-h-14 cursor-pointer items-center justify-center rounded-[14px] px-1 ${on ? "bg-ink text-bg" : "bg-chip text-ink"}`}
          >
            {render(option)}
          </button>
        );
      })}
    </div>
  );
}
