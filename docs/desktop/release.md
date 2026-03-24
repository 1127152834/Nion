# Nion Desktop Release

## Release Inputs

- Electron shell from `desktop/`
- Python helper from `backend/packaging/pyinstaller/nion-backend.spec`
- Update feed metadata from `desktop/electron-builder.yml`

## Publish Targets

- Primary: GitHub Releases
- Secondary: generic CDN via `NION_UPDATE_BASE_URL`

## Commands

```bash
make package-desktop-builder
make package-desktop-forge
node scripts/publish-desktop-release.mjs
```

## CI

- `.github/workflows/desktop-release.yml`
- `.github/workflows/desktop-smoke.yml`
