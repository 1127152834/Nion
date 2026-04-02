import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("project list page exposes create entry and dashboard summary cards", async () => {
  const source = await readFile(
    new URL("./project-list-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useProjects/);
  assert.match(source, /useCreateProject/);
  assert.match(source, /新建项目/);
  assert.match(source, /总体进度/);
  assert.match(source, /当前主计划/);
  assert.match(source, /最近活跃/);
});

void test("project dashboard page exposes primary thread, plan, timeline, and artifact actions", async () => {
  const source = await readFile(
    new URL("./project-dashboard-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useProjectDashboard/);
  assert.match(source, /useCreateProjectThread/);
  assert.match(source, /useCreateProjectPlan/);
  assert.match(source, /useProjectTimeline/);
  assert.match(source, /useProjectArtifacts/);
  assert.match(source, /继续当前主会话/);
  assert.match(source, /新建实施计划/);
  assert.match(source, /标记完成/);
  assert.match(source, /当前动作与阻塞/);
  assert.match(source, /待确认事项/);
  assert.match(source, /受管产物/);
  assert.match(source, /导出到笔记|提炼长期记忆/);
  assert.match(source, /候选中心|pathOfObjectCandidate/);
  assert.doesNotMatch(source, /applyObjectCandidate/);
});
