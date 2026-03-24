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
make desktop-dev
```

3. Run focused checks:

```bash
cd frontend && pnpm typecheck
cd desktop && pnpm test
cd backend && UV_LINK_MODE=copy uv run pytest -q
```

## Packaging Lanes

- Canonical release lane: `electron-builder`
- Secondary verification lane: `electron-forge`

## Known Blocker

`next build --webpack` under `output: "export"` is currently blocked by a Next.js 16 `/_global-error` prerender bug on this branch.
