import * as k8s from "@kubernetes/client-node";
import type { CustomResourceSummary } from "@minikura/api";
import { API_GROUP } from "@minikura/api";
import { buildKubeConfig } from "@minikura/shared/kube-auth";
import type { IK8sService } from "../application/interfaces/k8s.service.interface";
import { logger } from "../infrastructure/logger";
import { ClusterOperations } from "./kubernetes/operations/cluster.operations";
import { CustomResourceOperations } from "./kubernetes/operations/custom-resource.operations";
import { PodOperations } from "./kubernetes/operations/pod.operations";
import { K8sResources } from "./kubernetes/resources";

const CUSTOM_RESOURCE_VERSION = "v1alpha1";

export class K8sService implements IK8sService {
  private kc!: k8s.KubeConfig;
  private coreApi!: k8s.CoreV1Api;
  private appsApi!: k8s.AppsV1Api;
  private customObjectsApi!: k8s.CustomObjectsApi;
  private networkingApi!: k8s.NetworkingV1Api;
  private namespace: string;
  private initialized: boolean = false;
  private resources!: K8sResources;

  private podOps!: PodOperations;
  private clusterOps!: ClusterOperations;
  private customResourceOps!: CustomResourceOperations;

  constructor() {
    this.namespace = process.env.KUBERNETES_NAMESPACE || "minikura";

    try {
      this.kc = buildKubeConfig();
      this.initializeClients();
      this.initializeOperations();
      this.resources = new K8sResources(
        this.coreApi,
        this.appsApi,
        this.networkingApi,
        this.namespace
      );
      this.initialized = true;
    } catch (error) {
      logger.error({ err: error }, "Failed to initialize Kubernetes client");
      this.initialized = false;
    }
  }

  private initializeClients(): void {
    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.customObjectsApi = this.kc.makeApiClient(k8s.CustomObjectsApi);
    this.networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
  }

  private initializeOperations(): void {
    this.podOps = new PodOperations(this.coreApi, this.namespace);
    this.clusterOps = new ClusterOperations(this.customObjectsApi, this.namespace);
    this.customResourceOps = new CustomResourceOperations(this.customObjectsApi, this.namespace);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getConnectionInfo(): {
    initialized: boolean;
    currentContext?: string;
    cluster?: string;
    namespace: string;
  } {
    if (!this.initialized) {
      return { initialized: false, namespace: this.namespace };
    }

    try {
      const currentContext = this.kc.getCurrentContext();
      const cluster = this.kc.getCurrentCluster()?.name;
      return {
        initialized: true,
        currentContext,
        cluster,
        namespace: this.namespace,
      };
    } catch (_error) {
      return { initialized: false, namespace: this.namespace };
    }
  }

  async getPods() {
    this.ensureInitialized();
    return this.resources.listPods();
  }

  async getDeployments() {
    this.ensureInitialized();
    return this.resources.listDeployments();
  }

  async getStatefulSets() {
    this.ensureInitialized();
    return this.resources.listStatefulSets();
  }

  async getServices() {
    this.ensureInitialized();
    return this.resources.listServices();
  }

  async getConfigMaps() {
    this.ensureInitialized();
    return this.resources.listConfigMaps();
  }

  async getIngresses() {
    this.ensureInitialized();
    return this.resources.listIngresses();
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("Kubernetes client not initialized");
    }
  }

  async getCustomResources(
    group: string,
    version: string,
    plural: string
  ): Promise<CustomResourceSummary[]> {
    this.ensureInitialized();
    return this.customResourceOps.listCustomResources(group, version, plural);
  }

  async getMinecraftServers() {
    return this.getCustomResources(API_GROUP, CUSTOM_RESOURCE_VERSION, "minecraftservers");
  }

  async getReverseProxyServers() {
    return this.getCustomResources(API_GROUP, CUSTOM_RESOURCE_VERSION, "reverseproxyservers");
  }

  async getPodLogs(
    podName: string,
    options?: {
      container?: string;
      tailLines?: number;
      timestamps?: boolean;
      sinceSeconds?: number;
    }
  ) {
    this.ensureInitialized();
    return this.podOps.getPodLogs(podName, options);
  }

  async getPodsByLabel(labelSelector: string) {
    this.ensureInitialized();
    return this.resources.listPodsByLabel(labelSelector);
  }

  async getPodInfo(podName: string) {
    this.ensureInitialized();
    return this.resources.getPodInfo(podName);
  }

  async restartPod(podName: string): Promise<void> {
    this.ensureInitialized();
    await this.coreApi.deleteNamespacedPod({
      name: podName,
      namespace: this.namespace,
      propagationPolicy: "Foreground",
    });
  }

  async getServiceInfo(serviceName: string) {
    this.ensureInitialized();
    return this.resources.getServiceInfo(serviceName);
  }

  async getNodes() {
    this.ensureInitialized();
    return this.resources.listNodes();
  }

  async getServerConnectionInfo(serviceName: string) {
    this.ensureInitialized();
    const service = await this.getServiceInfo(serviceName);
    const nodes = await this.getNodes();

    if (service.type === "ClusterIP") {
      return {
        type: "ClusterIP",
        ip: service.clusterIP,
        port: service.ports[0]?.port || null,
        connectionString:
          service.clusterIP && service.ports[0]?.port
            ? `${service.clusterIP}:${service.ports[0].port}`
            : null,
        note: "Only accessible within the cluster",
      };
    }

    if (service.type === "NodePort") {
      const nodeIP = nodes[0]?.externalIP || nodes[0]?.internalIP;
      const nodePort = service.ports[0]?.nodePort;
      return {
        type: "NodePort",
        nodeIP,
        nodePort,
        port: service.ports[0]?.port || null,
        connectionString: nodeIP && nodePort ? `${nodeIP}:${nodePort}` : null,
        note:
          nodeIP && !nodes[0]?.externalIP
            ? "Using internal IP (may not be accessible from outside the cluster network)"
            : "Accessible from any node in the cluster",
      };
    }

    if (service.type === "LoadBalancer") {
      const externalIP = service.loadBalancerIP || service.loadBalancerHostname;
      return {
        type: "LoadBalancer",
        externalIP,
        port: service.ports[0]?.port || null,
        connectionString:
          externalIP && service.ports[0]?.port ? `${externalIP}:${service.ports[0].port}` : null,
        note: !externalIP ? "LoadBalancer IP pending" : null,
      };
    }

    return {
      type: service.type,
      note: "Unknown service type",
    };
  }

  getKubeConfig(): k8s.KubeConfig {
    return this.kc;
  }

  getCoreApi(): k8s.CoreV1Api {
    return this.coreApi;
  }

  getNamespace(): string {
    return this.namespace;
  }

  async getPodMetrics(namespace?: string) {
    this.ensureInitialized();
    return this.executeOperationSafe(
      () => this.podOps.getPodMetrics(this.customObjectsApi, namespace),
      { items: [] },
      "Error fetching pod metrics"
    );
  }

  async getNodeMetrics() {
    this.ensureInitialized();
    return this.executeOperationSafe(
      () => this.clusterOps.getNodeMetrics(),
      { items: [] },
      "Error fetching node metrics"
    );
  }

  private async executeOperationSafe<T>(
    operation: () => Promise<T>,
    defaultValue: T,
    errorContext: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      logger.error({ err: error, context: errorContext }, "K8s operation failed");
      return defaultValue;
    }
  }
}
