# Nion Design System

## 1. Visual Theme & Atmosphere

Nion is a dual-surface product.

The public landing experience should feel cinematic, ambitious, and slightly cosmic: a dark stage with starfield depth, masked grids, restrained glow, and a sense of "one thought, many systems moving." It is the promise layer.

The authenticated workspace should feel like a warm operations room: calm ivory and parchment neutrals, soft ink text, floating side rails, rounded tool surfaces, and selective signal colors. It is the execution layer.

The two layers must feel like the same product. The bridge is not shared background color. The bridge is shared contrast discipline, shared typography behavior, shared radius language, and a consistent signal hierarchy:

- Warm neutrals for structure and legibility
- Ink and soot for authority
- Gold for elevated capability and "ultra" emphasis
- Emerald for safe/automated/sandbox states
- Amber for host/power/manual control
- Aurora multicolor only for spectacle, onboarding, or celebration

The current product already contains these ingredients. The optimized system decision is to make them intentional instead of situational.

### Core Personality

- Intelligent, not noisy
- Theatrical on entry, disciplined in use
- Warm and human despite being deeply technical
- Agentic and capable without falling into generic "cyber AI" aesthetics
- Editorial in moments of brand expression, operational everywhere else

### Key Characteristics

- Landing pages may use near-black cinematic fields, galaxy motion, masked grid textures, and slow aurora accents
- Workspace surfaces should stay warm, low-glare, and paper-like rather than glassy or neon
- Most product UI should derive its identity from spacing, typography, and material contrast before color
- Accent colors should communicate role, not decoration
- One component should usually have one dominant accent family

## 2. Color Palette & Roles

Nion should be built from a warm neutral foundation with a narrow signal palette.

### Foundational Neutrals

| Name | Value | Role |
| --- | --- | --- |
| Ivory Canvas | `oklch(0.9855 0.0098 87.47)` | Primary light background |
| Paper Card | `oklch(1 0.0098 87.47)` | Light cards, panels, elevated surfaces |
| Dust Surface | `oklch(0.97 0.0098 87.47)` | Muted fills, chips, soft separators |
| Stone Surface | `oklch(0.9455 0.0098 87.47)` | Secondary fills and hover states |
| Ink | `oklch(0.145 0 0)` | Primary text, icons, strong dividers |
| Soft Ink | `oklch(0.205 0 0)` | Secondary text on light surfaces |
| Quiet Copy | `oklch(0.556 0 0)` | Supporting text, helper copy |
| Hairline Border | `oklch(0.922 0.0098 87.47)` | Default light border |
| Soot Field | `oklch(0.24 0.0036 106.64)` | Main dark workspace background |
| Night Card | `oklch(0.238 0.0036 106.64)` | Dark cards and dark shell surfaces |
| Night Popover | `oklch(0.205 0.0036 106.64)` | Deep dark overlays and menus |
| Mist Text | `oklch(0.708 0 0)` | Muted text on dark surfaces |
| Dark Border | `oklch(1 0 0 / 10%)` | Default dark border |

These warm neutrals are the real brand substrate. Do not replace them with cold gray, blue-black, or pure white/pure black.

### Signal Palette

| Name | Value | Role |
| --- | --- | --- |
| Nion Gold Deep | `#d19e1d` | Premium emphasis, start of ultra gradient |
| Nion Gold Soft | `#e9c665` | Midpoint of ultra gradient, celebratory text |
| Nion Gold Bright | `#e3a812` | End of ultra gradient, strong premium accent |
| Sandbox Emerald | `#52c41a` | Success, safe execution, sandbox-active signals |
| Host Amber | `#d48806` | Host mode, manual power, warning-adjacent control |
| Danger Red | `#cf1322` | Destructive actions, failures, irreversible moments |
| Danger Surface | `#fff1f0` | Danger background on light surfaces |
| Warning Surface | `#fffbe6` | Warning background on light surfaces |

### Supporting Accent Family

