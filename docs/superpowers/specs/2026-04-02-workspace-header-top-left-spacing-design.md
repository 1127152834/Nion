# Workspace Header Top-Left Spacing Design

## Goal

Make the top-left workspace header feel less cramped on macOS after enabling the native traffic-light controls.

This is a **small chrome refinement**, not a redesign. The change should only improve the relationship between:

- the macOS traffic-light controls
- the `Nion` wordmark
- the sidebar collapse button

## Confirmed Direction

Use the `错层让位` approach:

- keep the native traffic-light controls visually untouched
- move the `Nion` wordmark slightly down and slightly right so it no longer fights the traffic-light cluster
- make the collapse button slightly smaller and lighter
- align the collapse button with the wordmark baseline instead of letting it sit too high

## Design Rules

1. Do not add new decorative containers, capsules, or badges around the traffic-light controls.
2. Do not introduce a new visual language for the whole sidebar.
3. Do not change the information architecture or add new controls.
4. Preserve the current warm, quiet workspace tone.
5. Solve the issue with spacing, scale, alignment, and visual weight only.

## Implementation Shape

Apply the refinement in `frontend/src/components/workspace/workspace-header.tsx`.

Expected adjustments:

- increase the visible header breathing room a little so the top-left cluster has space
- offset the `Nion` wordmark downward by roughly 8 to 10 px relative to the traffic lights
- offset the `Nion` wordmark rightward by roughly 6 to 10 px relative to the traffic lights
- slightly reduce the wordmark emphasis by tightening spacing and avoiding an oversized/heavy feel
- reduce collapse-button visual weight with a smaller footprint and softer border/background treatment
- keep the collapse button close to the wordmark, but not touching it

## Out of Scope

- changing the traffic-light style itself
- moving the traffic lights to a custom position
- redesigning the whole sidebar header
- changing the main page layout
- adding platform-specific custom titlebar widgets beyond this local spacing fix

## Verification

Implementation is correct when:

- the traffic lights still read as native macOS controls
- the `Nion` wordmark no longer feels jammed under the traffic lights
- the collapse button no longer competes with the wordmark
- the header still feels visually quiet and consistent with the existing workspace
