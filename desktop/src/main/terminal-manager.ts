import { spawn, type ChildProcessWithoutNullStreams } from "child_process";

export interface TerminalCreateOptions {
  cwd: string;
  cols: number;
  rows: number;
  env?: Record<string, string>;
}

type TerminalInstance = {
  process: ChildProcessWithoutNullStreams;
  cwd: string;
};

export class TerminalManager {
  private terminals = new Map<string, TerminalInstance>();
  private onData: ((id: string, data: string) => void) | null = null;
  private onExit: ((id: string, code: number) => void) | null = null;

  setOnData(handler: (id: string, data: string) => void) {
    this.onData = handler;
  }

  setOnExit(handler: (id: string, code: number) => void) {
    this.onExit = handler;
  }

  create(id: string, options: TerminalCreateOptions) {
    if (this.terminals.has(id)) {
      this.kill(id);
    }

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ...(options.env ?? {}),
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      COLUMNS: String(options.cols),
      LINES: String(options.rows),
    };

    const child = spawn(this.getShell(), this.getShellArgs(), {
      cwd: options.cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdout.on("data", (data: Buffer) => {
      this.onData?.(id, data.toString());
    });
    child.stderr.on("data", (data: Buffer) => {
      this.onData?.(id, data.toString());
    });
    child.on("exit", (code) => {
      this.terminals.delete(id);
      this.onExit?.(id, code ?? 0);
    });
    child.on("error", () => {
      this.terminals.delete(id);
      this.onExit?.(id, 1);
    });

    this.terminals.set(id, { process: child, cwd: options.cwd });
  }

  write(id: string, data: string) {
    const terminal = this.terminals.get(id);
    if (!terminal) {
      return;
    }
    terminal.process.stdin.write(data);
  }

  resize(_id: string, _cols: number, _rows: number) {
    // No-op until a PTY backend is introduced.
  }

  kill(id: string) {
    const terminal = this.terminals.get(id);
    if (!terminal) {
      return;
    }
    try {
      terminal.process.kill();
    } catch {
      // ignore
    }
    this.terminals.delete(id);
  }

  killAll() {
    for (const terminalId of this.terminals.keys()) {
      this.kill(terminalId);
    }
  }

  private getShell() {
    if (process.platform === "win32") {
      return process.env.COMSPEC || "cmd.exe";
    }
    return process.env.SHELL || "/bin/zsh";
  }

  private getShellArgs() {
    if (process.platform === "win32") {
      return [];
    }
    return ["-il"];
  }
}
