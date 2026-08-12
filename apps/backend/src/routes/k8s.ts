import { labelKeys } from "@minikura/api";
import { Elysia } from "elysia";
import { k8sService } from "../application/di-container";
import { requireAuth } from "../middleware/auth-guards";

export const k8sRoutes = new Elysia({ prefix: "/k8s" })
  .use(requireAuth)
  .get("/status", async () => {
    return k8sService.getConnectionInfo();
  })
  .get("/pods", async () => {
    return await k8sService.getPods();
  })
  .get("/deployments", async () => {
    return await k8sService.getDeployments();
  })
  .get("/statefulsets", async () => {
    return await k8sService.getStatefulSets();
  })
  .get("/services", async () => {
    return await k8sService.getServices();
  })
  .get("/configmaps", async () => {
    return await k8sService.getConfigMaps();
  })
  .get("/ingresses", async () => {
    return await k8sService.getIngresses();
  })
  .get("/minecraft-servers", async () => {
    return await k8sService.getMinecraftServers();
  })
  .get("/reverse-proxy-servers", async () => {
    return await k8sService.getReverseProxyServers();
  })
  .get("/pods/:podName", async ({ params }) => {
    return await k8sService.getPodInfo(params.podName);
  })
  .get("/pods/:podName/logs", async ({ params, query, set }) => {
    const options = {
      container: query.container as string | undefined,
      tailLines: query.tailLines ? parseInt(query.tailLines as string, 10) : 1000,
      timestamps: query.timestamps === "true",
      sinceSeconds: query.sinceSeconds ? parseInt(query.sinceSeconds as string, 10) : undefined,
    };
    const logs = await k8sService.getPodLogs(params.podName, options);

    const headers = (set.headers ?? {}) as Record<string, string>;
    headers["content-type"] = "text/plain";
    set.headers = headers;
    return logs;
  })
  .get("/servers/:serverId/pods", async ({ params }) => {
    const labelSelector = `${labelKeys.serverId}=${params.serverId}`;
    return await k8sService.getPodsByLabel(labelSelector);
  })
  .get("/reverse-proxy/:serverId/pods", async ({ params }) => {
    const labelSelector = `${labelKeys.proxyId}=${params.serverId}`;
    return await k8sService.getPodsByLabel(labelSelector);
  })
  .get("/services/:serviceName", async ({ params }) => {
    return await k8sService.getServiceInfo(params.serviceName);
  })
  .get("/services/:serviceName/connection-info", async ({ params }) => {
    return await k8sService.getServerConnectionInfo(params.serviceName);
  })
  .get("/nodes", async () => {
    return await k8sService.getNodes();
  })
  .group("/metrics", (app) =>
    app
      .get("/pods", async () => {
        return await k8sService.getPodMetrics();
      })
      .get("/nodes", async () => {
        return await k8sService.getNodeMetrics();
      })
  );
