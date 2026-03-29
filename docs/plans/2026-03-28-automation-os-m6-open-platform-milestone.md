# Automation OS M6 Milestone

## Title

Open Platform

## Objective

Expose Automation OS to external systems through versioned event ingestion and plugin-style actions.

## User Value

Users and integrators can connect third-party systems to Nion automations and extend actions beyond the built-in set.

## Scope

- external webhook trigger
- versioned external event schema
- plugin action contract
- connector management UI
- platform validation and quotas

## Public Interfaces

- public webhook trigger API
- versioned external event contract
- plugin action registration and invocation contract

## Acceptance Criteria

- external systems can send supported events into Automation OS
- plugin actions can be invoked under bounded execution rules
- external execution results are observable in runs and logs

## Exit Gate

- public contract tests pass
- plugin sandbox and validation tests pass
- external event -> action -> run E2E passes
