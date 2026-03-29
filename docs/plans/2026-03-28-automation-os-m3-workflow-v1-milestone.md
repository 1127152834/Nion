# Automation OS M3 Milestone

## Title

Workflow V1

## Objective

Upgrade Automation OS from single-action rules to ordered multi-step workflows with basic control flow.

## User Value

Users can move from “when X happens, do Y” to “when X happens, do Y, then Z, retry if needed, and wait for me if required.”

## Scope

- workflow object and step model
- sequential multi-action execution
- delay and retry
- wait-for-user step
- workflow detail view
- workflow run visibility

## Public Interfaces

- workflow schema under automation domain
- workflow run records identifying step-level failure state
- workflow route under Automation

## Acceptance Criteria

- a workflow can execute ordered steps
- a failing step is reported with step identity
- retries and delays work for supported step types
- a user continuation can resume a paused workflow

## Exit Gate

- workflow executor unit tests pass
- sequential workflow integration tests pass
- E2E proves trigger -> workflow -> pause/resume -> completion
