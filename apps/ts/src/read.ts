/** A TypeScript project read into plain data: its packages, their modules, what each module
 *  declares, and what it imports. ts-morph does the parsing and resolving; this keeps what the
 *  `ts` package's kinds say and nothing else. */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { Node, Project, SyntaxKind, type ClassDeclaration, type InterfaceDeclaration,
         type JSDocableNode, type ParameterDeclaration, type SourceFile, type TypeAliasDeclaration,
         type TypeNode } from "ts-morph";

/** A project: its name and line, and its packages. */
export type Code = { name: string; description?: string; packages: Pkg[] };

/** A package: where it sits (`packages/core`), its group (`packages`), its name, its modules, and
 *  the packages it imports, by `dir`. */
export type Pkg = { dir: string; group: string; name: string; version?: string;
                    description?: string; modules: Mod[]; uses: string[] };

/** A module: its file, its steps under the source folder (`["actions", "blocks"]`), its first
 *  line of doc, its length, its functions and values, the types it declares, the modules of its
 *  own package it imports, the calls it makes into them, and whether the code is entered by it:
 *  a barrel, passing others' exports on, or a file wiring the code (`wiring`). */
export type Mod = { path: string; steps: string[]; description?: string; lines: number;
                    parts: Part[]; defs: Def[]; types: Datatype[]; imports: Import[];
                    calls: Call[]; entry?: boolean };

/** A module imported: its `path`, the names read from it, and how many (at least 1). */
export type Import = { path: string; symbols: number; names: string[] };

/** A call into another module of the package, in source order: the function it is made from
 *  (`(top)` outside any), the module called, the name called, and where (`at`, a position). A
 *  `new` and a JSX element count. */
export type Call = { from: string; to: string; name: string; at: number };

/** A function or value a module declares. */
export type Part = { name: string; kind: "function" | "value"; signature: string;
                     description?: string; exported: boolean; source: string };

/** An interface, class or object type: a block definition. */
export type Def = { id: string; name: string; kind: "interface" | "class" | "type-alias";
                    description?: string; extends?: string; also?: string[]; fields: Field[];
                    methods: string[]; source: string };

/** A field: its type is a form, a datatype's id, or a definition's id (`link`). */
export type Field = { name: string; type: string; many?: boolean; optional?: boolean;
                      note?: string; link?: boolean };

/** An enum or an alias: a library type. */
export type Datatype = { id: string; name: string; form: "choice" | "text"; choices?: string[];
                         description?: string; note?: string };

/** Where a declaration is found: its file and name. */
type Key = string;

/** How long a signature or a type's words may run before they are cut short. */
const LONG = 160;

/** The files read: code, never declarations, tests or configs. */
const CODE = /\.(tsx?|jsx?)$/;
const LEFT_OUT = /(\.d\.ts|\.(test|spec|config|setup)\.[jt]sx?)$/;

/** The files read only where they import the project's code: configs and MDX pages. */
const WIRING = "{.config.ts,.config.tsx,.config.js,.config.jsx,.config.mjs,.mdx}";

/** Folders never read: installed, built, generated or tests. */
const SKIPPED = new Set(["node_modules", "dist", "build", "out", ".next", ".types", "coverage",
                         "test", "tests", "__tests__", "e2e"]);


/** A project read: every code file under a package's source folder (`src_of`), by its
 *  tsconfig where it has one, else as JavaScript. */
