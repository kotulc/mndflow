/** Lighting by sweep: every kind of surface, clicked in the real app, wears the accent. */

import { join } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { createServer, type ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../..");
/** How many of each surface kind are clicked. */
const EACH = 3;
/** Where a node's picked look is drawn, inside the node. */
const FACE = ".mnd-card, .mnd-chip, .mnd-box, .mnd-group, .mnd-tile, .mnd-seat";

/** The views swept, each reached from a fresh load. */
const VIEWS: Record<string, (page: Page) => Promise<void>> = {
  "models map": async () => {},
  "library map": async (page) => {
    await page.getByText("library", { exact: true }).first().click();
  },
  "block definition": async (page) => {
    await page.getByText("library", { exact: true }).first().click();
    await page.waitForTimeout(1000);
    await chip(page, "block").dblclick({ force: true });
  },
  "Storefront diagram": async (page) => {
    await chip(page, "Storefront").dblclick({ force: true });
  },
};

let server: ViteDevServer;
let browser: Browser;
let url: string;


/** A chip on the map by its name. */
function chip(page: Page, name: string) {
  return page.locator(".mnd-chip-name").getByText(name, { exact: true }).first();
}

/** Opens the app and goes to a view. */
async function go(page: Page, view: string) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await VIEWS[view](page);
  await page.waitForTimeout(1200);
}

/** Every surface in the view, by kind: nodes by React Flow type, chip tiles by class. */
function surfaces(page: Page): Promise<{ kind: string, sel: string }[]> {
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll<HTMLElement>(".react-flow__node")].map((e) => ({
      kind: e.className.match(/react-flow__node-(\w+)/)?.[1] ?? "node",
      sel: `.react-flow__node[data-id="${CSS.escape(e.dataset.id ?? "")}"]` }));
    const tiled = document.querySelectorAll<HTMLElement>(".react-flow [data-tile]");
    const tiles = [...tiled].map((e) => ({
      kind: "tile:" + (e.className.split(" ")[1] || "card"),
      sel: `[data-tile="${CSS.escape(e.dataset.tile ?? "")}"]` }));
    return [...nodes, ...tiles].filter((s) => s.kind !== "frame");
  });
}

/** Whether the surface's face wears the accent, read from its computed style. */
function wears(page: Page, sel: string): Promise<string> {
  return page.evaluate(([sel, face_sel]) => {
    const el = document.querySelector(sel);
    if (!el) return "gone";
    const face = el.matches("[data-tile]") ? el : el.querySelector(face_sel) ?? el;

    // The accent as this face resolves it, so the check holds under every theme
    const probe = face.appendChild(document.createElement("i"));
    probe.style.color = "var(--accent)";
    const accent = getComputedStyle(probe).color;
    probe.remove();

    const s = getComputedStyle(face);
    const on = [s.boxShadow, s.borderColor].some((v) => v.includes(accent));
    return on ? "ok" : `${face.className}: ring ${s.boxShadow.slice(0, 60)}`;
  }, [sel, FACE] as const);
}


beforeAll(async () => {
  server = await createServer({ configFile: join(ROOT, "apps/web/vite.config.ts"),
                                server: { port: 5190 }, logLevel: "error" });
  await server.listen();
  url = server.resolvedUrls!.local[0];
  browser = await chromium.launch({ channel: "msedge" });
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

describe("a picked surface", () => {
  it.each(Object.keys(VIEWS))("wears the accent on the %s", async (view) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.setDefaultTimeout(4000);
    await go(page, view);

    // Up to EACH of every kind, each clicked from a fresh load of the view
    const by_kind = Object.groupBy(await surfaces(page), (s) => s.kind);
    const misses: string[] = [];
    for (const [kind, items] of Object.entries(by_kind)) {
      for (const { sel } of items!.slice(0, EACH)) {
        await go(page, view);
        const plain = kind.startsWith("tile") || kind === "group";
        const target = page.locator(kind === "group" ? `${sel} .mnd-group-title` : sel).first();
        if (!(await target.isVisible())) continue;
        /** A place's box (`def@place`) is clicked on its title: its middle may be a use's tile. */
        const place = kind === "tile:group" && sel.includes("@");
        const at = place ? { x: 3, y: 3 } : plain ? undefined : { x: 6, y: 6 };
        await target.click({ force: true, position: at });
        await page.waitForTimeout(1000);
        await page.mouse.move(2, 450);
        await page.waitForTimeout(200);
        const look = await wears(page, sel);
        if (look !== "ok") misses.push(`${kind} ${sel}: ${look}`);
      }
    }

    expect(Object.keys(by_kind).length).toBeGreaterThan(0);
    expect(misses).toEqual([]);
    expect(errors).toEqual([]);
    await page.close();
  });
});
