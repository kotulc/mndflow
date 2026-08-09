/** A wall around one panel, so a fault inside it stays inside it.
 *
 *  Without one, a single bad row took the whole application down to a blank
 *  page and the only way back was a reload — losing nothing, since the log is
 *  saved, but giving no clue what happened. A panel that cannot draw itself is
 *  worth saying so about; it is not worth the canvas, the explorer and the
 *  terminal going with it.
 *
 *  It reports rather than retries. Whatever the panel choked on is still in
 *  the graph, so drawing it again would only fail again — closing the panel
 *  and carrying on is the way out, and the message says so. */

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; what: string };
type State = { fault: string | null };

export class Guard extends Component<Props, State> {
  state: State = { fault: null };

  static getDerivedStateFromError(error: Error): State {
    return { fault: error.message };
  }

  componentDidCatch(error: Error) {
    // Still worth the console: the message below is for getting out of the
    // way, not for working out what went wrong.
    console.error(`${this.props.what} could not be drawn:`, error);
  }

  render() {
    if (this.state.fault === null) return this.props.children;

    return (
      <p className="broke">
        {this.props.what} could not be drawn — {this.state.fault}
      </p>
    );
  }
}