export function read_code(root: string, tsconfig = join(root, "tsconfig.json")): Code {
  const typed = existsSync(tsconfig);
  const project = typed ? new Project({ tsConfigFilePath: tsconfig })
    : new Project({ compilerOptions: { allowJs: true, jsx: 1 } });
  const glob = root.split(sep).join("/");
  if (!typed) project.addSourceFilesAtPaths([`${glob}/**/*.{ts,tsx,js,jsx}`,
                                             `!${glob}/**/node_modules/**`]);
  const files = project.getSourceFiles().filter((f) => in_scope(root, f.getFilePath()));
  const scoped = new Set(files.map((f) => f.getFilePath()));
  const wired = wiring(root, project, scoped);
  for (const w of wired) {
    files.push(w);
    scoped.add(w.getFilePath());
  }
  const manifest = json(join(root, "package.json"));
  const pkgs = new Map<string, Pkg>();
  const pkg_of = (file: SourceFile) => package_dir(root, file.getFilePath());

  /** Every declaration's id first, so a field names one declared anywhere. */
  const ids = new Map<Key, string>();
  for (const file of files) {
    const dir = pkg_of(file)!;
    const at = [...(dir === "." ? [] : dir.split("/")), ...steps_at(root, file)];
    for (const d of declared(file)) ids.set(key_of(file, d.name), `${d.kind}.${at.join(".")}.${d.name}`);
  }

  for (const file of files) {
    const dir = pkg_of(file)!;
    if (!pkgs.has(dir)) pkgs.set(dir, package_of(root, dir));
    const pkg = pkgs.get(dir)!;
    const mod: Mod = { path: rel(root, file.getFilePath()), steps: steps_at(root, file),
                       lines: file.getEndLineNumber(), parts: parts_of(root, file), defs: [],
                       types: [], imports: imports_of(root, file, scoped, pkg_of),
                       calls: calls_of(root, file, scoped, pkg_of),
                       ...(barrel(file) || wired.includes(file) ? { entry: true } : {}),
                       ...said(module_doc(file)) };
    for (const decl of file.getInterfaces()) mod.defs.push(def_of(root, decl, "interface", ids));
    for (const decl of file.getClasses()) {
      if (decl.getName()) mod.defs.push(def_of(root, decl, "class", ids));
    }
    for (const decl of file.getTypeAliases()) {
      const node = decl.getTypeNode();
      if (node && object_like(node)) mod.defs.push(def_of(root, decl, "type-alias", ids));
      else mod.types.push(alias_of(decl, ids));
    }
    for (const decl of file.getEnums()) {
      mod.types.push({ id: ids.get(key_of(file, decl.getName()))!, name: decl.getName(),
                       form: "choice", choices: decl.getMembers().map((m) => m.getName()),
                       ...said(doc(decl)) });
    }
    mod.defs = once(mod.defs);
    mod.types = once(mod.types);

    /** Other packages, by any file an import or re-export names. */
    for (const to of specified(file).filter((f) => scoped.has(f.getFilePath()))) {
      const other = pkg_of(to)!;
      if (other !== dir && !pkg.uses.includes(other)) pkg.uses.push(other);
    }
    pkg.modules.push(mod);
  }
  /** A scoped name (`@scope/name`) is its last part: a name is one step, and a file's name. */
  const name = String(manifest?.["name"] ?? root.split(sep).pop()).replace(/^@[^/]+\//, "");
  return { name: name.replace(/[./]/g, "-"),
           ...said(String(manifest?.["description"] ?? "")),
           packages: [...pkgs.values()].sort((a, z) => a.dir.localeCompare(z.dir)) };
}

/** Whether a file is translated: code under its package's source folder, never in a skipped
 *  folder, and never a declaration file, a test or a config. */
function in_scope(root: string, path: string): boolean {
  const at = rel(root, path);
  if (!CODE.test(at) || LEFT_OUT.test(at) || at.split("/").some((s) => SKIPPED.has(s))) {
    return false;
  }
  const dir = package_dir(root, path);
  return !!dir && at.startsWith(src_of(root, dir));
}

/** Files wiring the code without being it, anywhere in a package: configs, and MDX pages by their
 *  import lines; each read only where it imports the project's own code. */
function wiring(root: string, project: Project, scoped: Set<string>): SourceFile[] {
  const glob = root.split(sep).join("/");
  const found = project.getFileSystem().globSync([`${glob}/**/*${WIRING}`,
                                                  `!${glob}/**/{${[...SKIPPED].join(",")}}/**`]);
  const out: SourceFile[] = [];
  for (const path of found) {
    if (!package_dir(root, path)) continue;
    const file = path.endsWith(".mdx")
      ? project.createSourceFile(`${path}.tsx`, mdx_of(readFileSync(path, "utf8")),
                                 { overwrite: true })
      : project.getSourceFile(path) ?? project.addSourceFileAtPath(path);
    if (specified(file).some((f) => scoped.has(f.getFilePath()))) out.push(file);
  }
  return out;
}

/** An MDX page as code: its import lines, then each component it uses as an element
 *  (`<TagList …`), in the order first used, one element apiece — so its uses count as calls. */
function mdx_of(text: string): string {
  const imports = text.split("\n").filter((l) => /^import\s/.test(l));
  const used = [...text.matchAll(/<([A-Z][\w.]*)/g)].map((m) => m[1]!)
    .filter((n, i, all) => all.indexOf(n) === i);
  return [...imports, ...used.map((n) => `export const _${n.replace(/\W/g, "_")} = <${n} />;`)]
    .join("\n");
}

/** A package's source folder, from the root, with its slash: its `src` where it has one, else
 *  the package's own folder. */
function src_of(root: string, dir: string): string {
  const at = dir === "." ? "" : `${dir}/`;
  return existsSync(join(root, at, "src")) ? `${at}src/` : at;
}

/** The modules of its own package a file imports, by the files declaring what it reads, so an
 *  import through a barrel counts the module behind it; each with the names it reads. */
function imports_of(root: string, file: SourceFile, scoped: Set<string>,
                    pkg_of: (f: SourceFile) => string | undefined): Import[] {
  const read = new Map<string, string[]>();
  const add = (to: SourceFile | undefined, name?: string) => {
    if (!to || to === file || !scoped.has(to.getFilePath()) || pkg_of(to) !== pkg_of(file)) return;
    const path = rel(root, to.getFilePath());
    read.set(path, [...(read.get(path) ?? []), ...(name ? [name] : [])]);
  };
  const each = (names: Node[], fallback: SourceFile | undefined) => {
    if (!names.length) add(fallback);
    for (const n of names) add(declared_in(n) ?? fallback, n.getText());
  };
  for (const d of file.getImportDeclarations()) {
    const names: Node[] = d.getNamedImports().map((n) => n.getNameNode());
    const fallback = d.getDefaultImport();
    if (fallback) names.push(fallback);
    each(names, d.getModuleSpecifierSourceFile());
  }
  for (const d of file.getExportDeclarations()) {
    each(d.getNamedExports().map((n) => n.getNameNode()), d.getModuleSpecifierSourceFile());
  }
  /** `require` calls, by the names each is destructured into. */
  for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const [arg] = call.getArguments();
    if (call.getExpression().getText() !== "require" || !arg || !Node.isStringLiteral(arg)) continue;
    const to = arg.getSymbol()?.getDeclarations()[0];
    const bound = call.getParentIfKind(SyntaxKind.VariableDeclaration)?.getNameNode();
    const names = bound && Node.isObjectBindingPattern(bound)
      ? bound.getElements().map((e) => e.getPropertyNameNode()?.getText() ?? e.getName()) : [];
    const from = to && Node.isSourceFile(to) ? to : undefined;
    if (!names.length) add(from);
    for (const n of names) add(from, n);
  }
  return [...read].map(([path, names]) => {
    const kept = [...new Set(names)];
    return { path, symbols: Math.max(kept.length, 1), names: kept };
  });
}

