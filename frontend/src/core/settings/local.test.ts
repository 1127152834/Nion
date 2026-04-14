import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_LOCAL_SETTINGS,
  getThreadLocalSettings,
  saveThreadLocalSettings,
} from "./local.ts";

function installLocalStorageMock() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: localStorage,
  });

  return localStorage;
}

void test("thread local settings preserve independent model choices", () => {
  const localStorage = installLocalStorageMock();
  localStorage.clear();

  saveThreadLocalSettings("thread-a", {
    ...DEFAULT_LOCAL_SETTINGS,
    context: {
      ...DEFAULT_LOCAL_SETTINGS.context,
      model_name: "model-a",
      mode: "thinking",
    },
  });
  saveThreadLocalSettings("thread-b", {
    ...DEFAULT_LOCAL_SETTINGS,
    context: {
      ...DEFAULT_LOCAL_SETTINGS.context,
      model_name: "model-b",
      mode: "thinking",
    },
  });

  assert.equal(getThreadLocalSettings("thread-a").context.model_name, "model-a");
  assert.equal(getThreadLocalSettings("thread-b").context.model_name, "model-b");
});
