# Setup Guide

Quick setup instructions for Nion.

## Configuration Setup

Nion uses a YAML configuration file that should be placed in the **project root directory**.

### Steps

1. **Navigate to project root**:
   ```bash
   cd /path/to/nion
   ```

2. **Copy example configuration**:
   ```bash
   cp config.example.yaml config.yaml
   ```

3. **Edit configuration**:
   ```bash
   # Option A: Set environment variables (recommended)
   export OPENAI_API_KEY="your-key-here"

   # Option B: Edit config.yaml directly
   vim config.yaml  # or your preferred editor
   ```

4. **Verify configuration**:
   ```bash
   cd backend
   python -c "from nion.config import get_app_config; print('✓ Config loaded:', get_app_config().models[0].name)"
   ```

## Important Notes

- **Location**: `config.yaml` should be in `nion/` (project root), not `nion/backend/`
- **Git**: `config.yaml` is automatically ignored by git (contains secrets)
- **Priority**: If both `backend/config.yaml` and `../config.yaml` exist, backend version takes precedence
- **Bridge config**: Bridge credentials and verification state are now managed through the shared Config Center / `config.db`, not a desktop-only `bridge/settings.json`

## Configuration File Locations

The backend searches for `config.yaml` in this order:

1. `NION_CONFIG_PATH` environment variable (if set)
2. `backend/config.yaml` (current directory when running from backend/)
3. `nion/config.yaml` (parent directory - **recommended location**)

**Recommended**: Place `config.yaml` in project root (`nion/config.yaml`).

## Bridge Storage Notes

Bridge now uses a split storage model:

1. Shared configuration lives in the Config Center database and is available to
   both web and desktop surfaces through `/api/config`.
2. Desktop runtime state remains local to the desktop app for now, including
   bindings, offsets, incidents, observations, and Weixin runtime account data.

If you are upgrading from an older desktop build, the app may import the old
`bridge/settings.json` once into the shared config store. After that migration,
the JSON file is no longer authoritative.

## Sandbox Setup (Optional but Recommended)

If you plan to use Docker/Container-based sandbox (configured in `config.yaml` under `sandbox.use: nion.community.aio_sandbox:AioSandboxProvider`), it's highly recommended to pre-pull the container image:

```bash
# From project root
make setup-sandbox
```

**Why pre-pull?**
- The sandbox image (~500MB+) is pulled on first use, causing a long wait
- Pre-pulling provides clear progress indication
- Avoids confusion when first using the agent

If you skip this step, the image will be automatically pulled on first agent execution, which may take several minutes depending on your network speed.

## Troubleshooting

### Config file not found

```bash
# Check where the backend is looking
cd nion/backend
python -c "from nion.config.app_config import AppConfig; print(AppConfig.resolve_config_path())"
```

If it can't find the config:
1. Ensure you've copied `config.example.yaml` to `config.yaml`
2. Verify you're in the correct directory
3. Check the file exists: `ls -la ../config.yaml`

### Permission denied

```bash
chmod 600 ../config.yaml  # Protect sensitive configuration
```

## See Also

- [Configuration Guide](docs/CONFIGURATION.md) - Detailed configuration options
- [Architecture Overview](CLAUDE.md) - System architecture
