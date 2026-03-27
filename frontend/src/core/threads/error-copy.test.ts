import assert from "node:assert/strict";
import test from "node:test";

import { getThreadRequestErrorCopy } from "./error-copy.ts";

const translations = {
  title: "Couldn't get a reply",
  modelUnavailable: "The selected model is unavailable right now.",
  authenticationFailed: "The model credentials were rejected.",
  runtimeUnavailable: "Nion couldn't reach the runtime service.",
  generic: "This request didn't finish successfully.",
  detailsLabel: "Technical details",
};

void test("maps no available accounts to model unavailable copy", () => {
  const copy = getThreadRequestErrorCopy(
    "Error code: 503 - {'error': {'message': 'No available accounts: no available accounts'}}",
    translations,
  );

  assert.equal(copy?.description, translations.modelUnavailable);
});

void test("maps fetch failures to runtime unavailable copy", () => {
  const copy = getThreadRequestErrorCopy(
    new Error("Failed to fetch"),
    translations,
  );

  assert.equal(copy?.description, translations.runtimeUnavailable);
});

void test("falls back to generic copy for unknown errors", () => {
  const copy = getThreadRequestErrorCopy(
    new Error("Something odd happened"),
    translations,
  );

  assert.equal(copy?.description, translations.generic);
  assert.equal(copy?.detail, "Something odd happened");
});
