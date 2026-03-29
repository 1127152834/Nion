# Automation OS M5 Team Governance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add shared-team governance to Automation OS through ownership, visibility, approval controls, and audit logging.

**Architecture:** Extend the automation-domain objects with ownership and visibility metadata, then layer approval and audit logic around execution rather than duplicating execution models per team type. Keep approval gates explicit and bounded around high-risk actions.

**Tech Stack:** FastAPI, SQLite, audit/event storage, React 19, Next.js App Router, TypeScript, TanStack Query, pytest, node:test

---

## Summary

- Add team/shared/private ownership model.
- Add approval gates for high-risk actions.
- Add audit views and APIs.

## Key Changes

- Backend:
  - ownership and visibility metadata
  - approval request and decision APIs
  - audit event persistence
- Frontend:
  - ownership indicators
  - approval queue
  - audit history views

## Test Plan

- Permission matrix tests.
- Approval flow tests.
- Audit record creation and query tests.
- E2E for approval-required task execution and audit inspection.

## Assumptions

- Governance applies to event tasks and workflows using the same core policy vocabulary.
- Enterprise-specific org integrations remain out of scope for this milestone.
