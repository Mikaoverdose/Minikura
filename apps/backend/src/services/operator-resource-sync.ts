import * as k8s from "@kubernetes/client-node";
import { prisma, type ReverseProxyWithEnvVars, type ServerWithEnvVars } from "@minikura/db";
import { buildKubeConfig } from "@minikura/shared/kube-auth";
import { logger } from "../infrastructure/logger";

const API_GROUP = "minikura.kirameki.cafe";
const API_VERSION = "v1alpha1";
const FIELD_MANAGER = "minikura-backend";
const SYNC_INTERVAL_MS = 30_000;

type CustomResource = {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    labels: Record<string, string>;
    resourceVersion?: string;
  };
  spec: Record<string, unknown>;
};

export function operatorResourceName(id: string): string {
  const normalized = id
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .slice(0, 63);
  if (!normalized) throw new Error(`Cannot derive a Kubernetes resource name from ${id}`);
  return normalized;
}

function serviceType(type: string): "ClusterIP" | "NodePort" | "LoadBalancer" {
  if (type === "NODE_PORT") return "NodePort";
  if (type === "LOAD_BALANCER") return "LoadBalancer";
  return "ClusterIP";
}

function labels(id: string): Record<string, string> {
  return {
    "app.kubernetes.io/managed-by": FIELD_MANAGER,
    "minikura.kirameki.cafe/database-id": id.slice(0, 63),
  };
}

export class OperatorResourceSync {
  private readonly namespace = process.env.KUBERNETES_NAMESPACE || "minikura";
  private coreApi?: k8s.CoreV1Api;
  private customObjectsApi?: k8s.CustomObjectsApi;
  private syncing = false;

  constructor() {
    try {
      const kubeConfig = buildKubeConfig();
      this.coreApi = kubeConfig.makeApiClient(k8s.CoreV1Api);
      this.customObjectsApi = kubeConfig.makeApiClient(k8s.CustomObjectsApi);
    } catch (error) {
      logger.warn({ err: error }, "Operator resource synchronization is unavailable");
    }
  }

  start(): void {
    void this.syncAll();
    const timer = setInterval(() => void this.syncAll(), SYNC_INTERVAL_MS);
    timer.unref();
  }

  async syncAll(): Promise<void> {
    if (this.syncing || !this.coreApi || !this.customObjectsApi) return;
    this.syncing = true;
    try {
      const [servers, proxies] = await Promise.all([
        prisma.server.findMany({ include: { env_variables: true } }),
        prisma.reverseProxyServer.findMany({ include: { env_variables: true } }),
      ]);
      await Promise.all([
        ...servers.map((server) => this.syncServer(server)),
        ...proxies.map((proxy) => this.syncReverseProxy(proxy)),
      ]);
      await Promise.all([
        this.deleteStaleResources(
          "minecraftservers",
          servers.map((server) => operatorResourceName(server.id))
        ),
        this.deleteStaleResources(
          "reverseproxyservers",
          proxies.map((proxy) => operatorResourceName(proxy.id))
        ),
      ]);
    } catch (error) {
      logger.error({ err: error }, "Failed to synchronize operator resources");
    } finally {
      this.syncing = false;
    }
  }

  async syncServerById(id: string): Promise<void> {
    if (!this.coreApi || !this.customObjectsApi) return;
    const server = await prisma.server.findUnique({
      where: { id },
      include: { env_variables: true },
    });
    if (server) await this.syncServer(server);
  }

  async syncReverseProxyById(id: string): Promise<void> {
    if (!this.coreApi || !this.customObjectsApi) return;
    const proxy = await prisma.reverseProxyServer.findUnique({
      where: { id },
      include: { env_variables: true },
    });
    if (proxy) await this.syncReverseProxy(proxy);
  }

  async deleteServer(id: string): Promise<void> {
    if (!this.customObjectsApi) return;
    await this.deleteResource("minecraftservers", operatorResourceName(id));
  }

  async deleteReverseProxy(id: string): Promise<void> {
    if (!this.customObjectsApi) return;
    await this.deleteResource("reverseproxyservers", operatorResourceName(id));
  }

  private async syncServer(server: ServerWithEnvVars): Promise<void> {
    const name = operatorResourceName(server.id);
    const secretName = `${name}-api-key`;
    await this.upsertSecret(secretName, server.api_key, labels(server.id));
    await this.upsertResource("minecraftservers", {
      apiVersion: `${API_GROUP}/${API_VERSION}`,
      kind: "MinecraftServer",
      metadata: { name, namespace: this.namespace, labels: labels(server.id) },
      spec: {
        type: server.type,
        description: server.description ?? undefined,
        listenPort: server.listen_port,
        serviceType: serviceType(server.service_type),
        nodePort: server.node_port ?? undefined,
        jarType: server.jar_type,
        minecraftVersion: server.minecraft_version,
        resources: {
          memoryLimitMB: server.memory,
          memoryRequestMB: server.memory_request,
          cpuRequest: server.cpu_request ?? undefined,
          cpuLimit: server.cpu_limit ?? undefined,
        },
        jvm: {
          opts: server.jvm_opts ?? undefined,
          useAikarFlags: server.use_aikar_flags,
          useMeowIceFlags: server.use_meowice_flags,
          heapPercent: 80,
        },
        properties: {
          difficulty: server.difficulty,
          gameMode: server.game_mode,
          maxPlayers: server.max_players,
          pvp: server.pvp,
          onlineMode: server.online_mode,
          motd: server.motd ?? undefined,
          levelSeed: server.level_seed ?? undefined,
          levelType: server.level_type ?? undefined,
        },
        env: server.env_variables.map((entry) => ({ name: entry.key, value: entry.value })),
        apiKeySecretRef: secretName,
      },
    });
  }