| Name | Value | Role |
| --- | --- | --- |
| Chart Warm | `var(--chart-4)` | Warm proof points, hero glow, trust blocks |
| Chart Teal | `var(--chart-2)` | Information, systems, memory, diagrams |
| Chart Indigo | `var(--chart-1)` | Ecosystem, graph relationships, supporting data |
| Aurora Prism | mixed gradient | Landing hero, celebratory shimmer, not structural UI |

### Color Optimization Rules

- Gold is not a general CTA color. Use it for ultra mode, premium emphasis, and celebratory highlight text.
- Emerald and amber form a semantic pair. Use emerald for sandbox or safe automation, amber for host or operator-controlled execution.
- Aurora gradients are allowed only on hero, welcome, or active-progress spectacle moments. Keep them below 5% of visible UI area.
- Avoid mixing emerald, gold, indigo, and aurora in a single component.
- If a surface already has strong motion or texture, keep its color system simpler.

## 3. Typography Rules

Nion uses a three-family typography system:

- Sans for almost all UI, data, and operational reading
- Serif for brand, manifesto, and high-trust editorial moments
- Monospace for code, file paths, commands, IDs, and machine-readable labels

### Font Families

- Primary UI Sans: `ui-sans-serif, system-ui, sans-serif`
- Editorial Serif: `ui-serif, Georgia, Cambria, "Times New Roman", serif`
- Technical Mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

Do not introduce decorative novelty fonts into product surfaces. The sophistication should come from hierarchy and restraint.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Tracking | Usage |
| --- | --- | --- | --- | --- | --- | --- |
| Marketing Display | Sans | `clamp(3rem, 7vw, 4.75rem)` | 700 | 1.0-1.08 | `-0.05em` to `-0.07em` | Landing hero headlines |
| Editorial Display | Serif | `clamp(2.5rem, 6vw, 4rem)` | 600 | 1.05-1.12 | `-0.03em` | About page hero, manifesto sections |
| Section Heading | Serif or Sans | 2rem-3rem | 600 | 1.1-1.2 | tight | Major section openers |
| Workspace Heading | Sans | 1.5rem-2.25rem | 600 | 1.15-1.25 | `-0.02em` to `-0.04em` | Page titles, empty states |
| Body Large | Sans | 1rem-1.125rem | 400-500 | 1.7-1.9 | normal | Intro copy, explanatory text |
| Body | Sans | 0.9375rem-1rem | 400-500 | 1.6-1.8 | normal | Standard product copy |
| Label / Meta | Sans | 11px-13px | 500-600 | 1.4-1.5 | `0.08em` to `0.18em` uppercase | Section labels, metric captions |
| Code / Path | Mono | 12px-13px | 400-500 | 1.5-1.6 | 0 | File paths, commands, IDs |

### Typography Behavior

- Use serif sparingly but confidently. It should signal brand gravity, not fill entire interfaces.
- Use uppercase tracked labels for metadata and orientation, never for body paragraphs.
- Use mono anywhere the user may scan or copy literal values.
- Large headings should feel compressed and decisive, not airy.

## 4. Component Stylings

### Buttons

**Primary Product Button**

- Fill: `var(--primary)`
- Text: `var(--primary-foreground)`
- Radius: default `10px`, full-pill only for high-level CTA
- Shadow: minimal or none
- Use: main action in workspace

**Outline / Secondary Button**

- Background: `var(--background)` or lightly tinted neutral
- Border: 1px hairline
- Hover: move to `var(--accent)` / `var(--secondary)`
- Use: secondary actions, persistent utility actions

**Signal Button**

- Emerald for sandbox or safe-state actions
- Amber for host-mode or operator-power actions
- Gold gradient only for ultra mode, premium assistance, or celebratory conversion points

Do not turn every important button into a colorful button. Most actions should remain neutral.

### Cards and Panels

**Standard Product Card**

- Background: `var(--card)`
- Border: 1px `var(--border)`
- Radius: `12px`
- Shadow: soft `shadow-sm`
- Use: settings sections, utility panels, list surfaces

