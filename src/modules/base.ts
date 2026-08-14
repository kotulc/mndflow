/** What this build ships as its own module.
 *
 *  The engine publishes components the same way anybody else would, through the
 *  one contract — so there is no privileged path a later module would have to
 *  be measured against. It grows as `style`, `view`, `constraints` and `rules`
 *  land. */

import { card } from "./card";
import type { Module } from "./index";

export const base: Module = { name: "base", components: [card] };