  private async syncReverseProxy(proxy: ReverseProxyWithEnvVars): Promise<void> {
    const name = operatorResourceName(proxy.id);
    const secretName = `${name}-api-key`;
    await this.upsertSecret(secretName, proxy.api_key, labels(proxy.id));
    await this.upsertResource("reverseproxyservers", {
      apiVersion: `${API_GROUP}/${API_VERSION}`,
      kind: "ReverseProxyServer",
      metadata: { name, namespace: this.namespace, labels: labels(proxy.id) },
      spec: {
        type: proxy.type,
        description: proxy.description ?? undefined,
        externalAddress: proxy.external_address,
        externalPort: proxy.external_port,
        listenPort: proxy.listen_port,
        serviceType: serviceType(proxy.service_type),
        nodePort: proxy.node_port ?? undefined,
        resources: {
          memoryLimitMB: proxy.memory,
          memoryRequestMB: proxy.memory,
          cpuRequest: proxy.cpu_request ?? undefined,
          cpuLimit: proxy.cpu_limit ?? undefined,
        },
        jvm: { heapPercent: 80 },
        env: proxy.env_variables.map((entry) => ({ name: entry.key, value: entry.value })),
        apiKeySecretRef: secretName,
      },
    });
  }

  private async upsertResource(plural: string, resource: CustomResource): Promise<void> {
    if (!this.customObjectsApi) return;
    try {
      const existing = (await this.customObjectsApi.getNamespacedCustomObject({
        group: API_GROUP,
        version: API_VERSION,
        namespace: this.namespace,
        plural,
        name: resource.metadata.name,
      })) as { metadata?: { resourceVersion?: string } };
      resource.metadata.resourceVersion = existing.metadata?.resourceVersion;
      await this.customObjectsApi.replaceNamespacedCustomObject({
        group: API_GROUP,
        version: API_VERSION,
        namespace: this.namespace,
        plural,
        name: resource.metadata.name,
        body: resource,
        fieldManager: FIELD_MANAGER,
      });
    } catch (error) {
      if (!this.isNotFound(error)) throw error;
      await this.customObjectsApi.createNamespacedCustomObject({
        group: API_GROUP,
        version: API_VERSION,
        namespace: this.namespace,
        plural,
        body: resource,
        fieldManager: FIELD_MANAGER,
      });
    }
  }

  private async upsertSecret(
    name: string,
    apiKey: string,
    resourceLabels: Record<string, string>
  ): Promise<void> {
    if (!this.coreApi) return;
    const secret: k8s.V1Secret = {
      metadata: { name, namespace: this.namespace, labels: resourceLabels },
      stringData: { "api-key": apiKey },
      type: "Opaque",
    };
    try {
      const existing = await this.coreApi.readNamespacedSecret({ name, namespace: this.namespace });
      secret.metadata = {
        ...secret.metadata,
        resourceVersion: existing.metadata?.resourceVersion,
      };
      await this.coreApi.replaceNamespacedSecret({
        name,
        namespace: this.namespace,
        body: secret,
        fieldManager: FIELD_MANAGER,
      });
    } catch (error) {
      if (!this.isNotFound(error)) throw error;
      await this.coreApi.createNamespacedSecret({
        namespace: this.namespace,
        body: secret,
        fieldManager: FIELD_MANAGER,
      });
    }
  }

  private async deleteStaleResources(plural: string, expectedNames: string[]): Promise<void> {
    if (!this.customObjectsApi) return;
    const response = (await this.customObjectsApi.listNamespacedCustomObject({
      group: API_GROUP,
      version: API_VERSION,
      namespace: this.namespace,
      plural,
      labelSelector: `app.kubernetes.io/managed-by=${FIELD_MANAGER}`,
    })) as { items?: Array<{ metadata?: { name?: string } }> };
    const expected = new Set(expectedNames);
    await Promise.all(
      (response.items ?? [])
        .map((item) => item.metadata?.name)
        .filter((name): name is string => !!name && !expected.has(name))
        .map((name) => this.deleteResource(plural, name))
    );
  }

  private async deleteResource(plural: string, name: string): Promise<void> {
    if (!this.customObjectsApi) return;
    try {
      await this.customObjectsApi.deleteNamespacedCustomObject({
        group: API_GROUP,
        version: API_VERSION,
        namespace: this.namespace,
        plural,
        name,
        propagationPolicy: "Foreground",
      });
    } catch (error) {
      if (!this.isNotFound(error)) throw error;
    }
    await this.deleteSecret(`${name}-api-key`);
  }

  private async deleteSecret(name: string): Promise<void> {
    if (!this.coreApi) return;
    try {
      await this.coreApi.deleteNamespacedSecret({ name, namespace: this.namespace });
    } catch (error) {
      if (!this.isNotFound(error)) throw error;
    }
  }

  private isNotFound(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      (("code" in error && error.code === 404) ||
        ("response" in error &&
          typeof error.response === "object" &&
          error.response !== null &&
          "statusCode" in error.response &&
          error.response.statusCode === 404))
    );
  }
}
