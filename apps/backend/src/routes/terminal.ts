import { isUserSuspended } from "@minikura/db";
import { getErrorMessage } from "@minikura/shared/errors";
import type { Elysia } from "elysia";
import WebSocket, { type RawData } from "ws";
import { k8sService } from "../application/di-container";
import { logger } from "../infrastructure/logger";
import { auth } from "../middleware/auth";

type TerminalWsData = {
  query?: Record<string, string>;
  k8sWs?: WebSocket;
  request: Request;
};

type TerminalWs = {
  data: TerminalWsData;
  send: (message: string) => void;
  close: () => void;
};

type TerminalMessage =
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number };

type TlsOptions = {
  rejectUnauthorized: boolean;
  cert?: string;
  key?: string;
  ca?: string;
};

export const terminalRoutes = (app: Elysia) =>
  app.ws("/terminal/exec", {
    open: async (ws: TerminalWs) => {
      const session = await auth.api.getSession({ headers: ws.data.request.headers });
      const user = session?.user;
      const suspended =
        user &&
        ((user as unknown as { banned?: boolean }).banned === true ||
          isUserSuspended(
            user as unknown as { isSuspended: boolean; suspendedUntil: Date | null }
          ));

      if (user?.role !== "admin" || suspended) {
        ws.send(JSON.stringify({ type: "error", data: "Admin access required" }));
        ws.close();
        return;
      }

      const podName = ws.data.query?.podName;
      const container = ws.data.query?.container;
      const shell = ws.data.query?.shell || "/bin/sh";
      const mode = ws.data.query?.mode || "shell";

      logger.debug(
        `Opening terminal for pod: ${podName}, container: ${container}, shell: ${shell}, mode: ${mode}`
      );

      if (!podName) {
        ws.send(
          JSON.stringify({
            type: "error",
            data: "Pod name is required",
          })
        );
        ws.close();
        return;
      }

      try {
        if (!k8sService.isInitialized()) {
          ws.send(
            JSON.stringify({
              type: "error",
              data: "Kubernetes client not initialized",
            })
          );
          ws.close();
          return;
        }

        const kc = k8sService.getKubeConfig();
        const namespace = k8sService.getNamespace();
        const cluster = kc.getCurrentCluster();
        const user = kc.getCurrentUser();

        if (!cluster) {
          throw new Error("No current cluster configured");
        }

        const server = cluster.server;
        const isConsole = mode === "console";
        const apiPath = `/api/v1/namespaces/${namespace}/pods/${podName}/exec`;

        const params = new URLSearchParams({
          stdout: "true",
          stderr: "true",
          stdin: "true",
          tty: "true",
        });

        const command = isConsole
          ? [
              "/bin/sh",
              "-c",
              'tail -n 0 -F /data/logs/latest.log & tail_pid=$!; trap "kill $tail_pid" EXIT; cat > /tmp/minikura-console',
            ]
          : [shell];
        for (const part of command) {
          params.append("command", part);
        }

        if (container) {
          params.append("container", container);
        }

        const wsUrl = `${server}${apiPath}?${params.toString()}`
          .replace("https://", "wss://")
          .replace("http://", "ws://");

        logger.debug(`Connecting to Kubernetes: ${wsUrl}`);

        const headers: Record<string, string> = {};

        if (user?.token) {
          headers.Authorization = `Bearer ${user.token}`;
        } else if (user?.username && user?.password) {
          const auth = Buffer.from(`${user.username}:${user.password}`).toString("base64");
          headers.Authorization = `Basic ${auth}`;
        }

        const tlsOptions: TlsOptions = {
          rejectUnauthorized: cluster.skipTLSVerify !== true,
        };

        if (user?.certData) {
          tlsOptions.cert = Buffer.from(user.certData, "base64").toString();
        }
        if (user?.keyData) {
          tlsOptions.key = Buffer.from(user.keyData, "base64").toString();
        }
        if (cluster.caData) {
          tlsOptions.ca = Buffer.from(cluster.caData, "base64").toString();
        }

        const k8sWs = new WebSocket(wsUrl, "v4.channel.k8s.io", {
          headers,
          ...tlsOptions,
        });
        ws.data.k8sWs = k8sWs;

        k8sWs.on("open", async () => {
          logger.debug(`Connected to Kubernetes ${isConsole ? "console" : "shell"}`);

          if (isConsole) {
            try {
              const coreApi = k8sService.getCoreApi();
              const logs = await coreApi.readNamespacedPodLog({
                name: podName,
                namespace: namespace,
                container: container,
              });

              if (logs) {
                const lines = logs.split("\n");
                for (const line of lines) {
                  ws.send(
                    JSON.stringify({
                      type: "output",
                      data: `${line}\r\n`,
                    })
                  );
                }
              }

              ws.send(
                JSON.stringify({
                  type: "ready",
                  data: "Minecraft console ready",
                })
              );
            } catch (logError) {
              logger.error({ err: logError }, "Failed to fetch historical logs");
              ws.send(
                JSON.stringify({
                  type: "ready",
                  data: "Minecraft console ready",
                })
              );
            }
          } else {
            ws.send(
              JSON.stringify({
                type: "ready",
                data: "Shell ready",
              })
            );
          }
        });

        k8sWs.on("message", (data: RawData) => {
          try {
            let buffer: Uint8Array;

            if (data instanceof Uint8Array) {
              buffer = data;
            } else if (data instanceof ArrayBuffer) {
              buffer = new Uint8Array(data);
            } else if (Buffer.isBuffer(data)) {
              buffer = new Uint8Array(data);
            } else if (Array.isArray(data)) {
              buffer = new Uint8Array(Buffer.concat(data));
            } else {
              logger.debug({ dataType: typeof data }, "Unknown data type");
              return;
            }

            processBuffer(buffer);
          } catch (err) {
            logger.error({ err }, "Error processing Kubernetes message");
          }
        });

        function processBuffer(buffer: Uint8Array): void {
          if (buffer.length === 0) {
            return;
          }

          const channel = buffer[0];
          const message = new TextDecoder().decode(buffer.slice(1));

          if (channel === 1 || channel === 2) {
            ws.send(JSON.stringify({ type: "output", data: message }));
          } else if (channel === 3) {
            try {
              const status = JSON.parse(message) as { status?: string; message?: string };
              if (status.status !== "Success") {
                ws.send(JSON.stringify({ type: "error", data: status.message || message }));
              }
            } catch {
              ws.send(JSON.stringify({ type: "error", data: message }));
            }
          }
        }

        k8sWs.on("error", (error: Error) => {
          logger.error({ err: error }, "Kubernetes WebSocket error");
          const message = getErrorMessage(error);
          ws.send(
            JSON.stringify({
              type: "error",
              data: `Connection error: ${message}`,
            })
          );
        });

        k8sWs.on("close", (code: number, reason: Buffer) => {
          const closeReason = reason.toString();
          logger.debug(`Kubernetes WebSocket closed: ${code} ${closeReason}`);
          ws.send(
            JSON.stringify({
              type: "close",
              data: closeReason || `Connection closed (${code})`,
            })
          );
          ws.close();
        });
      } catch (error: unknown) {
        logger.error({ err: error }, "Error setting up terminal");
        if (error instanceof Error) {
          logger.error({ stack: error.stack }, "Error stack");
        }
        ws.send(
          JSON.stringify({
            type: "error",
            data: `Failed to connect: ${getErrorMessage(error)}`,
          })
        );
        ws.close();
      }
    },

    message: async (ws: TerminalWs, message: unknown) => {
      try {
        const data = parseTerminalMessage(message);
        if (!data) {
          return;
        }

        const k8sWs = ws.data.k8sWs;

        if (!k8sWs || k8sWs.readyState !== WebSocket.OPEN) {
          logger.error({ readyState: k8sWs?.readyState }, "Kubernetes WebSocket not ready");
          return;
        }

        if (data.type === "input") {
          logger.debug({ input: data.data }, "Sending input to k8s");
          const encoder = new TextEncoder();
          const textData = encoder.encode(data.data);
          const buffer = new Uint8Array(1 + textData.length);
          buffer[0] = 0;
          buffer.set(textData, 1);
          k8sWs.send(buffer.buffer);
        } else if (data.type === "resize") {
          const resizeMsg = JSON.stringify({
            Width: data.cols,
            Height: data.rows,
          });
          const encoder = new TextEncoder();
          const textData = encoder.encode(resizeMsg);
          const buffer = new Uint8Array(1 + textData.length);
          buffer[0] = 4;
          buffer.set(textData, 1);
          k8sWs.send(buffer.buffer);
        }
      } catch (error: unknown) {
        logger.error({ err: error }, "Error handling terminal message");
        ws.send(
          JSON.stringify({
            type: "error",
            data: `Error: ${getErrorMessage(error)}`,
          })
        );
      }
    },

    close: (ws: TerminalWs) => {
      logger.debug("Client WebSocket closed");
      const k8sWs = ws.data.k8sWs;
      if (k8sWs && k8sWs.readyState === WebSocket.OPEN) {
        k8sWs.close();
      }
    },
  });

function parseTerminalMessage(message: unknown): TerminalMessage | null {
  if (typeof message === "string") {
    try {
      const parsed = JSON.parse(message) as unknown;
      return isTerminalMessage(parsed) ? parsed : null;
    } catch {
      logger.error({ message }, "Failed to parse message as JSON");
      return null;
    }
  }
  return null;
}

function isTerminalMessage(value: unknown): value is TerminalMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (!("type" in value)) {
    return false;
  }
  const type = (value as { type?: unknown }).type;
  if (type === "input") {
    return typeof (value as { data?: unknown }).data === "string";
  }
  if (type === "resize") {
    const cols = (value as { cols?: unknown }).cols;
    const rows = (value as { rows?: unknown }).rows;
    return typeof cols === "number" && typeof rows === "number";
  }
  return false;
}
