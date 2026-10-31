/** Graph-agnostic workspace chrome: header, tray frame, and which region the keys go to. */

import { useState, type CSSProperties, type MouseEvent, type ReactNode,
         type SyntheticEvent } from "react";
import { Icon } from "./icons";

export type WorkspaceHeaderProps = {
  /** Product name — rendered as the header title when a string. */
  brand: ReactNode;
  /** Session / source folder label beside the brand. */
  where?: ReactNode;
  /** Header tools (undo, export, theme, …). */
  children?: ReactNode;
};

/** Top chrome: identity on the left, tools on the right. */
export function WorkspaceHeader({ brand, where, children }: WorkspaceHeaderProps) {
  return (
    <header>
      <span className="identity">
        {typeof brand === "string" ? <h1>{brand}</h1> : brand}
        {where}
      </span>
      {children ? <span className="tools">{children}</span> : null}
    </header>
  );
}

/** The tab names are the host's own, so it hands them back exactly as typed. */
export type TrayFrameProps<T extends string = string> = {
  open: boolean;
  onOpen: (open: boolean) => void;
  /** Full-height body; omitted when the host has no expand control. */
  big?: boolean;
  onBig?: (big: boolean) => void;
  /** Context word (e.g. "definition", "usage"), drawn as a tag after the name and carried as
   *  `data-word`, so a host may dress each of its words apart. */
  word: string;
  name?: string;
  note?: string;
  /** **An element's identity row**, which replaces the word: its kind after the name, its role —
   *  a filled *definition* badge in its colour, or a quiet *use* — its colour edge, and its facts
   *  strip. */
  kind?: string;
  role?: "definition" | "use";
  tint?: { "data-family"?: string; style?: Record<string, string> };
  facts?: ReactNode;
  tabs: readonly T[];
  tab: T;
  onTab: (tab: T) => void;
  /** Extra controls in the bar (counts, expand). */
  tools?: ReactNode;
  /** Extra controls on the tab strip (e.g. reset style). */
  tabTools?: ReactNode;
  children?: ReactNode;
};

/** Collapsible tray shell: bar, tabs, and a body slot — no graph types. */
export function TrayFrame<T extends string>({
  open, onOpen, big = false, onBig, word, name, note, kind, role, tint, facts, tabs, tab, onTab,
  tools, tabTools, children,
}: TrayFrameProps<T>) {
  const on_bar = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onOpen(!open);
  };

  return (
    <section className={["tray", open ? "open" : "shut", open && big ? "big" : ""]
               .filter(Boolean).join(" ")} aria-label="Context">
      <div className="tray-bar" onClick={on_bar}
           title={open ? "shut the tray" : "open the tray"}>
        <span className="tray-chevron"><Icon name={open ? "less" : "more"} /></span>
        <span className="tray-context" {...(tint?.["data-family"]
                ? { "data-family": tint["data-family"] } : {})}
              style={(tint?.style ?? {}) as CSSProperties}>
          {tint ? <span className="tray-edge" aria-hidden /> : null}
          {name ? <span className="name">{name}</span> : null}
          {role ? (
            <>
              {kind ? <span className="kind">{kind}</span> : null}
              <span className={`role ${role}`}>{role}</span>
            </>
          ) : <span className="word" data-word={word}>{word}</span>}
          {note ? <span className="note">{note}</span> : null}
          {facts ? <span className="tray-facts">{facts}</span> : null}
        </span>
        <span className="tray-tools">
          {tools}
          {open && onBig ? (
            <button className={big ? "on" : ""}
                    title={big ? "give the stage its room back" : "take the full height"}
                    onClick={() => onBig(!big)}>
              <Icon name={big ? "collapse" : "expand"} />
            </button>
          ) : null}
        </span>
      </div>

      {open ? (
        <div className="tray-body">
          <div className="tray-tabs">
            {tabs.map((t) => (
              <button key={t} className={tab === t ? "on" : ""} onClick={() => onTab(t)}>
                {t}
              </button>
            ))}
            {tabTools ? <span className="tab-tools">{tabTools}</span> : null}
          </div>
          {children}
        </div>
      ) : null}
    </section>
  );
}

/** A region of the page the keys may go to. */
export type Zone = "explorer" | "canvas" | "tray" | "options";

/** Each region by the element that draws it. */
const ZONES: readonly [string, Zone][] = [
  [".explorer", "explorer"], [".stage", "canvas"], [".tray", "tray"], [".opts", "options"],
];

/** **The keys go to one region at a time**: the one last pressed or focused in, which the page
 *  outlines. Spread `bind` on the element holding every region. */
export function useZone(first: Zone = "canvas") {
  const [zone, set_zone] = useState<Zone>(first);
  const enter = (e: SyntheticEvent) => {
    const el = e.target instanceof Element ? e.target : null;
    const hit = ZONES.find(([at]) => el?.closest(at));
    if (hit) set_zone(hit[1]);
  };
  return { zone, bind: { "data-zone": zone, onPointerDownCapture: enter, onFocusCapture: enter } };
}
