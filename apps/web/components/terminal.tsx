"use client";

import { ClipboardAddon } from "@xterm/addon-clipboard";
import { FitAddon } from "@xterm/addon-fit";
import { LigaturesAddon } from "@xterm/addon-ligatures";
import { SearchAddon } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal as XTerm } from "@xterm/xterm";
import { useEffect, useRef, useState } from "react";
import "@xterm/xterm/css/xterm.css";

type TerminalProps = {
  podName: string;
  container: string;
  shell?: string;
  mode?: "shell" | "console";
  onClose?: () => void;
};

export function Terminal({
  podName,
  container,
  shell = "/bin/sh",
  mode = "shell",
  onClose,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Fira Code, Menlo, Monaco, "Courier New", monospace',
      fontWeight: "normal",
      fontWeightBold: "bold",
      letterSpacing: 0,
      lineHeight: 1.2,
      theme: {
        background: "#0a0a0a",
        foreground: "#e0e0e0",
        cursor: "#00ff00",
        cursorAccent: "#000000",
        selectionBackground: "#3a3d41",
        selectionForeground: "#ffffff",
        black: "#000000",
        red: "#ff5555",
        green: "#50fa7b",
        yellow: "#f1fa8c",
        blue: "#bd93f9",
        magenta: "#ff79c6",
        cyan: "#8be9fd",
        white: "#bfbfbf",
        brightBlack: "#4d4d4d",
        brightRed: "#ff6e67",
        brightGreen: "#5af78e",
        brightYellow: "#f4f99d",
        brightBlue: "#caa9fa",
        brightMagenta: "#ff92d0",
        brightCyan: "#9aedfe",
        brightWhite: "#e6e6e6",
      },
      rows: 30,
      cols: 100,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();
    const clipboardAddon = new ClipboardAddon();
    const unicode11Addon = new Unicode11Addon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(clipboardAddon);
    term.loadAddon(unicode11Addon);

    term.unicode.activeVersion = "11";

    term.open(terminalRef.current);

    try {
      const ligaturesAddon = new LigaturesAddon();
      term.loadAddon(ligaturesAddon);
    } catch (_e) {}

    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    term.attachCustomKeyEventHandler((event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "f") {
        event.preventDefault();
        setShowSearch((prev) => !prev);
        return false;
      }
      return true;
    });

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = new URL("/api/terminal/exec", window.location.origin);
    wsUrl.protocol = protocol;
    wsUrl.searchParams.set("podName", podName);
    wsUrl.searchParams.set("container", container);
    wsUrl.searchParams.set("shell", shell);
    wsUrl.searchParams.set("mode", mode);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      term.writeln(
        `\r\n\x1b[1;32mConnecting to ${mode === "console" ? "Minecraft console" : "shell"}...\x1b[0m\r\n`
      );

      const { cols, rows } = term;
      ws.send(JSON.stringify({ type: "resize", cols, rows }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "output") {
          term.write(message.data);
        } else if (message.type === "ready") {
          term.writeln(`\x1b[1;32m${message.data}\x1b[0m\r\n`);
        } else if (message.type === "error") {
          term.writeln(`\r\n\x1b[1;31mError: ${message.data}\x1b[0m\r\n`);
          setError(message.data);
        } else if (message.type === "close") {
          term.writeln(`\r\n\x1b[1;33m${message.data}\x1b[0m\r\n`);
          setConnected(false);
        }
      } catch (_err) {}
    };

    ws.onerror = (_err) => {
      term.writeln("\r\n\x1b[1;31mWebSocket error\x1b[0m\r\n");
      setError("Connection error");
      setConnected(false);
    };

    ws.onclose = (event) => {
      const detail =
        event.reason ||
        (event.code === 1006 ? "Connection closed unexpectedly" : "Connection closed");
      term.writeln(`\r\n\x1b[1;33m${detail} (${event.code})\x1b[0m\r\n`);
      setConnected(false);
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }));
      }
    });

    term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols, rows }));
      }
    });

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      term.dispose();
    };
  }, [podName, container, shell, mode]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        {connected && (
          <div className="flex items-center gap-2 rounded bg-success/20 px-2 py-1 text-xs text-success">
            <div className="h-2 w-2 animate-pulse rounded-full bg-success" />
            Connected
          </div>
        )}
        {error && (
          <div className="rounded bg-destructive/20 px-2 py-1 text-xs text-destructive">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowSearch(!showSearch)}
          className="bg-muted hover:bg-muted/80 text-foreground text-xs px-2 py-1 rounded"
          title="Search (Ctrl+F)"
        >
          🔍 Search
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="bg-muted hover:bg-muted/80 text-foreground text-xs px-2 py-1 rounded"
          >
            Close
          </button>
        )}
      </div>

      {showSearch && (
        <div className="absolute top-12 right-2 bg-background border border-border rounded-lg p-3 shadow-lg z-20 min-w-[300px]">
          <div className="flex items-center gap-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  searchAddonRef.current?.findNext(searchTerm, {
                    caseSensitive: false,
                    wholeWord: false,
                    regex: false,
                  });
                } else if (e.key === "Escape") {
                  setShowSearch(false);
                }
              }}
              placeholder="Search..."
              className="flex-1 px-2 py-1 text-sm bg-muted border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => {
                searchAddonRef.current?.findNext(searchTerm, {
                  caseSensitive: false,
                  wholeWord: false,
                  regex: false,
                });
              }}
              className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
              title="Find Next"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => {
                searchAddonRef.current?.findPrevious(searchTerm, {
                  caseSensitive: false,
                  wholeWord: false,
                  regex: false,
                });
              }}
              className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
              title="Find Previous"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => setShowSearch(false)}
              className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded"
            >
              ✕
            </button>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Press Enter to find next, Esc to close
          </div>
        </div>
      )}

      <div ref={terminalRef} className="w-full h-full" />
    </div>
  );
}