/** The calls a file makes into other modules of its package, in source order, each by the name
 *  its callee resolves to: a call, a `new`, a JSX element. */
function calls_of(root: string, file: SourceFile, scoped: Set<string>,
                  pkg_of: (f: SourceFile) => string | undefined): Call[] {
  const out: Call[] = [];
  file.forEachDescendant((n) => {
    const callee = Node.isCallExpression(n) || Node.isNewExpression(n) ? n.getExpression()
      : Node.isJsxOpeningElement(n) || Node.isJsxSelfClosingElement(n) ? n.getTagNameNode()
      : undefined;
    if (!callee) return;
    const name = Node.isPropertyAccessExpression(callee) ? callee.getNameNode() : callee;
    if (!Node.isIdentifier(name)) return;
    const to = declared_in(name);
    if (!to || to === file || !scoped.has(to.getFilePath()) || pkg_of(to) !== pkg_of(file)) return;
    out.push({ from: caller_of(n), to: rel(root, to.getFilePath()), name: name.getText(),
               at: n.getStart() });
  });
  return out;
}

/** The function a node sits in, by its name: a declared function, a method, or a function bound
 *  to a name; `(top)` outside any. */
function caller_of(n: Node): string {
  for (let at = n.getParent(); at; at = at.getParent()) {
    if (Node.isFunctionDeclaration(at) || Node.isMethodDeclaration(at)) return at.getName() ?? "(top)";
    if (Node.isVariableDeclaration(at) && at.getInitializer() && (Node.isArrowFunction(at.getInitializer())
        || Node.isFunctionExpression(at.getInitializer()))) return at.getName();
  }
  return "(top)";
}

