import { dotenvLoad } from "dotenv-mono";

const _dotenv = dotenvLoad();

export { API_GROUP, LABEL_PREFIX } from "@minikura/api";
export const API_VERSION = "v1alpha1";

export const KUBERNETES_NAMESPACE_ENV = process.env.KUBERNETES_NAMESPACE;
export const NAMESPACE = process.env.KUBERNETES_NAMESPACE || "minikura";

export const ENABLE_CRD_REFLECTION = process.env.ENABLE_CRD_REFLECTION === "true";

export const RESOURCE_TYPES = {
  MINECRAFT_SERVER: {
    kind: "MinecraftServer",
    plural: "minecraftservers",
    singular: "minecraftserver",
    shortNames: ["mcs"],
  },
  REVERSE_PROXY_SERVER: {
    kind: "ReverseProxyServer",
    plural: "reverseproxyservers",
    singular: "reverseproxyserver",
    shortNames: ["rps"],
  },
};

export const SYNC_INTERVAL = 30 * 1000;

export const IMAGES = {
  MINECRAFT: "itzg/minecraft-server",
  REVERSE_PROXY: "itzg/minecraft-server",
};

export const DEFAULTS = {
  MEMORY: "1G",
  CPU_REQUEST: "250m",
  CPU_LIMIT: "1000m",
  STORAGE_SIZE: "1Gi",
};