**Floating Product Panel**

- Background: mostly opaque card fill
- Border: subtle
- Radius: `16px` to `24px`
- Backdrop blur: allowed when panel overlays content
- Use: composer shells, command surfaces, notebooks, automation pickers

**Editorial Showcase Card**

- Large radius `24px` to `32px`
- Layered gradient fill or radial highlight
- Fine border, not thick stroke
- Use: about page hero, proof blocks, premium highlight modules

### Sidebar and Navigation

- Sidebar should feel like a floating instrument rail, not a heavy app drawer
- Default width: `16rem`
- Collapsed width: `4rem`
- Floating variant should use internal padding, rounded outer shell, and a very soft shadow
- Wordmark uses serif and measured tracking
- Fixed landing header should blur slightly and sit on top of content with a single hairline divider

### Inputs and Composer

- Chat composer is a rounded-2xl command surface
- Use `bg-background/75` to `bg-background/85` with subtle blur
- Inputs should read as part of a tool tray, not a raw form
- Attachment chips and mention chips should be compact, neutral, and tactile
- Focus state should come from local contrast and subtle ring, not saturated neon

### Message and Agent Surfaces

- Clarification cards, permission cards, and tool cards can use rounded 2xl shells with blur and soft borders
- Active subtask cards may use animated shine or ambient multi-hue border only while work is actively running
- Completed or idle agent surfaces must fall back to calm neutrals
- Code blocks and artifact references should feel technical and clean, not ornamental

### Notebook Surfaces

- Notebook shell should feel like a warmer editorial workspace inside the product
- Panels use `1.5rem` radius with paper-like fills
- Local semantic colors for warning, danger, and success are acceptable inside notebook flows
- Notebook should prioritize calm reading and writing over brand spectacle

### Dialogs, Menus, and Date Pickers

- Large dialogs and schedulers may use warm translucent gradients and soft interior highlights
- Radius: `20px` to `24px`
- Shadows should be deeper than cards but still warm, not hard-edged
- Menus and popovers should remain simpler than dialogs

### Decorative and Hero Effects

Allowed:

- Galaxy fields
- Masked flickering grids
- Aurora text
- Soft radial glows
- Shimmer on active progress

Not allowed as routine product chrome:

- Always-on rainbow borders
- Constant pulsating glows
- Large glassmorphism slabs
- Busy grid overlays behind dense data UI

## 5. Layout Principles

Nion works best when the layout clearly separates navigation, execution, and context.

### Structural Model

- Landing: fixed top bar, full-height hero, then paced vertical storytelling
- Workspace: floating sidebar rail + primary canvas + optional context/detail rail
- Notebook: tri-pane editorial workspace with clear reading priority
- Chat: main dialogue column plus optional artifact/detail panel

### Container Strategy

- Use the existing centered `container-md` rhythm for landing and high-level marketing
- Workspace content should avoid edge-to-edge sprawl; even full-width screens need breathing room
- Secondary panels should feel attached, not like separate apps

### Spacing System

- Base unit: `4px`
- Common rhythm: 8, 12, 16, 20, 24, 32, 40, 48, 64
- Dense UI clusters may use 6px and 10px
- Large showcase sections should use 32px to 96px vertical rhythm

### Radius Scale

| Radius | Role |
| --- | --- |
| 10px | Buttons, inputs, compact controls |
| 12px | Default cards |
| 16px | Elevated panels, drawers, grouped surfaces |
| 24px | Editorial cards, pickers, premium shells |
| 32px | Landing hero modules and special showcases |
| Full pill | Chips, segmented controls, mode indicators |

### Composition Rules

- Landing can be more theatrical and centered
- Workspace should be left-led and task-oriented
- Avoid repeating identical card grids with equal-weight content
- Alternate dense technical zones with larger areas of calm whitespace
- Let brand moments happen at section entry or action peak, not everywhere

### Workspace Module Directories

