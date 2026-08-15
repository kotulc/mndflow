/** What this build ships as its own module.
 *
 *  The engine publishes components the same way anybody else would, through the
 *  one contract — so there is no privileged path a later module would have to
 *  be measured against. */

import { card } from "./card";
import { constraints } from "./constraints";
import { rules } from "./rules";
import { style } from "./style";
import { view } from "./view";
import type { Module } from "./index";

export const base: Module = {
  name: "base",
  components: [card, constraints, rules, view, style],
};