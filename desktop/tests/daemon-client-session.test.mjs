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

test("electron client session re-registers when heartbeat returns 404", async () => {
  const intervalCallbacks = [];
  const clearedIntervals = [];
  const fetchCalls = [];
  let registerCount = 0;
  let heartbeat404Seen = false;

  const createElectronClientSession = await loadCreateElectronClientSession({
    fetchImpl: async (url, init = {}) => {
      fetchCalls.push({
        url: String(url),
        method: init.method ?? "GET",
        body: init.body ? JSON.parse(String(init.body)) : null,
      });

      if (String(url).endsWith("/register")) {
        registerCount += 1;
        return {
          ok: true,
          async json() {
            return { client_id: init.body ? JSON.parse(String(init.body)).client_id ?? "client-1" : "client-1" };
          },
        };
      }

      if (String(url).includes("/heartbeat")) {
        const missing = String(url).includes("client-1") && !heartbeat404Seen;
        if (missing) {
          heartbeat404Seen = true;
        }
        return {
          ok: !missing,
          status: missing ? 404 : 204,
          async json() {
            return {};
          },
        };
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
  assert.equal(session.clientId, "client-1");
  assert.equal(intervalCallbacks.length, 1);

  await intervalCallbacks[0]();
  await new Promise((resolve) => setImmediate(resolve));
  await intervalCallbacks[0]();
  await new Promise((resolve) => setImmediate(resolve));

  const registerCalls = fetchCalls.filter((entry) => entry.url.endsWith("/register"));
  const heartbeatCalls = fetchCalls.filter((entry) => entry.url.includes("/heartbeat"));

  assert.equal(registerCalls.length, 2);
  assert.deepEqual(registerCalls[1].body, {
    client_type: "electron",
    client_id: "client-1",
  });
  assert.equal(
    heartbeatCalls.filter((entry) => entry.url.includes("client-1")).length >= 2,
    true,
  );

  await session.dispose();
  assert.deepEqual(clearedIntervals, [{ id: 1 }]);
  assert.equal(
    fetchCalls.some(
      (entry) =>
        entry.method === "DELETE" &&
        entry.url.endsWith("/api/daemon/clients/client-1"),
    ),
    true,
  );
});