- When a workspace surface is only routing the user into 2-4 high-frequency modules, treat it as a directory, not a dashboard
- Prefer a centered composition with vertically stacked entry rows when the option count is low
- Directory entries should feel precise and premium: compact icon, strong title, short description, one clear directional affordance
- Do not use oversized empty cards, fake showcase containers, or decorative section labels like "Modules" unless the screen genuinely needs them
- Do not add helper copy that merely explains obvious navigation choices; if the page already communicates the choice through structure, remove the sentence
- Premium feeling on these pages should come from spacing, rhythm, border contrast, and restraint rather than from gradients or large hero treatments

### Header Consistency

- Workspace top page headers should reuse the same structural pattern across sibling modules instead of creating lookalike one-off implementations
- Keep header hierarchy simple: title, one short supporting line when needed, and a right-aligned action area
- If two pages belong to the same workspace family, their header spacing, divider treatment, and action alignment should match exactly
- Prefer real structural consistency over approximate visual similarity

## 6. Depth & Elevation

Depth in Nion should feel material, not decorative.

| Level | Treatment | Use |
| --- | --- | --- |
| Level 0 | Flat background, no shadow | Page background, large canvas areas |
| Level 1 | Hairline border only | Base cards, separators, passive panels |
| Level 2 | Soft `shadow-sm` | Standard floating cards, sidebar shell |
| Level 3 | Soft blur plus warm shadow | Composer, dialogs, floating utility panels |
| Level 4 | Gradient highlight plus shadow | Showcase cards, premium highlights |
| Signal Layer | Temporary animated border or shimmer | In-progress agent work, celebratory transitions |

### Elevation Rules

- Prefer border + contrast before shadow
- Blur should be used to separate layers, not to fake sophistication
- A glowing edge is acceptable only when state changes matter
- Large shadows must stay diffuse and warm

## 7. Do's and Don'ts

### Do

- Keep the workspace grounded in warm neutral materials
- Use serif only where it adds authority or emotional weight
- Use mono wherever the user scans technical values
- Reserve gold for ultra, premium, and celebratory emphasis
- Reserve emerald and amber for runtime-state signaling
- Let accent colors explain system meaning
- Keep interactive surfaces tactile and slightly softened
- Preserve calm reading conditions in notebook and settings flows
- Keep module entry screens sparse, centered, and decisive when the information architecture is simple

### Don't

- Do not make the main workspace feel like the landing hero
- Do not spread aurora gradients across ordinary controls
- Do not use pure black or pure white as dominant surfaces
- Do not use more than one loud accent family inside a component
- Do not use thick borders as the default way to create emphasis
- Do not overuse blur, shimmer, or glow on idle interfaces
- Do not style every panel as a special card
- Do not default to purple-blue "AI startup" gradients
- Do not keep explanatory filler copy on navigation pages once the layout itself is already self-explanatory

## 8. Responsive Behavior

### Landing

- Hero remains centered on mobile, but supporting copy should tighten vertically
- Background spectacle must scale down before text legibility is compromised
- Header actions should simplify instead of stacking multiple competing CTAs

### Workspace

- Sidebar collapses to icon rail on desktop and sheet on mobile
- Detail rails and artifact panels should become stacked or drawer-like on narrow screens
- Composer must preserve thumb reach and bottom safe area
- Dense settings pages should collapse from 3-column previews to 1-column stacks

### Notebook

- Reading pane gets priority on smaller screens
- Context and inbox panes may collapse, but note editing and navigation must remain discoverable
- Maintain generous tap targets and avoid putting multiple subtle icon-only actions in the same row on mobile

### Responsive Constraints

- Minimum tap target: 40px, prefer 44px
- Keep side padding comfortable: 16px minimum on mobile
- Prefer layout simplification over shrinking typography below readable sizes

## 9. Agent Prompt Guide

When generating or redesigning Nion UI, always preserve the product's dual-surface identity:

