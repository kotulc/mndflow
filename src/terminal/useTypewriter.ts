/** Reveals a string one character at a time — the terminal typing effect.
 *  Honours reduced-motion by showing the whole line at once. */

import { useEffect, useState } from "react";

const SPEED = 18;

function instant(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useTypewriter(text: string, speed = SPEED) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    if (instant()) {
      setShown(text);
      return;
    }

    setShown("");
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setShown(text.slice(0, index));
      if (index >= text.length) clearInterval(timer);
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return { shown, done: shown === text };
}
