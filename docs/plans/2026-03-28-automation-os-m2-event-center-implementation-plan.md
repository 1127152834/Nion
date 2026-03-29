# Automation OS M2 Event Center Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the Event Center as the observation plane for Automation OS, including replay and create-from-event flows.

**Architecture:** Reuse the existing telemetry and automation run records rather than inventing a separate event store. Add a read-oriented API that aggregates event records with related run and thread references, then layer replay support on top for selected event classes.

**Tech Stack:** FastAPI, SQLite telemetry store, React 19, Next.js App Router, TypeScript, TanStack Query, node:test source-contract tests, pytest

---

## Summary

- Add Event Center API and UI.
- Correlate event records to runs and threads.
- Add safe replay for selected events.
- Add create-from-event draft flow.

## Key Changes

- Backend:
  - event-center list/detail endpoints
  - replay endpoint with allowlist of event types
  - event/run/thread correlation helpers
- Frontend:
  - event-center route, filters, and detail page
  - replay control
  - create event task from event CTA

## Test Plan

- Backend:
  - event-center listing
  - detail payload integrity
  - replay allowlist and replay execution
- Frontend:
  - route rendering contract
  - filter behavior
  - create-from-event interaction contract
- Acceptance:
  - inspect event
  - replay event
  - derive event task
  - observe resulting run

## Assumptions

- Replay remains limited to explicitly safe event types in M2.
- Event Center is read-first; advanced event editing is out of scope.