- Landing is cinematic and aspirational
- Workspace is warm, precise, and tool-first
- Notebook is editorial and calm

Always map new UI back to the existing token roles in `src/styles/globals.css` and the notebook-specific surface variables in `notebook-theme.ts` before inventing new colors.

### Prompt Rules

- Preserve existing information architecture unless the task explicitly asks for structural change
- Prefer refining token hierarchy, spacing, and state styling before adding new decorative elements
- Use one accent family per component
- If a screen already has motion, reduce color complexity
- If a screen already has strong color, reduce motion complexity

### Prompt Example: Landing Section

`Read DESIGN.md and redesign the landing hero for Nion. Keep the cinematic near-black stage, galaxy depth, and restrained spectacle. Use warm neutral typography, one strong CTA, and aurora only for the rotating headline or a single highlight moment. Do not make it look like a generic neon AI website.`

### Prompt Example: Workspace Module

`Read DESIGN.md and redesign this workspace page using Nion's warm operational UI language. Use floating neutral panels, soft borders, left-led layout, and minimal but meaningful signal color. Reserve emerald and amber for runtime-state communication only.`

### Prompt Example: Notebook

`Read DESIGN.md and update the notebook UI to feel more editorial and focused. Preserve the paper-like surfaces, rounded 1.5rem panels, and calm reading rhythm. Remove unnecessary spectacle and keep semantic warning/danger colors local to notebook actions.`

### Prompt Example: Settings or Tooling

`Read DESIGN.md and redesign the settings surface so it feels calm, technical, and deliberate. Use standard cards, compact labels, mono for literal values, and avoid colorful primary actions unless the action is truly state-defining.`

### Prompt Example: Premium or Ultra Mode

`Read DESIGN.md and add an ultra-mode treatment without changing the underlying layout. Keep the base UI neutral, then introduce Nion Gold as a localized premium signal through text gradient, chip emphasis, or a single focused control. Avoid turning the whole page gold.`

## 10. Optimization Priorities

These are the highest-value design cleanups for the current codebase.

### Priority 1: Unify Accent Semantics

Current UI already uses gold, emerald, amber, cyan, indigo, and aurora, but some usage is stylistic rather than semantic.

Standardize on this rule:

- Gold = ultra, premium, elevated capability
- Emerald = safe execution, success, sandbox
- Amber = host mode, operator control, cautionary power
- Indigo / teal = supporting system visualization only
- Aurora = spectacle only

Any existing hard-coded accent that does not match one of these roles should be normalized.

### Priority 2: Reduce Decorative Intensity in Workspace

The workspace contains some strong gradients, animated borders, and blur-heavy moments that are effective individually but can accumulate visual noise.

Optimize by:

- Keeping spectacle in welcomes, hero modules, and active-progress states
- Returning idle screens to neutral paper-like surfaces
- Using motion and glow only when state change matters

### Priority 3: Eliminate Token Drift

There are still local hard-coded colors in notebook, terminal, and some workflow surfaces.

Refactor these toward:

- `src/styles/globals.css` for shared product tokens
- notebook-local CSS custom properties for notebook-only semantics
- explicit semantic aliases instead of one-off hex values

The target is not zero hard-coded color literals. The target is that every hard-coded literal has a good reason.

### Priority 4: Normalize Radius and Panel Recipes

Current UI uses several radius families that are close but not always intentional.

Normalize toward:

- 10px for controls
- 12px for standard cards
- 16px for elevated product panels
- 24px for editorial or utility overlays
- 32px only for hero/showcase modules

Likewise, consolidate panel materials into a few repeatable recipes rather than ad hoc combinations of border, blur, and shadow.

### Priority 5: Separate Brand Theater from Operational UI

Nion is strongest when the landing page sells ambition and the workspace sells clarity.

Preserve this separation:

- Landing can be cosmic, dramatic, and performative
- Workspace should be confident, warm, and restrained
- Notebook should be quieter than both

Whenever a workspace change starts to feel like a mini landing page, dial it back.
