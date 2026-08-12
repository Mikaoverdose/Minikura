import pino from "pino";

export function createLogger(component: string): pino.Logger;
export function createLogger(context: Record<string, string | number>): pino.Logger;
export function createLogger(
  componentOrContext: string | Record<string, string | number>
): pino.Logger {
  const isString = typeof componentOrContext === "string";
  const baseContext = isString ? { component: componentOrContext } : componentOrContext;

  return pino({
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV !== "production"
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss.l",
              ignore: "pid,hostname",
              singleLine: false,
            },
          }
        : undefined,
    base: baseContext,
  });
}

export const logger = createLogger("shared");
