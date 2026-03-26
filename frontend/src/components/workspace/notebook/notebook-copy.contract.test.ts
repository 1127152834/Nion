import assert from "node:assert/strict";
import test from "node:test";

import { enUS } from "../../../core/i18n/locales/en-US.ts";
import { zhCN } from "../../../core/i18n/locales/zh-CN.ts";

void test("notebookPage includes donor-shell copy keys in both locales", () => {
  for (const locale of [enUS, zhCN]) {
    assert.ok(locale.notebookPage.quickCapture);
    assert.ok(locale.notebookPage.quickCaptureDescription);
    assert.ok(locale.notebookPage.quickCaptureHint);
    assert.ok(locale.notebookPage.quickCaptureSaved);
    assert.ok(locale.notebookPage.searchPlaceholder);
    assert.ok(locale.notebookPage.recentTitle);
    assert.ok(locale.notebookPage.askTab);
    assert.ok(locale.notebookPage.infoTab);
    assert.ok(locale.notebookPage.preview);
    assert.ok(locale.notebookPage.edit);
    assert.ok(locale.notebookPage.infoNoteId);
    assert.ok(locale.notebookPage.infoPath);
    assert.ok(locale.notebookPage.infoUpdatedAt);
    assert.ok(locale.notebookPage.infoCreatedAt);
    assert.ok(locale.notebookPage.infoContentHash);
  }
});
