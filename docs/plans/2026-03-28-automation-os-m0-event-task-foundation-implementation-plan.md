# Automation OS M0 Event Task Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the first working slice of event-task automation with event triggers, self-contained package directories, package-backed scripts, and a basic detail page.

**Architecture:** Extend the current automation domain instead of creating a parallel hooks system. Represent event tasks as automation jobs with event trigger metadata and an optional package directory, then reuse the existing automation repository, service, router, and runs history.

**Tech Stack:** FastAPI, Pydantic, SQLite, Python pathlib/shutil/subprocess, React 19, Next.js App Router, TypeScript, TanStack Query, node:test source-contract tests, pytest

---

## Summary

- Add event-task fields to automation jobs and runs.
- Add package directory helpers under the automation domain.
- Dispatch selected thread and agent runtime events into automation.
- Support package-backed script execution.
- Add event-task tab, create form, list, and basic detail route.

## Key Changes

- Backend:
  - extend automation models, scheduler, and service for `event_task`
  - add package helper module and script runner
  - add event dispatch integration from thread and agent events
  - expose event-task CRUD through `/api/automation/jobs`
- Frontend:
  - extend automation types, API client, and hooks
  - add `Event tasks` tab
  - add event-task create form
  - add event-task detail page with trigger, action, package files, and recent runs

## Test Plan

- Backend pytest:
  - repository round-trip for event tasks
  - router create/list/get/delete
  - package create/delete lifecycle
  - event dispatch execution
  - package-backed script action
- Frontend:
  - event-task builder test
  - tab/list contract test
  - detail page contract test
- HTTP acceptance:
  - create event task
  - trigger event
  - verify run history
  - verify detail page route

## Assumptions

- Event tasks remain single-trigger and single-action in M0.
- Package directories are one-per-task and are deleted with the task.
- Full-project frontend lint may still be blocked by unrelated existing notebook debt; use scoped verification for touched files.
