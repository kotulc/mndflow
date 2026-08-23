/** What the browser binds.
 *
 *  The whole host contract, and the only place in the app that knows a browser
 *  is what it is running in. */

import { check, type Files, type Log, type Storage } from "@mnd/core";

const KEY = "mnd.log.v2";

export function browser_storage(): Storage {
  return {
    read() {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        return check(JSON.parse(raw)).log;
      } catch {
        return null;
      }
    },
    write(log: Log) {
      try {
        localStorage.setItem(KEY, JSON.stringify(log));
      } catch {
        /** The session is unharmed until the tab closes, so carrying on is
         *  right — but the header says so rather than swallowing it. */
        window.dispatchEvent(new CustomEvent("mnd:full"));
      }
    },
    clear() {
      localStorage.removeItem(KEY);
    },
  };
}

export function browser_files(): Files {
  return {
    async save(name, text) {
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    },
    open() {
      return new Promise((done) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json";
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return done(null);
          void file.text().then(done);
        };
        input.oncancel = () => done(null);
        input.click();
      });
    },
  };
}
