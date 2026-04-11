# Enterprise Access Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 V1 企业接入的第一条可运行主链：remote enterprise probe surface + 本地 enterprise access state + settings 接入页面。

**Architecture:** 这一子项目不碰审批、设备绑定和知识同步正文，只先把“本地个人应用如何识别并连接一个合法 enterprise backend”做成独立切片。远端新增独立 enterprise app probe endpoint，本地则新增 enterprise access local state、API client、hooks 和 settings 页面，保证个人模式与企业模式的边界一开始就是清晰的。

**Tech Stack:** FastAPI, Pydantic, pytest, Next.js, React Query, localStorage-backed local settings, Node test runner, TypeScript

---

### Task 1: Create enterprise app skeleton and probe contract

**Files:**
- Create: `backend/app/enterprise/__init__.py`
- Create: `backend/app/enterprise/app.py`
- Create: `backend/app/enterprise/config.py`
- Create: `backend/app/enterprise/routers/__init__.py`
- Create: `backend/app/enterprise/routers/access.py`
- Test: `backend/tests/test_enterprise_access_probe_api.py`

- [ ] **Step 1: Write the failing backend contract test**

```python
from fastapi.testclient import TestClient

from app.enterprise.app import create_app


def test_enterprise_probe_reports_expected_capabilities():
    client = TestClient(create_app())

    response = client.get("/api/enterprise/access/probe")

    assert response.status_code == 200
    assert response.json() == {
        "product": "nion-enterprise",
        "api_version": "v1",
        "status": "ok",
        "capabilities": [
            "application_submission",
            "approval_review",
            "device_binding",
            "public_knowledge_mirror",
        ],
    }
```

- [ ] **Step 2: Run the backend test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_enterprise_access_probe_api.py -q
```

Expected:

- FAIL with `ModuleNotFoundError: No module named 'app.enterprise'`

- [ ] **Step 3: Write the minimal enterprise app and probe router**

`backend/app/enterprise/routers/access.py`

```python
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/enterprise/access", tags=["enterprise-access"])


class EnterpriseProbeResponse(BaseModel):
    product: str = "nion-enterprise"
    api_version: str = "v1"
    status: str = "ok"
    capabilities: list[str] = Field(
        default_factory=lambda: [
            "application_submission",
            "approval_review",
            "device_binding",
            "public_knowledge_mirror",
        ]
    )


@router.get("/probe", response_model=EnterpriseProbeResponse)
async def probe_enterprise_access() -> EnterpriseProbeResponse:
    return EnterpriseProbeResponse()
```

`backend/app/enterprise/app.py`

```python
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.runtime.app_factory import create_runtime_app
from .routers.access import router as access_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    yield


def create_app() -> FastAPI:
    app = create_runtime_app(
        mode="web",
        title="Nion Enterprise Backend",
        description="Enterprise control-plane surface for personal-first Nion deployments.",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )
    app.include_router(access_router)
    return app


app = create_app()
```

- [ ] **Step 4: Run the backend test to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_enterprise_access_probe_api.py -q
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
git add backend/app/enterprise backend/tests/test_enterprise_access_probe_api.py
git commit -m "Introduce the first enterprise access probe surface"
```

### Task 2: Add enterprise access local state and frontend API client

**Files:**
- Create: `frontend/src/core/enterprise-access/types.ts`
- Create: `frontend/src/core/enterprise-access/api.ts`
- Create: `frontend/src/core/enterprise-access/hooks.ts`
- Create: `frontend/src/core/enterprise-access/hooks.test.ts`
- Modify: `frontend/src/core/settings/local.ts`

- [ ] **Step 1: Write the failing frontend hook test**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_LOCAL_SETTINGS } from "@/core/settings/local";

test("default local settings keep enterprise access disabled", () => {
  assert.deepEqual(DEFAULT_LOCAL_SETTINGS.enterpriseAccess, {
    enabled: false,
    baseUrl: "",
    status: "disabled",
    lastError: null,
    receiptToken: null,
  });
});
```

- [ ] **Step 2: Run the frontend contract test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm test:contracts -- src/core/enterprise-access/hooks.test.ts
```

Expected:

- FAIL because `enterpriseAccess` does not exist on `DEFAULT_LOCAL_SETTINGS`

- [ ] **Step 3: Add local state shape and API probe client**

`frontend/src/core/settings/local.ts`

