"use client";

import { useEffect, useRef, useState } from "react";

import { useTerminal } from "@/hooks/use-terminal";

type TerminalInstanceProps = {
  terminal: ReturnType<typeof useTerminal>;
};

export function TerminalInstance({ terminal }: TerminalInstanceProps) {
  const { isDesktop, connected, exited, create, write, setOnData } = terminal;
  const [output, setOutput] = useState("");
  const bufferRef = useRef("");
  const rafRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const flush = () => {
      rafRef.current = null;
      setOutput(bufferRef.current);
    };
    setOnData((data) => {
      bufferRef.current += data;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flush);
      }
    });
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [setOnData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    if (isDesktop && !connected && !exited) {
      void create(120, 30);
    }
  }, [connected, create, exited, isDesktop]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [connected]);

  return (
    <div
      className="flex h-full flex-col bg-[#1a1a1a] font-mono text-xs text-[#d4d4d4]"
      onClick={() => inputRef.current?.focus()}
    >
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto whitespace-pre-wrap break-all p-2"
      >
        {output}
      </div>
      <div className="flex items-center border-t border-[#333] px-2">
        <span className="mr-1 text-green-400">$</span>
        <input
          ref={inputRef}
          type="text"
          className="flex-1 border-none bg-transparent py-1.5 text-xs text-[#d4d4d4] caret-[#d4d4d4] outline-none"
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }
            const value = inputRef.current?.value || "";
            write(`${value}\n`);
            if (inputRef.current) {
              inputRef.current.value = "";
            }
          }}
          autoFocus
          spellCheck={false}
        />
      </div>
    </div>
  );
}
