from pathlib import Path

from nion.sandbox.local.local_sandbox import LocalSandbox, PathMapping
from nion.sandbox.sandbox import Sandbox
from nion.sandbox.sandbox_provider import SandboxProvider

_singleton: LocalSandbox | None = None


class LocalSandboxProvider(SandboxProvider):
    def configure_path_mappings(self, sandbox: LocalSandbox, thread_data: dict | None) -> None:
        from nion.sandbox import tools as sandbox_tools

        mappings = []

        if thread_data is not None:
            workspace = thread_data.get("workspace_path")
            uploads = thread_data.get("uploads_path")
            outputs = thread_data.get("outputs_path")
            if workspace:
                mappings.append(
                    PathMapping(
                        host_path=str(Path(workspace).resolve()),
                        virtual_path=f"{sandbox_tools.VIRTUAL_PATH_PREFIX}/workspace",
                    )
                )
            if uploads:
                mappings.append(
                    PathMapping(
                        host_path=str(Path(uploads).resolve()),
                        virtual_path=f"{sandbox_tools.VIRTUAL_PATH_PREFIX}/uploads",
                    )
                )
            if outputs:
                mappings.append(
                    PathMapping(
                        host_path=str(Path(outputs).resolve()),
                        virtual_path=f"{sandbox_tools.VIRTUAL_PATH_PREFIX}/outputs",
                    )
                )

            acp_workspace = sandbox_tools._get_acp_workspace_host_path(thread_data)
            if acp_workspace:
                mappings.append(
                    PathMapping(
                        host_path=str(Path(acp_workspace).resolve()),
                        virtual_path=sandbox_tools._ACP_WORKSPACE_VIRTUAL_PREFIX,
                        read_only=True,
                    )
                )

        skills_host = sandbox_tools._get_skills_host_path()
        if skills_host:
            mappings.append(
                PathMapping(
                    host_path=str(Path(skills_host).resolve()),
                    virtual_path=sandbox_tools._get_skills_container_path(),
                    read_only=True,
                )
            )

        sandbox.set_path_mappings(mappings)

    def acquire(self, thread_id: str | None = None) -> str:
        global _singleton
        if _singleton is None:
            _singleton = LocalSandbox("local")
        return _singleton.id

    def get(self, sandbox_id: str) -> Sandbox | None:
        if sandbox_id == "local":
            if _singleton is None:
                self.acquire()
            return _singleton
        return None

    def release(self, sandbox_id: str) -> None:
        # LocalSandbox uses singleton pattern - no cleanup needed.
        # Note: This method is intentionally not called by SandboxMiddleware
        # to allow sandbox reuse across multiple turns in a thread.
        # For Docker-based providers (e.g., AioSandboxProvider), cleanup
        # happens at application shutdown via the shutdown() method.
        pass
