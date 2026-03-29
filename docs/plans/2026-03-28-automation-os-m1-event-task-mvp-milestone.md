# Automation OS M1 Milestone

## Title

Event Task MVP Complete

## Objective

Turn event tasks from a foundation slice into a user-grade product that can be created, edited, tested, extended with package files, and safely deleted.

## User Value

Users can create event tasks from templates, edit triggers and actions, upload packaged files, create scripts, use at least one real built-in action, and see explicit delete semantics.

## Scope

- event-task update API
- package file upload and script creation
- built-in actions:
  - `notify`
  - `play_sound`
  - `notebook_write`
- detail-page editing controls
- explicit delete confirmation
- richer M1 verification

## Public Interfaces

- new backend endpoints:
  - `PATCH /api/automation/jobs/{job_id}`
  - `POST /api/automation/jobs/{job_id}/package/files`
- detail page becomes editable rather than read-only

## Acceptance Criteria

- user can update event-task trigger and action from the detail page
- user can upload a package file and see it listed in the package manifest
- user can create a script file in the package
- `notebook_write` action creates a note in Notebook
- deleting an event task clearly communicates package deletion

## Exit Gate

- focused backend automation tests pass with M1 additions
- focused frontend contract tests still pass after editing controls are added
- scoped lint/type checks pass on M1-touched files
- HTTP or browser acceptance proves update, upload, built-in action, and delete flows
