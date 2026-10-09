/** The React half of the seam, behind its own entry. */

export { type ViewerProps, Viewer } from "./viewer";
export { type ExplorerProps, Explorer, tree_of } from "@mnd/explorer";
/** The section chain: what each section lists and holds. A host declares its sections as data. */
export { editor_slices, useChain,
         type Chain, type Mark, type Row, type Slice } from "@mnd/explorer";
/** The tray, and the state a shell keeps for it and for the drawing. Handed no `onAct` it only
 *  reads; its workspace tab still sets how the drawing looks. */
export { Tray, useDisplay, useTray,
         type Display, type Extra, type Hold, type Pointed, type TrayProps } from "@mnd/tray";
/** Markdown as every card and tray draws it: React elements, never an HTML string. And the one
 *  card face every surface draws. */
export { CardFace, Inline, Markdown, type FaceProps } from "@mnd/theme";
export { WorkspaceHeader, TrayFrame, Icon,
         type WorkspaceHeaderProps, type TrayFrameProps } from "./shell";

/** What `Explorer` hands back. A name and arguments — never a mutation. */
export type { Act, Args } from "@mnd/core";
