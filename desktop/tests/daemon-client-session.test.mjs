import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as nodeModule from "node:module";

const { stripTypeScriptTypes } = nodeModule;

async function loadCreateElectronClientSession({ fetchImpl, setIntervalImpl, clearIntervalImpl }) {
  const source = await readFile(
    new URL("../src/main/daemon-client-session.ts", import.meta.url),
    "utf8",
  );

  const transformed = stripTypeScriptTypes(
    source
      .replace(/export type ElectronClientSession = \{[\s\S]*?\n\};\n/, "")
      .replace(/type RegisterClientResponse = \{[\s\S]*?\n\};\n/, "")
      .replace(
        /export async function createElectronClientSession/,
        "async function createElectronClientSession",
      ),
  );

  return new Function(
    "fetch",
    "setInterval",
    "clearInterval",
    `${transformed}\nreturn createElectronClientSession;`,
  )(fetchImpl, setIntervalImpl, clearIntervalImpl);
}

test("electron client session suppresses heartbeat fetch rejections", async () => {
  const intervalCallbacks = [];
  const clearedIntervals = [];
  const unhandledRejections = [];
  const rejectionHandler = (error) => {
    unhandledRejections.push(error);
  };

  process.on("unhandledRejection", rejectionHandler);

  try {
    const createElectronClientSession = await loadCreateElectronClientSession({
      fetchImpl: async (url, init = {}) => {
        if (url.endsWith("/register")) {
          return {
            ok: true,
            async json() {
              return { client_id: "client-1" };
            },
          };
        }

        if (String(url).includes("/heartbeat")) {
          throw new TypeError("fetch failed");
        }

        return {
          ok: true,
          async json() {
            return {};
          },
        };
      },
      setIntervalImpl: (callback) => {
        intervalCallbacks.push(callback);
        return { id: intervalCallbacks.length };
      },
      clearIntervalImpl: (handle) => {
        clearedIntervals.push(handle);
      },
    });

    const session = await createElectronClientSession("http://127.0.0.1:2026");
    assert.equal(intervalCallbacks.length, 1);

    intervalCallbacks[0]();
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(unhandledRejections.length, 0);

    await session.dispose();
    assert.deepEqual(clearedIntervals, [{ id: 1 }]);
  } finally {
    process.removeListener("unhandledRejection", rejectionHandler);
  }
});
