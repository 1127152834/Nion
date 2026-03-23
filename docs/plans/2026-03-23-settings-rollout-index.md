# Settings Rollout Index

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver the settings migration as gated modules, one module at a time, with mandatory human E2E approval after each completed module before starting the next, while also aligning the chat runtime/composer/workbench behavior that those settings pages depend on.

**Architecture:** Treat the current repo as the primary system. Build a Config Center backbone first, then ship the chat runtime/workspace foundation, then ship user-facing settings modules in sequence. Preserve the current memory system unchanged. Preserve the current channel runtime and connection flow, and only graft in `Nion-Agent` control-plane capabilities where they fill real gaps. Default this repo's app data root to `~/.nion-data`, keep a single app-level workspace rooted at `~/.nion-data/workspace`, and treat web host mode as backend-host execution rather than a desktop-only feature.

**Tech Stack:** FastAPI, Pydantic, SQLite config store, Next.js, React, TanStack Query, shadcn/ui

---

## Rollout Rules

- After each module is implemented, stop and notify the user for E2E testing.
- Do not start the next module until the user explicitly confirms the previous module passed E2E.
- Replace `DeerFlow` wording with `Nion` in any user-facing strings you touch.
- Do not migrate or replace the current memory module.
- Do not replace the current channel connection and chat runtime; extend it.
- Do not implement vector / embedding / retrieval settings in this rollout.
- Keep the product on a single-workspace model in this rollout; do not expand into multi-workspace management UI.
- Do not treat host mode as desktop-only. In web deployments, host mode maps to the server/backend host execution surface.
- When a module backs a live chat/runtime interaction, land the corresponding interaction contract in the same module instead of shipping a settings-only shell.
- Use [2026-03-24-settings-e2e-browser-use-acceptance-spec.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-24-settings-e2e-browser-use-acceptance-spec.md) as the acceptance contract for browser E2E and donor-parity validation.

## Development Order

0. [Config Center Foundation](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-23-settings-module-00-config-center-foundation.md)
0.5. [Chat Runtime & Workspace Foundation](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-23-settings-module-00a-chat-runtime-workspace-foundation.md)
1. [Appearance Settings](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-23-settings-module-01-appearance.md)
2. [Notification Settings](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-23-settings-module-02-notification.md)
3. [Model Settings](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-23-settings-module-03-models.md)
4. [Session Policy Settings](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-23-settings-module-04-session-policy.md)
5. [Tool Settings](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-23-settings-module-05-tools.md)
6. [MCP Servers Settings](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-23-settings-module-06-mcp-servers.md)
7. [Skill Settings](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-23-settings-module-07-skills.md)
8. [Sandbox Settings](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-23-settings-module-08-sandbox.md)
9. [Channel Settings](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-23-settings-module-09-channels.md)
10. [Search Settings](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-23-settings-module-10-search.md)
11. [CLI Tools Settings](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-23-settings-module-11-cli-tools.md)
12. [Workbench Plugins & Plugin Studio](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-23-settings-module-12-workbench-plugins.md)
13. [Desktop Runtime Settings](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-23-settings-module-13-desktop-runtime.md)

## Why This Order

- Foundation first because every later module depends on config storage, settings shell, and navigation.
- Chat runtime/workspace foundation comes next because the later sandbox, CLI, skills, MCP, and plugin modules all depend on a real chat-page interaction contract rather than settings-only forms.
- Appearance and notification are the lowest-risk visual modules and validate the new shell quickly.
- Models and session policy come next because they are core to product behavior.
- Tools, MCP, skills, and sandbox are config-heavy but also need to feed the chat composer/runtime behaviors added in Module 00A.
- Channels come before advanced productivity modules because they are business-critical and have the largest architecture delta.
- Search, CLI tools, plugins, and runtime diagnostics come last because they depend on extra backend/runtime/workbench surfaces and should not block the core migration.

## Out Of Scope

- Memory module migration
- Retrieval-model settings
- Embedding / vector settings
- Replacing current channel runtime with `Nion-Agent` runtime
- Multi-workspace management UI

## Execution Protocol

When a module starts:

1. Re-read the module plan.
2. Implement only that module.
3. Run the module verification commands.
4. Run the relevant `$browser-use` acceptance scenario from the E2E spec when the CLI is available.
5. Stop.
6. Report what changed and ask the user to run or confirm E2E.
7. Wait for pass/fail before moving on.
