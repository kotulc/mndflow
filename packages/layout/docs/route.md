# Route

**Where every line goes.** Worked out from the layer's arrangement, in one pass, every time it is drawn.

```
route(spots, edges, how) → Routed[]
```

**There is no manual routing and nothing about a line is stored**, so a relationship the terminal added is drawn exactly as well as one somebody dragged.

## The pass

1. **Pick each end's side.** A directed relationship leaves by the face the reading direction gives it — out on the forward face, in on the one behind. Anything else takes the side facing the other end. **A hand-set wall wins over both.**
2. **Take the next free seat** on that side. Seats fall every half cell and never on a corner.
3. **Elbow between them.** A min-bend orthogonal path, stubs leaving along the side normal only — never into the attached card.
4. **Spread what would overlap.**

**One pass, so each line sees the seats the ones before it took.** No two ends share a seat, though several relationships may still meet at one interface, which is the point of an interface.

## Every elbow is a right angle

**This is the one thing a route may never get wrong**, and it is guaranteed on the way to being drawn rather than checked afterwards.

**It is also what limits spreading.** Two lines between the same pair are pushed apart by moving the run between them — but **only the middle run moves**. A seat is fixed and its stub leaves square, so shifting the point at the end of a stub sideways would bend it diagonally. **A run with no middle is not spread**, and does not need to be: the seats it lands on were already spread apart before it was drawn.

## Ends

- **An end seated on an interface starts at that interface**, not at the card's edge.
- **With interfaces hidden the end lands on the card instead**, so turning them off hides the seats and never the lines.
- **A wall is a constraint, not a placement** — arranging a layer keeps the walls a relationship was pinned to.

## Proven by

No two ends share a seat · every route terminates on the card it names · every elbow is square · routing twice gives the same lines · an edge naming something not drawn is skipped rather than throwing.
