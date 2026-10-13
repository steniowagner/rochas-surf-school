import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Recent Node versions ship an experimental global `localStorage` that shadows jsdom's and is
// undefined without `--localstorage-file`: use an in-memory one so the tests run on any Node.
if (typeof globalThis.localStorage?.clear !== "function") {
  const store = new Map<string, string>();

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key: string) => store.get(key) ?? null,
      key: (index: number) => [...store.keys()][index] ?? null,
      removeItem: (key: string) => void store.delete(key),
      setItem: (key: string, value: string) => void store.set(key, String(value)),
    } satisfies Storage,
  });
}

afterEach(cleanup);