/** The file declaring what a name refers to, through any import or re-export. */
function declared_in(name: Node): SourceFile | undefined {
  let symbol = name.getSymbol();
  if (symbol?.isAlias()) symbol = symbol.getAliasedSymbol();
  return symbol?.getDeclarations()[0]?.getSourceFile();
}

/** Every file a file's imports and re-exports name. */
function specified(file: SourceFile): SourceFile[] {
  return [...file.getImportDeclarations(), ...file.getExportDeclarations()]
    .map((d) => d.getModuleSpecifierSourceFile()).filter((f): f is SourceFile => !!f);
}

/** Whether a file only imports and passes on other modules' exports. */
function barrel(file: SourceFile): boolean {
  const all = file.getStatements();
  return all.some((s) => Node.isExportDeclaration(s))
    && all.every((s) => Node.isExportDeclaration(s) || Node.isImportDeclaration(s));
}

/** The package a file is in: the nearest folder above it holding a `package.json`, from the root. */
function package_dir(root: string, path: string): string | undefined {
  for (let at = dirname(path); at.length >= root.length; at = dirname(at)) {
    if (existsSync(join(at, "package.json"))) return rel(root, at) || ".";
    if (dirname(at) === at) break;
  }
  return undefined;
}

/** A package's name, group, version and line, from its manifest; the root's is its folder's. */
function package_of(root: string, dir: string): Pkg {
  const manifest = json(join(root, dir, "package.json"));
  const parts = dir.split("/");
  return { dir, group: parts.length > 1 ? parts.slice(0, -1).join("/") : "",
           name: (dir === "." ? root.split(sep).pop()! : parts[parts.length - 1]!)
             .replace(/\./g, "-"),
           ...(manifest?.["version"] ? { version: String(manifest["version"]) } : {}),
           ...said(String(manifest?.["description"] ?? "")), modules: [], uses: [] };
}

/** A file's steps: its folders under its package's `src`, then its name. A dot in a name is
 *  written `-`, since a dot steps down a path. */
function steps_at(root: string, file: SourceFile): string[] {
  const dir = package_dir(root, file.getFilePath())!;
  const under = rel(root, file.getFilePath()).slice(src_of(root, dir).length).split("/");
  const stem = under.pop()!.replace(/\.([jt]sx?|mdx)$/, "");
  return [...under, stem].map((s) => s.replace(/\./g, "-"));
}

/** A module's functions and values, each by its first name. */
function parts_of(root: string, file: SourceFile): Part[] {
  const out: Part[] = [];
  const path = rel(root, file.getFilePath());
  const span = (n: Node) => `${path}#L${n.getStartLineNumber()}-L${n.getEndLineNumber()}`;
  for (const fn of file.getFunctions()) {
    const name = fn.getName();
    if (!name) continue;
    out.push({ name, kind: "function", signature: signature(name, fn.getParameters(),
                 fn.getReturnTypeNode()), exported: fn.isExported(), source: span(fn),
               ...said(doc(fn)) });
  }
  for (const stmt of file.getVariableStatements()) {
    for (const v of stmt.getDeclarations()) {
      const init = v.getInitializer();
      const fn = init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))
        ? init : undefined;
      const typed = v.getTypeNode()?.getText();
      out.push({ name: v.getName(), kind: fn ? "function" : "value",
                 signature: fn ? signature(v.getName(), fn.getParameters(), fn.getReturnTypeNode())
                   : cut(`${v.getName()}: ${typed ?? v.getType().getText(v)}`),
                 exported: stmt.isExported(), source: span(stmt), ...said(doc(stmt)) });
    }
  }
  return once(out);
}

/** `name(a: A, b: B): R`, in one line. */
function signature(name: string, params: ParameterDeclaration[], ret?: TypeNode): string {
  const each = params.map((p) => {
    const type = p.getTypeNode()?.getText();
    return `${p.getName()}${p.hasQuestionToken() ? "?" : ""}${type ? `: ${type}` : ""}`;
  });
  return cut(`${name}(${each.join(", ")})${ret ? `: ${ret.getText()}` : ""}`);
}

