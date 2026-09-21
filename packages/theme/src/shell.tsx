/** Graph-agnostic workspace chrome: header and tray frame. */

import { type MouseEvent, type ReactNode } from "react";
import { Icon } from "./icons";

export type WorkspaceHeaderProps = {
  /** Product name — rendered as the header title when a string. */
  brand: ReactNode;
  /** Session / collection label beside the brand. */
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
  /** Context word (e.g. "page", "block"). */
  word: string;
  name?: string;
  note?: string;
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
  open, onOpen, big = false, onBig, word, name, note, tabs, tab, onTab, tools, tabTools, children,
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
        <span className="tray-context">
          <span className="word">{word}</span>
          {name ? <span className="name">{name}</span> : null}
          {note ? <span className="note">{note}</span> : null}
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
