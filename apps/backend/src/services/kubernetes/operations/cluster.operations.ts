import type * as k8s from "@kubernetes/client-node";
import { BaseK8sOperations } from "./base.operations";

export class ClusterOperations extends BaseK8sOperations {
  constructor(
    private customObjectsApi: k8s.CustomObjectsApi,
    namespace: string
  ) {
    super(namespace);
  }

  async getNodeMetrics() {
    return this.executeOperation(
      () =>
        this.customObjectsApi.listClusterCustomObject({
          group: "metrics.k8s.io",
          version: "v1beta1",
          plural: "nodes",
        }),
      "Failed to fetch node metrics"
    );
  }
}
