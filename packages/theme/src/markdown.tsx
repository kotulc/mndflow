/** Markdown as React elements, the one renderer every card, tray and document reads through.
 *
 *  `react-markdown` with GitHub's tables and task lists: never an HTML string, so nothing a
 *  document says runs. A link answers ctrl+click alone: a plain click is whatever holds it. */

import { type MouseEvent, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** Where a link may lead: the web, mail, or a path with no scheme. Any other scheme is text. */
const SAFE = /^(https?:|mailto:|(?![a-z][a-z0-9+.-]*:))/i;

const PLUGINS = [remarkGfm];

/** The elements a single line of markdown may keep. */
const INLINE = ["p", "strong", "em", "del", "code", "a", "br"];

/** How each element draws, where it differs from plain HTML. */
const PARTS: Components = {
  a: ({ href, children }) => <Link href={href ?? ""}>{children}</Link>,
  img: ({ src, alt }) => (
    <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} draggable={false}
         onError={(e) => { e.currentTarget.hidden = true; }} />
  ),
};

/** A line keeps its words and drops the paragraph round them. */
const LINE: Components = { ...PARTS, p: ({ children }) => <>{children}</> };


/** Blocks of markdown. */
export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={PLUGINS} components={PARTS}>{text}</ReactMarkdown>
    </div>
  );
}

/** One line of inline markdown: a value, say, or a heading. */
export function Inline({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      <ReactMarkdown remarkPlugins={PLUGINS} components={LINE} allowedElements={INLINE}
                     unwrapDisallowed>{text}</ReactMarkdown>
    </span>
  );
}

/** What inline markdown reads as, with its markup gone. */
export function plain(text: string): string {
  return text.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*_~]+/g, "").trim();
}


/** A link: drawn as one, followed on ctrl+click, and otherwise a part of what holds it. */
function Link({ href, children }: { href: string; children?: ReactNode }) {
  if (!SAFE.test(href)) return <>{children}</>;
  /** A modified press is the link's, so the canvas must not also read it as a pick. */
  const follow = (e: MouseEvent) => {
    e.preventDefault();
    if (!(e.ctrlKey || e.metaKey)) return;
    e.stopPropagation();
    window.open(href, "_blank", "noopener");
  };
  const held = (e: MouseEvent) => { if (e.ctrlKey || e.metaKey) e.stopPropagation(); };
  return (
    <a className="md-link" href={href} title={`${href} — ctrl+click to open`}
       draggable={false} onClick={follow} onMouseDown={held} onPointerDown={held}>
      {children}
    </a>
  );
}
