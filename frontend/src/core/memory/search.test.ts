import assert from "node:assert/strict";
import test from "node:test";

import { searchStructuredMemory } from "./search.ts";
import type { MemoryUserFacing } from "./types.ts";

const labels = {
  userProfile: "用户画像",
  longTermBackground: "长期背景",
  facts: "事实",
};

const memory: MemoryUserFacing = {
  user_profile: [
    {
      id: "user_profile.work_context",
      content: "张三目前负责华东区域客服团队的培训和排班。",
      source_label: "用户画像",
      updated_at: "2026-03-20T00:00:00Z",
      reason: "稳定的工作角色与职责背景。",
      related_refs: [],
    },
    {
      id: "user_profile.personal_context",
      content: "偏好用中文沟通，喜欢简洁直接的说明。",
      source_label: "用户画像",
      updated_at: "2026-03-18T00:00:00Z",
      reason: "稳定的个人偏好与长期背景。",
      related_refs: [],
    },
  ],
  long_term_background: [
    {
      id: "long_term_background.recent_months",
      content: "过去几个月一直在梳理销售和客服协作流程。",
      source_label: "长期背景",
      updated_at: "2026-03-10T00:00:00Z",
      reason: "最近阶段沉淀下来的长期背景。",
      related_refs: [],
    },
  ],
  fact_memories: [
    {
      id: "fact-1",
      content: "张三是华东客服培训负责人。",
      source_label: "事实记忆",
      updated_at: "2026-03-18T00:00:00Z",
      reason: "稳定事实或长期偏好。",
      related_refs: ["thread-employee"],
    },
  ],
};

void test("searchStructuredMemory returns user-facing matches from sections and facts", () => {
  const results = searchStructuredMemory(memory, "张三", labels);

  assert.equal(results.length, 2);
  assert.equal(results[0]?.title, "用户画像");
  assert.equal(results[0]?.kind, "section");
  assert.match(results[0]?.snippet ?? "", /张三/);
  assert.equal(results[1]?.title, "事实");
  assert.equal(results[1]?.kind, "fact");
});

void test("searchStructuredMemory ignores blank queries", () => {
  assert.deepEqual(searchStructuredMemory(memory, "   ", labels), []);
});
