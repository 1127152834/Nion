# Automation OS M4 Milestone

## Title

Templates and Packages

## Objective

Turn event tasks and workflows into reusable assets through package import/export and a template library.

## User Value

Users can save working automations as durable packages, move them between environments, and start from curated templates instead of rebuilding from scratch.

## Scope

- package manifest definition
- export and import flows
- template library
- official vs personal templates
- compatibility validation

## Public Interfaces

- package manifest for event tasks and workflows
- import/export endpoints
- template library route under Automation

## Acceptance Criteria

- a working package can be exported
- the package can be imported and validated
- imported templates can be activated and run
- compatibility errors are visible before activation

## Exit Gate

- manifest validation tests pass
- round-trip import/export tests pass
- E2E proves import -> activate -> run -> inspect