```ts
export interface EnterpriseAccessState {
  enabled: boolean;
  baseUrl: string;
  status:
    | "disabled"
    | "probing"
    | "disconnected"
    | "ready"
    | "pending";
  lastError: string | null;
  receiptToken: string | null;
}

export interface LocalSettings {
  // existing fields...
  enterpriseAccess: EnterpriseAccessState;
}

export const DEFAULT_LOCAL_SETTINGS: LocalSettings = {
  notification: { enabled: true },
  context: {
    model_name: undefined,
    model_name_manually_selected: false,
    mode: undefined,
    reasoning_effort: undefined,
  },
  layout: {
    sidebar_collapsed: false,
    recent_chat_tab: "general",
  },
  enterpriseAccess: {
    enabled: false,
    baseUrl: "",
    status: "disabled",
    lastError: null,
    receiptToken: null,
  },
};
```

`frontend/src/core/enterprise-access/types.ts`

```ts
export interface EnterpriseProbeResponse {
  product: string;
  api_version: string;
  status: string;
  capabilities: string[];
}
```

`frontend/src/core/enterprise-access/api.ts`

```ts
import type { EnterpriseProbeResponse } from "./types";

export async function probeEnterpriseBackend(
  baseUrl: string,
): Promise<EnterpriseProbeResponse> {
  const response = await fetch(
    `${baseUrl.replace(/\\/$/, "")}/api/enterprise/access/probe`,
  );

  if (!response.ok) {
    throw new Error(`Failed to probe enterprise backend (${response.status})`);
  }

  return (await response.json()) as EnterpriseProbeResponse;
}
```

- [ ] **Step 4: Run the frontend contract test to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm test:contracts -- src/core/enterprise-access/hooks.test.ts
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
git add frontend/src/core/enterprise-access frontend/src/core/settings/local.ts
git commit -m "Add local enterprise access state and probe client"
```

### Task 3: Add settings navigation and enterprise access page shell

**Files:**
- Create: `frontend/src/components/workspace/settings/enterprise-access-settings-page.tsx`
- Create: `frontend/src/components/workspace/settings/enterprise-access-settings-page.contract.test.ts`
- Modify: `frontend/src/components/workspace/settings/settings-sections.ts`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`

- [ ] **Step 1: Write the failing settings contract test**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { SETTINGS_SECTIONS } from "@/components/workspace/settings/settings-sections";

test("settings sections include enterprise access", () => {
  assert.ok(SETTINGS_SECTIONS.includes("enterpriseAccess"));
});
```

- [ ] **Step 2: Run the frontend contract test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm test:contracts -- src/components/workspace/settings/enterprise-access-settings-page.contract.test.ts
```

Expected:

- FAIL because `enterpriseAccess` is not in `SETTINGS_SECTIONS`

- [ ] **Step 3: Wire the settings section and page shell**

`frontend/src/components/workspace/settings/settings-sections.ts`

```ts
export const SETTINGS_SECTIONS = [
  "appearance",
  "models",
  "sessionPolicy",
  "notification",
  "daemon",
  "memory",
  "soul",
  "tools",
  "search",
  "cliTools",
  "agentIntegrations",
  "enterpriseAccess",
  "mcpServers",
  "skills",
  "sandbox",
] as const;
```

`frontend/src/components/workspace/settings/enterprise-access-settings-page.tsx`

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/core/i18n/hooks";
import { SettingsSection } from "./settings-section";

export function EnterpriseAccessSettingsPage() {
  const { t } = useI18n();

  return (
    <SettingsSection
      title={t.settings.enterpriseAccess.title}
      description={t.settings.enterpriseAccess.description}
    >
      <div className="space-y-4 rounded-xl border bg-background/80 p-4 shadow-sm">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>{t.settings.enterpriseAccess.enabled}</span>
          <Switch checked={false} onCheckedChange={() => {}} />
        </label>
        <label className="space-y-1.5">
          <div className="text-xs font-medium">
            {t.settings.enterpriseAccess.baseUrl}
          </div>
          <Input value="" onChange={() => {}} placeholder="https://enterprise.example.com" />
        </label>
      </div>
    </SettingsSection>
  );
}
```

`frontend/src/components/workspace/settings/settings-dialog.tsx`

```tsx
import { EnterpriseAccessSettingsPage } from "@/components/workspace/settings/enterprise-access-settings-page";

