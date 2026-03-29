# Automation OS M0 Milestone

## Title

Event Task Foundation

## Objective

Establish `event_task` as a real third automation job kind instead of a hooks concept living only in product copy or future roadmap notes.

## User Value

Users can create an event-driven automation, bind it to a system event, optionally attach a self-contained hook package directory, and inspect recent runs from the Automation UI.

## Scope

- event-task data model
- event trigger support
- self-contained hook package directory
- package-backed script action
- backend event dispatch for selected thread and agent events
- event-task tab, create form, list, and basic detail page

## Public Interfaces

- automation job shape gains:
  - `trigger_kind`
  - `trigger_spec`
  - `action_kind`
  - `action_spec`
  - `package_dir`
  - `package_manifest`
- event-task detail route:
  - `/workspace/automation/[job_id]`

## Acceptance Criteria

- user can create an `event_task`
- a matching event can trigger a real run
- script entrypoint can execute from the task package directory
- run history records trigger event name and outcome
- deleting the task deletes its package directory

## Exit Gate

- focused backend automation tests pass
- focused frontend event-task tests pass
- scoped static analysis passes on touched files
- HTTP end-to-end proof shows create -> trigger -> run history -> detail page
