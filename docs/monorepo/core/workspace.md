# Workspace
The workspace maintains the session state and supports importing new packages (initially locked package `folder` blocks) or exporting subsets of the working project graph. The workspace is represented as a folder that contains the graph root and any imported package snapshots. The workspace resolves package definition import order and maintains the action log.
