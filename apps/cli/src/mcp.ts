/** **The tools over MCP** (docs/tools/README.md *Surface*): a thin wrapper over the same commands
 *  the CLI runs — `fact`, `draw`, `presentation` — on stdio, each answering as the CLI prints.
 *  Run as `npm run mcp -w @mnd/cli`. Nothing here decides anything a command does not. */

import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fact, FACTS } from "@mnd/ts";
import { diagram_file, draft, presentations, DRAWN } from "./tools";

const server = new McpServer({ name: "mnd", version: "0.0.0" });

/** A command's answer as text, or what went wrong as an error. */
function answer(run: () => unknown) {
  try {
    const out = run();
    return { content: [{ type: "text" as const,
                         text: typeof out === "string" ? out : JSON.stringify(out, null, 2) }] };
  } catch (e) {
    return { isError: true, content: [{ type: "text" as const,
                                        text: e instanceof Error ? e.message : String(e) }] };
  }
}

server.registerTool("fact", {
  description: "One question of a project's source, as JSON, each fact anchored to its file "
    + "(docs/tools/): entries, edges, runtimes, units, calls, data, workflows, schema, trace.",
  inputSchema: { name: z.enum(FACTS), project: z.string(), unit: z.string().optional(),
                 from: z.string().optional(), at: z.string().optional(),
                 of: z.string().optional(), depth: z.number().optional(),
                 run: z.string().optional()
                   .describe("trace only: the command to run in the project") },
}, ({ name, project, ...asked }) => answer(() => fact(name, resolve(project), asked)));

server.registerTool("draw", {
  description: "A diagram file of one kind from a selection (a diagram file's map), as YAML, "
    + "with warnings below the floor. The caller writes it.",
  inputSchema: { kind: z.string().describe(DRAWN.join(", ")),
                 selection: z.record(z.string(), z.unknown()) },
}, ({ kind, selection }) => answer(() => {
  const drawn = diagram_file(kind, selection);
  return [...drawn.warnings.map((w) => `# warning: ${w}`), drawn.text].join("\n");
}));

server.registerTool("presentation_list", {
  description: "A model file's presentations and their stops.",
  inputSchema: { model: z.string() },
}, ({ model }) => answer(() => presentations(model)));

server.registerTool("presentation_draft", {
  description: "The model file with a presentation seeded from a flow or sequence diagram file "
    + "added, one step per relation; returned, not written.",
  inputSchema: { model: z.string(), from: z.string(), as: z.string().optional() },
}, ({ model, from, as }) => answer(() => draft(model, from, as)));

await server.connect(new StdioServerTransport());
