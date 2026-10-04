/** The React half of the seam, behind its own entry. */

export { type ViewerProps, Viewer } from "./viewer";
export { type ExplorerProps, Explorer, tree_of } from "@mnd/explorer";
/** The section chain: what each section lists and holds, and the listings a host builds from. */
export { domain_listing, editor_slices, listed, packages_listing, structure_listing, useChain,
         type Chain, type Listing, type Mark, type Row, type Slice } from "@mnd/explorer";
/** The tray, and the state a shell keeps for it and for the drawing. Handed no `onAct` it only
 *  reads; its workspace tab still sets how the drawing looks. */
export { Tray, useDisplay, useTray,
         type Display, type Extra, type Hold, type Pointed, type TrayProps } from "@mnd/tray";
/** Markdown as a card draws it: React elements, never an HTML string. */
export { Inline, Markdown } from "@mnd/stage";
export { WorkspaceHeader, TrayFrame, Icon,
         type WorkspaceHeaderProps, type TrayFrameProps } from "./shell";

/** What `Explorer` hands back. A name and arguments — never a mutation. */
export type { Act, Args } from "@mnd/core";
