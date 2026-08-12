export const API_KEY_PREFIXES = {
  SERVER: "minikura_server_api_key_",
  REVERSE_PROXY: "minikura_reverse_proxy_server_api_key_",
} as const;

export const DEFAULT_PORTS = {
  MINECRAFT: 25565,
} as const;

export const DEFAULT_MEMORY = {
  SERVER: 2048,
  REVERSE_PROXY: 512,
} as const;

export const DEFAULT_MEMORY_REQUEST = {
  SERVER: 1024,
  REVERSE_PROXY: 512,
} as const;

export const DEFAULT_CPU = {
  SERVER: {
    REQUEST: "500m",
    LIMIT: "2",
  },
  REVERSE_PROXY: {
    REQUEST: "250m",
    LIMIT: "500m",
  },
} as const;

export const VALIDATION = {
  ID_PATTERN: /^[a-zA-Z0-9-_]+$/,
  ID_ERROR_MESSAGE: "ID must be alphanumeric with - or _",
  PORT_MIN: 1,
  PORT_MAX: 65535,
} as const;
