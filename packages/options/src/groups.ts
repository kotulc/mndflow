import { ANNOTATIONS, KIND_MARKS, type Act, type Dir } from "@mnd/core";
import { role_icon, type IconName } from "@mnd/theme";

/** One control. **One icon, lit or not** — a setting draws the same mark whichever way it is
 *  set, and `on` is what says which. A verb leaves `on` undefined, since there is no state a
 *  verb puts anything in. */
export type Control = {
  key: string;
  icon: IconName;
  word: string;
  tip: string;
  on?: boolean;
  /** One-shot: it does something and is done. */
  verb?: boolean;
  /** A rule above this control, where a group's seam is not setting against verb. */
  ruled?: boolean;
  /** What dragging it onto the drawing carries: a definition to make a block of. */
  drags?: string;
  run: () => void;
};

export type Group = {
  key: string;
  label: string;
  controls: Control[];
};

/** What the shell knows about the thing on the stage. **The rail is the palette and the quick
 *  editor, never a choice of view**: how a room draws is the workspace's display. */
export type Chrome = {
  /** Which groups the projection offers. */
  slots: readonly string[];
  /** The diagram family of the room in focus, whose notation the palette offers. */
  family?: string | null;
  /** The package the focus is in, for its quick edit. */
  pkg?: string | null;
  /** Whether a selection is in hand, for the palette's group. */
  picked?: boolean;
  /** What a right drag draws: which module, which way it points, and which relation type. */
  module?: string;
  dir?: Dir;
  type?: string;
  /** The relation definitions the open packages hold. */
  types?: readonly { id: string; name: string }[];
};


/** What a palette entry is, in a few words. */
const NOTATION: Record<string, string> = {
  start: "Where it begins", decision: "A choice with a way out per answer",
  end: "Where it ends", note: "A remark on the drawing", label: "A word tied to what it names",
  group: "A box round what is picked", region: "A band across the room",
};

/** What a right drag may draw: a line, straight or directed, or a tie. */
const LINES: { key: string; module: string; dir?: Dir;
               icon: IconName; word: string; tip: string }[] = [
  { key: "plain", module: "line", icon: "relation_plain", word: "straight",
    tip: "A right drag makes a plain line" },
  { key: "directed", module: "line", dir: "forward", icon: "relation_directed",
    word: "directed", tip: "A right drag makes a line that points" },
  { key: "tie", module: "tie", icon: "relation_tie", word: "tie",
    tip: "A right drag makes a tie: a dashed run with no heads" },
];

/** The standard groups, from the slots a projection declared. */
export function groups_of(chrome: Chrome, act: Act): Group[] {
  const has = (slot: string) => chrome.slots.includes(slot);
  const out: Group[] = [];

  /** The notation for the focus's family, then what every room may hold: clicked in, or dragged
   *  where it goes. */
  if (has("palette")) {
    const kinds = [...(KIND_MARKS[chrome.family ?? ""] ?? []), ...ANNOTATIONS];
    out.push({
      key: "palette", label: "palette",
      controls: kinds.map((kind, n): Control => ({
        key: kind, icon: role_icon(kind), word: kind, verb: true,
        tip: kind === "group" && !chrome.picked ? `${NOTATION[kind]}: pick what it holds first`
          : `${NOTATION[kind]}. Click to add it, or drag it where it goes`,
        ...(n === kinds.length - ANNOTATIONS.length && n > 0 ? { ruled: true } : {}),
        ...(kind === "group" ? {} : { drags: kind }),
        run: () => act("@notation", { type: kind }),
      })),
    });
  }

  /** The quick editor: the workspace, the open package, and something new in the focus. */
  out.push({
    key: "workspace", label: "workspace",
    controls: [
      { key: "workspace", icon: "word_wks", word: "workspace", verb: true,
        tip: "The workspace's name, description, file and display", run: () => act("@workspace") },
      ...(chrome.pkg ? [{ key: "package", icon: "word_pkg" as const, word: "package", verb: true,
        tip: "The open package's name and description", run: () => act("@package_info") }] : []),
    ],
  });
  if (has("make")) {
    out.push({
      key: "make", label: "make",
      controls: [
        { key: "usage", icon: "role_leaf", word: "usage", verb: true,
          tip: "A new block in the room in focus", run: () => act("@new_usage") },
        { key: "definition", icon: "word_def", word: "definition", verb: true,
          tip: "A new definition in this package, to make usages of",
          run: () => act("@new_definition") },
      ],
    });
  }

  /** What a right drag makes: a plain run, or a relation the open packages define. */
  if (has("relations")) {
    out.push({
      key: "relations", label: "relations",
      controls: [
        ...LINES.map((l): Control => ({
          key: `line:${l.key}`, icon: l.icon, word: l.word, tip: l.tip,
          on: !chrome.type && (chrome.module ?? "line") === l.module
            && (chrome.dir ?? "none") === (l.dir ?? "none"),
          run: () => act("relate_with", { module: l.module, dir: l.dir ?? "none" }),
        })),
        ...(chrome.types ?? []).map((t, n): Control => ({
          key: `type:${t.id}`, icon: "relation_directed", word: t.name, on: chrome.type === t.id,
          tip: `A right drag makes a ${t.name} relation`,
          ...(n === 0 ? { ruled: true } : {}),
          run: () => act("relate_with", { module: "line", type: t.id }),
        })),
      ],
    });
  }

  return out;
}
