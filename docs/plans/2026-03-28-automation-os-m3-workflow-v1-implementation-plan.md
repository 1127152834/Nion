# Automation OS M3 Workflow V1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce linear, ordered workflows as the next layer above event tasks and scheduled tasks.

**Architecture:** Keep workflows in the automation domain and model them as ordered step lists instead of a graph editor. Reuse trigger concepts from event tasks and reuse action execution branches from the runtime, then add workflow-specific state tracking for pause, retry, delay, and step-level failure reporting.

**Tech Stack:** FastAPI, SQLite, Python runtime helpers, React 19, Next.js App Router, TypeScript, TanStack Query, pytest, node:test

---

## Summary

- Add workflow and workflow-step schemas.
- Add sequential executor with retry/delay/wait-for-user support.
- Add workflow detail UI and run visibility.

## Key Changes

- Backend:
  - workflow schema, persistence, and executor
  - step-level run state and failure metadata
  - resume hook for wait-for-user steps
- Frontend:
  - workflows route and detail view
  - ordered step editing surface
  - paused-step and failure-point display

## Test Plan

- Unit tests for workflow step executor.
- Integration tests for sequential workflows.
- Negative tests for retry exhaustion and invalid resume.
- E2E for trigger -> multi-step execution -> user resume -> finish.

## Assumptions

- Workflow editing remains list-based in V1; graph/canvas editing is out of scope.
- Only a bounded subset of actions is workflow-enabled initially.
