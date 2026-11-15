# state

**Layer kind. How one thing changes.** Drawn by hand: no tool yet. Agreed 2026-11-14.

## Purpose

| | |
|---|---|
| **answers** | what conditions can this thing be in, and what moves it from one to the next |
| **draws** | its states as round cards, transitions between them named by the event that fires them, a start and an end mark |
| **example** | the shop: *Order states*, the Order record's lifecycle (samples/example/Records/order) |

## Utility

| | |
|---|---|
| **draw it** | one thing lives a long time and waits between events: a record with a status (an order, a payment, a ticket), a connection, a job, a UI mode. Three or more states, and the code refuses some moves |
| **skip it** | two states (open, closed): an attribute says it. A sequence of actions done once in order: that is a flow |
| **the test** | does something *wait* here for an event from outside? If every box is done and left at once, it is a flow |
| **vs flow** | a flow's boxes are actions, run once in order; a state's boxes are conditions, left only when an event arrives, often returned to. Both share one layout |
| **vs dataflow** | a dataflow is a datum's path through parts; a state machine is one thing's life in time, and may be that datum's (an Order's status) |
| **owner** | the definition whose life it is (Order), offered from that definition's card and from any dataflow whose datum it is |

**Why mndsite had none**: it is a batch build and a static site. Nothing it owns lives long and waits: a build runs once, start to end (a flow); a page's `status` is content the author writes, never moved by events in code; the site's UI modes (the mobile drawer, the chosen view) have two states each. A case would be a server, a queue, a long-lived record, or an interactive app with modes; this repo's own canvas (navigation: map, entered, presenting) may be one.

## Surface

| | |
|---|---|
| **base** | `state`, extending `block`, *is behaviour*: view `internal`, layered, round cards; transitions are base `transition` lines; marks `start` and `end` |
| **file** | its own file under the use that owns the data in the model (`shop/back-office/orders/order-states.yaml`; a definition holds no diagrams): states in list order; relations are transitions by the kind |
| **tool** | none until a case appears. A `states` fact tool would read a status field's literal values and the assignments that change it |

```yaml
# shop/back-office/orders/order-states.yaml
type: state
blocks: [start: Placed, Pending, Paid, Shipped, Delivered, Payment failed, Cancelled, end: Closed]
relations:
  - Placed -> Pending
  - Pending -> Paid: charged
  - Pending -> Payment failed: declined
  - Payment failed -> Pending: retry
  - Payment failed -> Cancelled: gave up
  - Paid -> Shipped: handed over
  - Shipped -> Delivered: signed for
  - Delivered -> Closed
  - Cancelled -> Closed
```

## Layout

**Flow's layout, as a state machine shares it** (flow.md agreed).

| Case | How it is drawn |
|---|---|
| **the main path** | the chain from the start mark through each state's first transition (list order) lies on the axis |
| **other states** | in lanes, as a flow's other answers: below first, then above |
| **a transition back** | a line back, named by its event (`retry`); a second line between the same two states runs round them (design.md) |
| **a transition's words** | `event [guard] / action`, UML's form; the guard in brackets as a flow's |
| **many states** | past two lanes a side (a default), a group of states becomes a composite state, entered by *into*, only where both sides keep the floor (README *Sub diagrams*) |

## Agreed 2026-11-14

| # | Decision |
|---|---|
| 1 | flow's layout: main path on the axis, other states in lanes, lines back named by their events; past two lanes a side, a composite state entered by *into* |
| 2 | a transition's words: `event [guard] / action` |
| 3 | owned by the definition whose life it is, offered from its card and from a dataflow of that datum |
| 4 | no tool until a case appears; a `states` fact tool later |
