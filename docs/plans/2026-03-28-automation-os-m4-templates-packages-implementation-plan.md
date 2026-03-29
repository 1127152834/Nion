# Automation OS M4 Templates and Packages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add package import/export and a template library for event tasks and workflows.

**Architecture:** Formalize the one-task/one-package approach into an explicit package manifest that can be serialized, validated, imported, and rendered in a template library. Keep package compatibility strict and fail fast on missing runtime requirements.

**Tech Stack:** FastAPI, SQLite, JSON manifest handling, React 19, Next.js App Router, TypeScript, TanStack Query, pytest, node:test

---

## Summary

- Define package manifest.
- Add export and import endpoints.
- Add template library UI.
- Validate packages before activation.

## Key Changes

- Backend:
  - manifest serializer/deserializer
  - export/import endpoints
  - compatibility checks
- Frontend:
  - template library route
  - import UI and install flow
  - template detail view

## Test Plan

- Manifest shape tests.
- Export/import round-trip tests.
- Compatibility failure tests.
- E2E for install template -> activate -> run -> inspect.

## Assumptions

- Official templates and personal templates share the same package manifest format.
- Shared resource deduplication remains out of scope.