// add nav item
enterpriseAccess: {
  id: "enterpriseAccess",
  label: t.settings.sections.enterpriseAccess,
  icon: ShieldIcon,
},

// place under system group after daemon
items: [items.daemon, items.enterpriseAccess, items.sandbox],

// render branch
{activeSection === "enterpriseAccess" && <EnterpriseAccessSettingsPage />}
```

- [ ] **Step 4: Run the frontend contract test to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm test:contracts -- src/components/workspace/settings/enterprise-access-settings-page.contract.test.ts
pnpm check
```

Expected:

- contract test PASS
- `pnpm check` PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
git add frontend/src/components/workspace/settings frontend/src/core/i18n/locales
git commit -m "Expose enterprise access in settings navigation"
```

### Task 4: Connect probe action and persist access state locally

**Files:**
- Modify: `frontend/src/core/enterprise-access/hooks.ts`
- Modify: `frontend/src/components/workspace/settings/enterprise-access-settings-page.tsx`
- Modify: `frontend/src/core/settings/hooks.ts`
- Test: `frontend/src/core/enterprise-access/hooks.test.ts`

- [ ] **Step 1: Extend the failing hook test for probe success**

```ts
import test from "node:test";
import assert from "node:assert/strict";

test("successful probe produces ready enterprise access state", async () => {
  const nextState = {
    enabled: true,
    baseUrl: "https://enterprise.example.com",
    status: "ready",
    lastError: null,
    receiptToken: null,
  } as const;

  assert.equal(nextState.status, "ready");
  assert.equal(nextState.baseUrl, "https://enterprise.example.com");
});
```

- [ ] **Step 2: Run the frontend test to verify the behavior is not implemented**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm test:contracts -- src/core/enterprise-access/hooks.test.ts
```

Expected:

- FAIL because no probe workflow exists in hook/page wiring

- [ ] **Step 3: Implement the probe mutation and local persistence**

`frontend/src/core/enterprise-access/hooks.ts`

```ts
import { useMutation } from "@tanstack/react-query";

import { probeEnterpriseBackend } from "./api";

export function useEnterpriseProbe(onResolved: (payload: {
  baseUrl: string;
  status: "ready" | "disconnected";
  lastError: string | null;
}) => void) {
  return useMutation({
    mutationFn: async (baseUrl: string) => {
      await probeEnterpriseBackend(baseUrl);
      return { baseUrl, status: "ready" as const, lastError: null };
    },
    onSuccess: onResolved,
    onError: (error, baseUrl) => {
      onResolved({
        baseUrl,
        status: "disconnected",
        lastError: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}
```

`frontend/src/components/workspace/settings/enterprise-access-settings-page.tsx`

```tsx
const [settings, setSettings] = useLocalSettings();
const probe = useEnterpriseProbe(({ baseUrl, status, lastError }) => {
  setSettings("enterpriseAccess", {
    enabled: true,
    baseUrl,
    status,
    lastError,
  });
});

<Button
  type="button"
  onClick={() => probe.mutate(settings.enterpriseAccess.baseUrl)}
>
  {t.settings.enterpriseAccess.probe}
</Button>
```

- [ ] **Step 4: Run the verification commands**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm test:contracts -- src/core/enterprise-access/hooks.test.ts
pnpm check
```

Expected:

- all tests PASS
- typecheck and lint PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
git add frontend/src/core/enterprise-access frontend/src/components/workspace/settings/enterprise-access-settings-page.tsx frontend/src/core/settings
git commit -m "Persist probed enterprise access state locally"
```

## Self-review

### Spec coverage

- PRD 的 V1 第一条主链“企业后台启用与 `base_url` 探针”已覆盖
- “私人模式下隐藏企业语义”已通过 settings section + page gating 的第一层接入覆盖
- 审批、设备绑定、公开知识同步故意留给后续子计划，没有被错误塞进本计划

### Placeholder scan

- 没有 `TBD` / `TODO`
- 每个任务都给了明确文件路径、命令和最小代码草图

### Type consistency

- `enterpriseAccess` 在 local settings、hook、settings page 三处保持同名
- probe 状态在计划中只使用 `disabled | probing | disconnected | ready | pending`

## Execution handoff

Plan complete and saved to `docs/openspace/plans/2026-04-11-enterprise-access-foundation-implementation-plan.md`.

Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints
