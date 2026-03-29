# Automation OS M6 Open Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Open Automation OS to external triggers and plugin actions without weakening safety or observability.

**Architecture:** Publish a narrow, versioned external trigger contract and a bounded plugin action contract. Route external events into the existing automation core and require plugin execution to satisfy the same observability and policy boundaries as internal actions.

**Tech Stack:** FastAPI, webhook handling, plugin loading/validation, React 19, Next.js App Router, TypeScript, TanStack Query, pytest, contract tests

---

## Summary

- Add webhook trigger ingestion.
- Add versioned public event contract.
- Add plugin action interface and validation.
- Add connector and external-source UI.

## Key Changes

- Backend:
  - external event ingestion endpoints
  - plugin action registry and validation
  - quotas/auth/signature validation
- Frontend:
  - connector setup
  - external source management
  - plugin action diagnostics

## Test Plan

- Contract tests for public event schema.
- Sandbox and validation tests for plugin actions.
- Negative tests for invalid signatures, malformed payloads, and quota violations.
- E2E for external event -> plugin action -> run visibility.

## Assumptions

- Open-platform rollout begins with allowlisted connectors and signed webhook sources.
- Marketplace or community distribution of plugins is deferred beyond this milestone.
