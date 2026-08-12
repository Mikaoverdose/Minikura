import type * as k8s from "@kubernetes/client-node";
import type { CustomResourceSummary } from "@minikura/api";
import { getAge } from "@minikura/shared/errors";
import { BaseK8sOperations } from "./base.operations";

interface CustomResourceItem {
  kind?: string;
  metadata?: {
    name?: string;
    namespace?: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec?: Record<string, unknown>;
  status?: { phase?: string; [key: string]: unknown };
}

interface CustomResourceList {
  items?: CustomResourceItem[];
}

export class CustomResourceOperations extends BaseK8sOperations {
  constructor(
    private customObjectsApi: k8s.CustomObjectsApi,
    namespace: string
  ) {
    super(namespace);
  }

  async listCustomResources(
    group: string,
    version: string,
    plural: string
  ): Promise<CustomResourceSummary[]> {
    return this.executeOperation(async () => {
      const response = await this.customObjectsApi.listNamespacedCustomObject({
        group,
        version,
        namespace: this.namespace,
        plural,
      });

      const items = (response as unknown as CustomResourceList).items || [];

      return items.map((item) => ({
        name: item.metadata?.name ?? "",
        namespace: item.metadata?.namespace ?? this.namespace,
        age: getAge(item.metadata?.creationTimestamp),
        labels: item.metadata?.labels,
        annotations: item.metadata?.annotations,
        spec: item.spec ?? {},
        status: item.status ?? {},
      }));
    }, `Failed to fetch custom resources (${plural})`);
  }
}
