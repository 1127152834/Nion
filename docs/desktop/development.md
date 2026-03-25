# Nion Desktop Development

## Goal

Nion Desktop is the only supported product surface in this branch. The application is packaged as an Electron shell plus a bundled Python helper.

## Local Workflow

1. Install dependencies:

```bash
make install
make desktop-install
```

2. Build the helper and shell:

```bash
make build-desktop
```

3. Launch the desktop app:

```bash
make desktop-dev
```

If the desktop shell and helper are already built, you can skip rebuilding:

```bash
make desktop-start
```

4. Run focused checks:

```bash
cd frontend && pnpm typecheck
cd desktop && pnpm test
cd backend && UV_LINK_MODE=copy uv run pytest -q
```

## Desktop Runtime Contract

- The Electron renderer is served from the privileged `nion://app` scheme, not `http://localhost`.
- The Python helper must accept CORS requests from `nion://app` because there is no nginx layer in desktop mode.
- `desktop/postcss.config.js` is required so Vite processes the shared Tailwind v4 stylesheet; without it the renderer falls back to mostly unstyled HTML.
- `make package-desktop-builder` publishes GitHub metadata by default; set `NION_UPDATE_BASE_URL` only when you want the optional generic/CDN update feed baked into the build.

## Packaging Lanes

- Canonical release lane: `electron-builder`
- Secondary verification lane: `electron-forge`

## Known Blocker

`next build --webpack` under `output: "export"` is currently blocked by a Next.js 16 `/_global-error` prerender bug on this branch.
