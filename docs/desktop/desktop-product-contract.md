# Nion Desktop Product Contract

## Runtime

Nion Desktop is a desktop-only product. The shipped application now consists of an Electron single-window client and one single local daemon running on the local machine for a single signed-in desktop user. Production runtime must not require `nginx`, standalone `langgraph dev`, Docker, Kubernetes, or a browser-based deployment surface.

## Supported Platforms

- macOS
- Windows

## Preserved User-Visible Capabilities

- Chat threads, agent conversations, and streaming responses
- Local workspace, uploads, artifacts, exports, and runtime profile controls
- Automation jobs and scheduled execution
- Channels and IM integrations that can run from the single local daemon
- Remote search and scrape tools exposed through the local runtime
- Cloud model providers and local OpenAI-compatible model endpoints
- Skills, MCP-backed extensions, recall, and OpenViking-backed memory

## Removed Deployment Surfaces

- Browser-first startup and public web deployment workflows
- `nginx` reverse proxy topology
- Standalone `langgraph dev` server topology in production packaging
- Docker, Kubernetes, and provisioner payloads from the desktop bundle
- Desktop-unneeded browser auth and server-only renderer routes

## Packaging Lanes

- Canonical release packaging: `electron-builder`
- Secondary verification/fallback packaging: `electron-forge`

## Daemon Strategy

The bundled Python runtime is frozen with `PyInstaller --onedir` and shipped as an unpacked resource next to the Electron application, but it now boots the local daemon entrypoint rather than an Electron-owned helper wrapper. The daemon owns the local API, streaming, automation, and background runtime surfaces, and `allow_background_running` determines whether it survives Electron shutdown after the configured short grace period.

## Update Providers

- Primary auto-update and release source: GitHub Releases
- Secondary mirror/update source: generic CDN feed

The application must support GitHub Releases by default and allow generic CDN metadata and payload hosting without forking the app.

## Bundle Budgets

- Keep the packaged desktop app small enough for routine desktop download and upgrade flows
- Remove deployment-only dependencies and assets from the desktop bundle
- Preserve full end-user feature coverage while enforcing explicit size budgets for:
  - packaged macOS artifacts
  - packaged Windows artifacts
  - bundled Python helper payload
