# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path


backend_root = Path.cwd().resolve()

block_cipher = None

a = Analysis(
    [str(backend_root / "app" / "desktop_helper.py")],
    pathex=[str(backend_root)],
    binaries=[],
    datas=[],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "tests",
        "docker",
        ".github",
        "speech_recognition",
        "pydub",
        "youtube_transcript_api",
        "azure",
        "azure.ai.documentintelligence",
        "azure.identity",
        "grpc_tools",
    ],
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="nion-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    name="nion-backend",
)
