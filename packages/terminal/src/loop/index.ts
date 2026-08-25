/** The question loop, headless.
 *
 *  **The strip stays optional.** This is reached as `@mnd/terminal/loop`, which
 *  pulls in no component and no React: the conversation is a pure function of
 *  the graph and the wording, so it is provable and drivable before anything
 *  draws it — and everything it can do is an action a gesture already reaches.
 *
 *  A host gathers the wording, asks `next` what to say, and hands an answer to
 *  `turn`, which gives back actions to run. Nothing here writes a mutation. */

export { read_domain, read_entry, read_operations, domain, wording,
         type Domain, type Entry, type Operation, type Template, type Terms,
         type Wording, type Wordings } from "./domains";
export { DOMAIN, ENTRY, domain_of, eligible, next, opening,
         type Question } from "./router";
export { named_in, routes, turn, type Answering, type Doing } from "./turn";
