# Automation OS M1 Event Task MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the first user-ready event-task slice with editing, package maintenance, built-in actions, and delete confirmation.

**Architecture:** Build on M0 by adding update and package-maintenance APIs rather than introducing a second event-task storage model. Keep the one-task/one-package boundary intact while expanding the detail page into an operator console.

**Tech Stack:** FastAPI, Pydantic, SQLite, Python pathlib/shutil, Notebook service, React 19, Next.js App Router, TypeScript, TanStack Query, node:test source-contract tests, pytest

---

## Summary

- Add update support for event tasks.
- Add package file upload and package file maintenance.
- Add built-in action execution for `notebook_write`, `notify`, and `play_sound`.
- Upgrade the detail page into an editable console.
- Add explicit destructive confirmation for delete.

## Key Changes

- Backend:
  - add `PATCH` update endpoint for automation jobs
  - add package-file upload endpoint
  - add package append/remove semantics
  - add built-in action executor branch
- Frontend:
  - add update and upload API helpers and mutations
  - add action selector to event-task create form
  - add editable detail page fields
  - add upload button, create-script affordance, and delete confirmation

## Test Plan

- Backend pytest:
  - update API test
  - package append/remove test
  - built-in action tests for `notebook_write` and `notify`
- Frontend:
  - builder test for action-kind selection
  - detail contract test for save/upload/script/delete controls
- Acceptance:
  - create event task
  - patch to script action
  - upload packaged file
  - trigger event and verify run
  - trigger `notebook_write` and verify note exists
  - delete task and verify package directory removal

## Assumptions

- `notify` and `play_sound` may begin as backend-recorded built-in actions before wiring to full client-side effects.
- Chat-created draft cards are deferred to a later milestone if they threaten M1 scope.
