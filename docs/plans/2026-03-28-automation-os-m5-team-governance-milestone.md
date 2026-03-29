# Automation OS M5 Milestone

## Title

Team Governance

## Objective

Make Automation OS safe and useful for shared team use through ownership, visibility, approvals, and auditability.

## User Value

Teams can share automations without losing control over who can edit, approve, or execute high-risk actions.

## Scope

- shared/private visibility
- ownership model
- approval requests for high-risk actions
- audit history
- shared template publishing

## Public Interfaces

- ownership and visibility fields on rules and workflows
- approval state model
- audit endpoints and approval APIs

## Acceptance Criteria

- a high-risk automation can require approval
- approval decisions are recorded
- rule ownership and visibility are enforced
- audit records can explain who changed what

## Exit Gate

- permission and approval tests pass
- audit integrity tests pass
- E2E proves approval-required execution and audit visibility
