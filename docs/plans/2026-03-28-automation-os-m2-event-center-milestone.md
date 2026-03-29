# Automation OS M2 Milestone

## Title

Event Center

## Objective

Create an observation and discovery layer where users can see important system events, inspect them, replay them, and derive event tasks from them.

## User Value

Users no longer need to guess which events are worth automating or why an event task did or did not fire. The system becomes observable and teachable.

## Scope

- event center page
- event listing and filtering
- event detail view
- event-to-run and event-to-thread correlation
- safe event replay
- create-event-task-from-event entry point

## Public Interfaces

- event-center API for event list and details
- replay API for supported event types
- frontend Event Center route under Automation

## Acceptance Criteria

- user can list recent events
- user can inspect an event with related run and thread references
- user can replay a supported event
- user can create an event task from an event detail surface

## Exit Gate

- backend API tests for event-center list and replay pass
- frontend event-center route and interaction tests pass
- end-to-end flow proves inspect -> create task -> replay -> observe run
