import { Elysia } from "elysia";
import { reverseProxyService, serverService } from "../application/di-container";
import { requirePluginKind } from "../middleware/auth-guards";
import { operatorResourceName } from "../services/operator-resource-sync";

export const pluginRoutes = new Elysia({ prefix: "/plugin" })
  .use(requirePluginKind("reverse-proxy"))
  .get("/servers", async () => {
    const namespace = process.env.KUBERNETES_NAMESPACE || "minikura";
    return (await serverService.getAllServers(true)).map((server) => ({
      ...server,
      connection_address: `minecraft-${operatorResourceName(server.id)}.${namespace}.svc.cluster.local`,
    }));
  })
  .get("/reverse-proxy", async ({ pluginAuth }) => [
    await reverseProxyService.getReverseProxyById(pluginAuth.id, true),
  ]);
