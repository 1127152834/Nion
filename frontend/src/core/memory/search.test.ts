import assert from "node:assert/strict";
import test from "node:test";

import { searchStructuredMemory } from "./search.ts";
import type { UserMemory } from "./types.ts";

const labels = {
  work: "工作",
  personal: "个人",
  topOfMind: "近期关注",
  recentMonths: "近几个月",
  earlierContext: "更早上下文",
  longTermBackground: "长期背景",
  facts: "事实",
};

const memory: UserMemory = {
  version: "1.0",
  lastUpdated: "2026-03-26T00:00:00Z",
  user: {
    workContext: {
      summary: "张三目前负责华东区域客服团队的培训和排班。",
      updatedAt: "2026-03-20T00:00:00Z",
    },
    personalContext: {
      summary: "偏好用中文沟通，喜欢简洁直接的说明。",
      updatedAt: "2026-03-18T00:00:00Z",
    },
    topOfMind: {
      summary: "最近在推进员工 onboarding 和质检规范。",
      updatedAt: "2026-03-21T00:00:00Z",
    },
  },
  history: {
    recentMonths: {
      summary: "过去几个月一直在梳理销售和客服协作流程。",
      updatedAt: "2026-03-10T00:00:00Z",
    },
    earlierContext: {
      summary: "此前讨论过区域负责人交接。",
      updatedAt: "2026-02-10T00:00:00Z",
    },
    longTermBackground: {
      summary: "团队长期关注员工培训、绩效和服务质量。",
      updatedAt: "2026-01-10T00:00:00Z",
    },
  },
  facts: [
    {
      id: "fact-1",
      content: "张三是华东客服培训负责人。",
      category: "context",
      confidence: 0.93,
      createdAt: "2026-03-18T00:00:00Z",
      source: "thread-employee",
    },
  ],
};

void test("searchStructuredMemory returns user-facing matches from sections and facts", () => {
  const results = searchStructuredMemory(memory, "张三", labels);

  assert.equal(results.length, 2);
  assert.equal(results[0]?.title, "工作");
  assert.equal(results[0]?.kind, "section");
  assert.match(results[0]?.snippet ?? "", /张三/);
  assert.equal(results[1]?.title, "事实");
  assert.equal(results[1]?.kind, "fact");
});

void test("searchStructuredMemory ignores blank queries", () => {
  assert.deepEqual(searchStructuredMemory(memory, "   ", labels), []);
});