/** An interface, class or object type as a definition: its fields, its methods' signatures, and
 *  what it extends — the first of the repo's own, the rest said beside it. */
function def_of(root: string, decl: InterfaceDeclaration | ClassDeclaration | TypeAliasDeclaration,
                kind: Def["kind"], ids: Map<Key, string>): Def {
  const file = decl.getSourceFile();
  const name = decl.getName()!;
  const fields: Field[] = [];
  const methods: string[] = [];
  const bases: string[] = [];
  const field = (n: string, type: TypeNode | undefined, optional: boolean) => {
    if (!fields.some((f) => f.name === n)) fields.push({ name: n, ...field_type(type, ids),
                                                         ...(optional ? { optional } : {}) });
  };
  const heritage = (expr: Node) => {
    const id = Node.isExpressionWithTypeArguments(expr) ? id_of(expr.getExpression(), ids)
      : Node.isTypeReference(expr) ? id_of(expr.getTypeName(), ids) : undefined;
    if (id) bases.push(id);
  };
  const members = (list: Node[]) => {
    for (const m of list) {
      if (Node.isPropertySignature(m) || Node.isPropertyDeclaration(m)) {
        field(m.getName(), m.getTypeNode(), m.hasQuestionToken());
      }
      else if (Node.isMethodSignature(m) || Node.isMethodDeclaration(m)) {
        methods.push(signature(m.getName(), m.getParameters(), m.getReturnTypeNode()));
      }
    }
  };
  if (Node.isInterfaceDeclaration(decl)) {
    members(decl.getMembers());
    decl.getExtends().forEach(heritage);
  }
  else if (Node.isClassDeclaration(decl)) {
    members(decl.getMembers().filter((m) => !(Node.isStaticable(m) && m.isStatic())));
    const up = decl.getExtends();
    if (up) heritage(up);
    decl.getImplements().forEach(heritage);
  }
  else {
    /** An object type, or an intersection of object types and the repo's own. */
    const node = decl.getTypeNode()!;
    for (const part of Node.isIntersectionTypeNode(node) ? node.getTypeNodes() : [node]) {
      if (Node.isTypeLiteral(part)) members(part.getMembers());
      else heritage(part);
    }
  }
  const defs = bases.filter((b) => b.startsWith("def."));
  return { id: ids.get(key_of(file, name))!, name, kind, fields, methods,
           source: `${rel(root, file.getFilePath())}#L${decl.getStartLineNumber()}-L${decl.getEndLineNumber()}`,
           ...(defs.length ? { extends: defs[0] } : {}),
           ...(defs.length > 1 ? { also: defs.slice(1) } : {}), ...said(doc(decl)) };
}

/** An alias that is not an object type: a choice where it is a union of words, else text. */
function alias_of(decl: TypeAliasDeclaration, ids: Map<Key, string>): Datatype {
  const node = decl.getTypeNode();
  const words = node && Node.isUnionTypeNode(node) ? node.getTypeNodes() : [];
  const literal = words.length > 0 && words.every((w) => Node.isLiteralTypeNode(w)
    && Node.isStringLiteral(w.getLiteral()));
  const base = { id: ids.get(key_of(decl.getSourceFile(), decl.getName()))!,
                 name: decl.getName(), ...said(doc(decl)) };
  return literal
    ? { ...base, form: "choice", choices: words.map((w) => w.getText().slice(1, -1)) }
    : { ...base, form: "text", note: cut(node?.getText() ?? "") };
}

/** A field's type: what it is many of or may lack, then a form, one of the repo's types or
 *  definitions, else text with the words it was written in. */
