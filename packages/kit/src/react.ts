/** The React half of the seam, behind its own entry. */

export { type ViewerProps, Viewer } from "./viewer";
export { type ExplorerProps, Explorer } from "@mnd/explorer";
export { WorkspaceHeader, TrayFrame, Icon,
         type WorkspaceHeaderProps, type TrayFrameProps } from "./shell";

/** What `Explorer` hands back. A name and arguments — never a mutation. */
export type { Act, Args } from "@mnd/core";
