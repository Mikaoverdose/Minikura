export const RESOURCE_DEFAULTS = {
  server: {
    memory: "1G",
    javaMemoryFactor: 0.8,
  },
  proxy: {
    memory: "512M",
    javaMemoryFactor: 0.8,
  },
} as const;

export const JAVA_MEMORY_FACTOR = 0.8;

export const DEFAULT_SERVER_MEMORY = "1G";
export const DEFAULT_PROXY_MEMORY = "512M";