function field_type(node: TypeNode | undefined, ids: Map<Key, string>): Omit<Field, "name"> {
  let many = false;
  let optional = false;
  let at = node;
  for (;;) {
    if (!at) break;
    if (Node.isTypeOperatorTypeNode(at)) { at = at.getTypeNode(); continue; }
    if (Node.isParenthesizedTypeNode(at)) { at = at.getTypeNode(); continue; }
    if (Node.isArrayTypeNode(at)) { many = true; at = at.getElementTypeNode(); continue; }
    if (Node.isUnionTypeNode(at)) {
      const kept = at.getTypeNodes().filter((t) => !/^(undefined|null)$/.test(t.getText()));
      if (kept.length < at.getTypeNodes().length) optional = true;
      if (kept.length === 1) { at = kept[0]; continue; }
    }
    if (Node.isTypeReference(at) && /^(Readonly)?Array$/.test(at.getTypeName().getText())
        && at.getTypeArguments().length === 1) {
      many = true;
      at = at.getTypeArguments()[0];
      continue;
    }
    break;
  }
  const flags = { ...(many ? { many } : {}), ...(optional ? { optional } : {}) };
  const text = at?.getText() ?? "";
  if (text === "string") return { type: "text", ...flags };
  if (text === "number") return { type: "number", ...flags };
  if (text === "boolean") return { type: "flag", ...flags };
  const id = at && Node.isTypeReference(at) ? id_of(at.getTypeName(), ids) : undefined;
  if (id) return { type: id, ...flags, ...(id.startsWith("def.") ? { link: true } : {}) };
  return { type: "text", ...flags, ...(text ? { note: cut(text) } : {}) };
}

/** The id of the repo's declaration a name refers to, through any import. */
function id_of(name: Node, ids: Map<Key, string>): string | undefined {
  let symbol = name.getSymbol();
  if (symbol?.isAlias()) symbol = symbol.getAliasedSymbol();
  const decl = symbol?.getDeclarations()[0];
  if (!decl) return undefined;
  return ids.get(key_of(decl.getSourceFile(), symbol!.getName()));
}

/** Every type a file declares, each with the kind its id is minted under. */
function declared(file: SourceFile): { name: string; kind: "def" | "datatype" }[] {
  const out: { name: string; kind: "def" | "datatype" }[] = [];
  for (const d of file.getInterfaces()) out.push({ name: d.getName(), kind: "def" });
  for (const d of file.getClasses()) if (d.getName()) out.push({ name: d.getName()!, kind: "def" });
  for (const d of file.getTypeAliases()) {
    const node = d.getTypeNode();
    out.push({ name: d.getName(), kind: node && object_like(node) ? "def" : "datatype" });
  }
  for (const d of file.getEnums()) out.push({ name: d.getName(), kind: "datatype" });
  return out;
}

/** Whether an alias is an object type: a literal, or an intersection holding one. */
function object_like(node: TypeNode): boolean {
  return Node.isTypeLiteral(node)
    || (Node.isIntersectionTypeNode(node) && node.getTypeNodes().some((t) => Node.isTypeLiteral(t)));
}

/** A module's own doc: the first doc comment, where an import or a second doc follows it. */
function module_doc(file: SourceFile): string {
  const first = file.getStatements()[0];
  if (!first) return "";
  const docs = first.getLeadingCommentRanges().filter((r) => r.getText().startsWith("/**"));
  const leads = first.isKind(SyntaxKind.ImportDeclaration) || first.isKind(SyntaxKind.ExportDeclaration);
  return docs.length && (leads || docs.length > 1) ? docs[0]!.getText() : "";
}

/** A declaration's doc comment, as written. */
function doc(node: JSDocableNode): string {
  return node.getJsDocs()[0]?.getText() ?? "";
}

/** A doc comment's first sentence, as a `description`. */
function said(comment: string): { description?: string } {
  const text = comment.replace(/^\/\*\*|\*\/$/g, "").split("\n")
    .map((l) => l.replace(/^\s*\*\s?/, "")).join(" ").split(/\s@\w/)[0]!
    .replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  const first = text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;
  return first ? { description: first } : {};
}

/** A list with only the first of each name. */
function once<T extends { name: string }>(list: readonly T[]): T[] {
  return list.filter((x, i) => list.findIndex((y) => y.name === x.name) === i);
}

/** Words cut short, in one line. */
function cut(text: string): string {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length > LONG ? `${one.slice(0, LONG - 1)}…` : one;
}

/** Where a declaration is found. */
function key_of(file: SourceFile, name: string): Key {
  return `${file.getFilePath()}#${name}`;
}

/** A path from the root, with forward slashes. */
function rel(root: string, path: string): string {
  return relative(root, path).split(sep).join("/").replace(/\.mdx\.tsx$/, ".mdx");
}

/** A JSON file's map, where there is a readable one. */
function json(path: string): Record<string, unknown> | undefined {
  try { return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>; }
  catch { return undefined; }
}
