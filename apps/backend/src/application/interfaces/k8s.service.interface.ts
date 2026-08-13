import type * as k8s from "@kubernetes/client-node";
import type { CustomResourceSummary } from "@minikura/api";

export interface IK8sService {
  isInitialized(): boolean;
  getConnectionInfo(): {
    initialized: boolean;
    currentContext?: string;
    cluster?: string;
    namespace: string;
  };

  getPods(): Promise<any[]>;
  getPodsByLabel(labelSelector: string): Promise<any[]>;
  getPodInfo(podName: string): Promise<any>;
  restartPod(podName: string): Promise<void>;
  getPodLogs(
    podName: string,
    options?: {
      container?: string;
      tailLines?: number;
      timestamps?: boolean;
      sinceSeconds?: number;
    }
  ): Promise<string>;
  getPodMetrics(namespace?: string): Promise<any>;

  getDeployments(): Promise<any[]>;
  getStatefulSets(): Promise<any[]>;

  getServices(): Promise<any[]>;
  getIngresses(): Promise<any[]>;
  getServiceInfo(serviceName: string): Promise<any>;
  getServerConnectionInfo(serviceName: string): Promise<any>;

  getConfigMaps(): Promise<any[]>;

  getCustomResources(
    group: string,
    version: string,
    plural: string
  ): Promise<CustomResourceSummary[]>;
  getMinecraftServers(): Promise<CustomResourceSummary[]>;
  getReverseProxyServers(): Promise<CustomResourceSummary[]>;

  getNodes(): Promise<any[]>;
  getNodeMetrics(): Promise<any>;

  getKubeConfig(): k8s.KubeConfig;
  getCoreApi(): k8s.CoreV1Api;
  getNamespace(): string;
}
