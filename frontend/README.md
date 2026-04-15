# Nion Desktop Renderer

Like the original Nion 1.0, we would love to give the community a minimalistic and easy-to-use web interface with a more modern and flexible architecture.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with [App Router](https://nextjs.org/docs/app)
- **UI**: [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), [MagicUI](https://magicui.design/) and [React Bits](https://reactbits.dev/)
- **AI Integration**: Desktop runtime client and [Vercel AI Elements](https://vercel.com/ai-sdk/ai-elements)
- **Config Center**: TanStack Query client for `/api/config*` plus grouped settings shell scaffolding
- **Runtime Shell**: thread-level runtime toggle, workdir browser, and four shortcut lanes in the chat composer

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10.26.2+

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Development

```bash
# Start development server
pnpm dev

# The app will be available at http://localhost:3000
# Standalone loopback access also works at http://127.0.0.1:3000
# API routes are proxied to the local backend services automatically
```

### Build

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Build for production
pnpm build

# Start production server
pnpm start
```

## Site Map

```
├── /workspace/chats                         # Chat list / chat threads
├── /workspace/automation                    # Automation workspace
└── /workspace/notebook                      # Notebook workspace
```

The chat sidebar now supports temporary delegated child runs through a dedicated sidebar panel for the active thread. These child runs are inspectable from the sidebar, but they are not first-class recent chats and are restored from the dedicated `/api/threads/{thread_id}/child-runs` surface instead of thread search history. The recent-chat history taxonomy now only keeps `Chats` and `Bridge`; project threads fall back into the normal chat history instead of rendering a separate `Projects` tab.
The composer `@` popup now exposes two inline mention tabs: `Notebook` for notebook-directory mentions and `智能体` for custom-agent mentions. Selecting a custom agent inserts `@agent-name` into the draft and renders it with a dedicated colored agent mention style.

## Configuration

### Environment Variables

Key environment variables (see `.env.example` for full list):

```bash
# Backend API URLs (optional)
# Leave these unset for local `pnpm dev` use; Next.js rewrites proxy `/api/*`
# to the default local backend services automatically.
NEXT_PUBLIC_BACKEND_BASE_URL="http://localhost:8001"
# LangGraph API URLs (optional)
NEXT_PUBLIC_LANGGRAPH_BASE_URL="http://localhost:2024"
```

When running behind the local nginx entrypoint (`http://localhost:2026`), the frontend can use relative `/api/*` requests. When running standalone via `pnpm dev`, `next.config.js` rewrites `/api/langgraph/*` to `http://127.0.0.1:2024/*` and rewrites the remaining `/api/*` requests to `http://127.0.0.1:8001/api/*`. The settings shell now expects `/api/config`, `/api/config/schema`, and `/api/config/runtime-status` to be proxied to the gateway. The backend gateway must keep CORS open for both `http://localhost:3000` and `http://127.0.0.1:3000`, or browser fetches from the standalone frontend will fall back to client-side empty defaults.
The chat runtime shell also expects `/api/threads/{thread_id}/runtime-profile`, `/api/threads/{thread_id}/files/*`, and `/api/cli/catalog`.
## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes
│   ├── workspace/          # Main workspace pages
│   └── mock/               # Mock/demo pages
├── components/             # React components
│   ├── ui/                 # Reusable UI components
│   ├── workspace/          # Workspace-specific components
│   ├── landing/            # Landing page components
│   └── ai-elements/        # AI-related UI elements
├── core/                   # Core business logic
│   ├── api/                # API client & data fetching
│   ├── artifacts/          # Artifact management
│   ├── cli/                # Runtime-visible CLI catalog client
│   ├── config/              # App configuration
│   ├── config-center/      # Config Center API client
│   ├── files/              # Thread workdir meta/tree client
│   ├── i18n/               # Internationalization
│   ├── mcp/                # MCP integration
│   ├── messages/           # Message handling
│   ├── models/             # Data models & types
│   ├── settings/           # User settings
│   ├── skills/             # Skills system
│   ├── threads/            # Thread management
│   ├── todos/              # Todo system
│   └── utils/              # Utility functions
├── hooks/                  # Custom React hooks
├── lib/                    # Shared libraries & utilities
├── server/                 # Server-side code (Not available yet)
│   └── better-auth/        # Authentication setup (Not available yet)
└── styles/                 # Global styles
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the webpack-backed development server |
| `pnpm dev:turbo` | Start the explicit Turbopack development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix ESLint issues |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm check` | Run both lint and typecheck |

## Development Notes

- Uses pnpm workspaces (see `packageManager` in package.json)
- Development uses the webpack-backed `pnpm dev` flow by default to avoid the known Turbopack panic under non-ASCII repository paths; run `pnpm dev:turbo` explicitly when you need Turbopack in an ASCII-safe path
- Environment validation can be skipped with `SKIP_ENV_VALIDATION=1` (useful for Docker)
- Set `NION_STATIC_EXPORT=1` only when you intentionally need a static export build
- The settings dialog shell is grouped into Experience / Knowledge & Memory / Tools & Skills and preloads Config Center state when opened
- The chat page now exposes a runtime toggle plus Context / Skill / MCP / CLI shortcut lanes
- Chat thread titles now keep user-renamed titles stable during follow-up turns; later stream snapshots treat `"Untitled"` as a placeholder instead of a title reset
- Automatic conversation compression summaries stay in background context and now render in the timeline as a compact `Auto-compressed` tag instead of a full expanded message block
- The workspace now includes a top-level **Projects** module for long-running work containers, execution plans, project threads, timeline, managed artifacts, and completion-stage extraction suggestions
- The settings dialog now includes an **Agent Integrations** page for ACP adapters and a **Memory** storage selector that maps UI-safe modes onto Config Center state
- The desktop Remote Bridge now gates each platform behind a persisted verification state: users must verify the connection before enabling a channel, and each re-enable automatically re-verifies the platform
- Bridge configuration is now migrating toward Config Center / `config.db` as the shared source of truth, while bridge runtime state remains desktop-local

## License

MIT License. See [LICENSE](../LICENSE) for details.
