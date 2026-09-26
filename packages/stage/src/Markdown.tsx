/** Markdown on a card, as React elements: never an HTML string, so nothing a document says runs.
 *
 *  `marked` reads it; this draws the few things a card has room for — paragraphs, lists, quotes,
 *  fences, and inline emphasis, code and links. A link answers ctrl+click alone: a plain click is
 *  the card's, which picks it. */

import { type MouseEvent, type ReactNode } from "react";
import { Lexer, type Token, type Tokens } from "marked";

/** Where a link may lead: the web, mail, or a path with no scheme. Any other scheme is text. */
const SAFE = /^(https?:|mailto:|(?![a-z][a-z0-9+.-]*:))/i;


/** A body: blocks of markdown. */
export function Markdown({ text, className }: { text: string; className?: string }) {
  return <div className={className}>{blocks(new Lexer().lex(text))}</div>;
}

/** One line of inline markdown: a field value, say. */
export function Inline({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{inline(Lexer.lexInline(text))}</span>;
}

/** What inline markdown reads as, with its markup gone. */
export function plain(text: string): string {
  const flat = (tokens: Token[]): string => tokens
    .map((t) => ("tokens" in t && t.tokens ? flat(t.tokens) : "text" in t ? String(t.text) : ""))
    .join("");
  return flat(Lexer.lexInline(text)).trim();
}


function blocks(tokens: Token[]): ReactNode[] {
  return tokens.map((t, n) => {
    switch (t.type) {
      case "paragraph":
      case "text":
        return <p key={n}>{inline((t as Tokens.Paragraph).tokens ?? [])}</p>;
      case "heading":
        return <p key={n} className="md-heading">{inline((t as Tokens.Heading).tokens)}</p>;
      case "code":
        return <pre key={n}><code>{(t as Tokens.Code).text}</code></pre>;
      case "blockquote":
        return <blockquote key={n}>{blocks((t as Tokens.Blockquote).tokens)}</blockquote>;
      case "list": {
        const list = t as Tokens.List;
        const items = list.items.map((item, i) => (
          <li key={i} {...(item.task ? { "data-task": item.checked ? "done" : "open" } : {})}>
            {blocks(item.tokens.filter((k) => k.type !== "checkbox"))}
          </li>
        ));
        return list.ordered ? <ol key={n}>{items}</ol> : <ul key={n}>{items}</ul>;
      }
      case "hr":
        return <hr key={n} />;
      case "space":
        return null;
      default:
        return <p key={n}>{t.raw}</p>;
    }
  });
}

function inline(tokens: Token[]): ReactNode[] {
  return tokens.map((t, n) => {
    switch (t.type) {
      case "strong": return <strong key={n}>{inline((t as Tokens.Strong).tokens)}</strong>;
      case "em": return <em key={n}>{inline((t as Tokens.Em).tokens)}</em>;
      case "del": return <del key={n}>{inline((t as Tokens.Del).tokens)}</del>;
      case "codespan": return <code key={n}>{(t as Tokens.Codespan).text}</code>;
      case "br": return <br key={n} />;
      case "link": return <Link key={n} link={t as Tokens.Link} />;
      case "image": return <span key={n} className="md-image">{(t as Tokens.Image).text}</span>;
      case "text": {
        const text = t as Tokens.Text;
        return text.tokens ? <span key={n}>{inline(text.tokens)}</span> : text.text;
      }
      case "escape": return (t as Tokens.Escape).text;
      default: return t.raw;
    }
  });
}

/** A link: drawn as one, followed on ctrl+click, and otherwise a part of its card. */
function Link({ link }: { link: Tokens.Link }) {
  const words = inline(link.tokens);
  if (!SAFE.test(link.href)) return <>{words}</>;
  /** A modified press is the link's, so the canvas must not also read it as a pick. */
  const follow = (e: MouseEvent) => {
    if (!(e.ctrlKey || e.metaKey)) { e.preventDefault(); return; }
    e.preventDefault();
    e.stopPropagation();
    window.open(link.href, "_blank", "noopener");
  };
  const held = (e: MouseEvent) => { if (e.ctrlKey || e.metaKey) e.stopPropagation(); };
  return (
    <a className="md-link" href={link.href} title={`${link.href} — ctrl+click to open`}
       draggable={false} onClick={follow} onMouseDown={held} onPointerDown={held}>
      {words}
    </a>
  );
}
