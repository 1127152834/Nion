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
├── /                    # Landing page
├── /chats               # Chat list
├── /chats/new           # New chat page
└── /chats/[thread_id]   # A specific chat page
```

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

When running behind the local nginx entrypoint (`http://localhost:2026`), the frontend can use relative `/api/*` requests. When running standalone via `pnpm dev`, `next.config.js` rewrites `/api/langgraph/*` to `http://127.0.0.1:2024/*` and rewrites the remaining `/api/*` requests to `http://127.0.0.1:8001/api/*`. The settings shell now expects `/api/config`, `/api/config/schema`, and `/api/config/runtime-status` to be proxied to the gateway.
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
| `pnpm dev` | Start development server with Turbopack |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix ESLint issues |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm check` | Run both lint and typecheck |

## Development Notes

- Uses pnpm workspaces (see `packageManager` in package.json)
- Turbopack enabled by default in development for faster builds
- Environment validation can be skipped with `SKIP_ENV_VALIDATION=1` (useful for Docker)
- Set `NION_STATIC_EXPORT=1` only when you intentionally need a static export build
- The settings dialog shell is grouped into Experience / Knowledge & Memory / Tools & Skills and preloads Config Center state when opened
- The chat page now exposes a runtime toggle plus Context / Skill / MCP / CLI shortcut lanes

## License

MIT License. See [LICENSE](../LICENSE) for details.
