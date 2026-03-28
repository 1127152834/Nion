"use client";

import { useEffect, useRef, useState } from "react";

type TerminalWindow = Window &
  typeof globalThis & {
    nionDesktop?: {
      terminal?: {
        create: (options: {
          id: string;
          cwd: string;
          cols: number;
          rows: number;
        }) => Promise<void>;
        write: (id: string, data: string) => void;
        resize: (id: string, cols: number, rows: number) => Promise<void>;
        kill: (id: string) => Promise<void>;
        onData: (callback: (payload: { id: string; data: string }) => void) => () => void;
        onExit: (callback: (payload: { id: string; code: number }) => void) => () => void;
      };
    };
  };

type UseTerminalInput = {
  cwd: string | null;
  sessionId: string;
};

export function useTerminal({ cwd, sessionId }: UseTerminalInput) {
  const desktopWindow = window as TerminalWindow;
  const [isDesktop] = useState(
    () => typeof window !== "undefined" && Boolean(desktopWindow.nionDesktop?.terminal),
  );
  const [connected, setConnected] = useState(false);
  const [exited, setExited] = useState(false);
  const terminalIdRef = useRef("");
  const onDataRef = useRef<((data: string) => void) | null>(null);
  const unsubDataRef = useRef<(() => void) | null>(null);
  const unsubExitRef = useRef<(() => void) | null>(null);

  const create = async (cols: number, rows: number) => {
    const api = desktopWindow.nionDesktop?.terminal;
    if (!api || !cwd) {
      return;
    }
    if (terminalIdRef.current) {
      try {
        await api.kill(terminalIdRef.current);
      } catch {
        // ignore
      }
    }
    const id = `term-${sessionId}-${Date.now()}`;
    terminalIdRef.current = id;
    setExited(false);
    unsubDataRef.current?.();
    unsubExitRef.current?.();
    unsubDataRef.current = api.onData((payload) => {
      if (payload.id === id) {
        onDataRef.current?.(payload.data);
      }
    });
    unsubExitRef.current = api.onExit((payload) => {
      if (payload.id === id) {
        setConnected(false);
        setExited(true);
      }
    });
    await api.create({ id, cwd, cols, rows });
    setConnected(true);
  };

  const write = (data: string) => {
    const api = desktopWindow.nionDesktop?.terminal;
    if (!api || !terminalIdRef.current) {
      return;
    }
    api.write(terminalIdRef.current, data);
  };

  const resize = async (cols: number, rows: number) => {
    const api = desktopWindow.nionDesktop?.terminal;
    if (!api || !terminalIdRef.current) {
      return;
    }
    await api.resize(terminalIdRef.current, cols, rows);
  };

  const kill = async () => {
    const api = desktopWindow.nionDesktop?.terminal;
    if (!api || !terminalIdRef.current) {
      return;
    }
    try {
      await api.kill(terminalIdRef.current);
    } catch {
      // ignore
    }
    terminalIdRef.current = "";
    setConnected(false);
  };

  const setOnData = (callback: (data: string) => void) => {
    onDataRef.current = callback;
  };

  useEffect(() => {
    return () => {
      unsubDataRef.current?.();
      unsubExitRef.current?.();
      if (terminalIdRef.current && desktopWindow.nionDesktop?.terminal) {
        void desktopWindow.nionDesktop.terminal.kill(terminalIdRef.current);
      }
    };
  }, []);

  return {
    isDesktop,
    connected,
    exited,
    create,
    write,
    resize,
    kill,
    setOnData,
  };
}
