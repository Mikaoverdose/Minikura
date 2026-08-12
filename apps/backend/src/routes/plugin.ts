import { Elysia } from "elysia";
import { reverseProxyService, serverService } from "../application/di-container";
import { requirePluginApiKey } from "../middleware/auth-guards";

export const pluginRoutes = new Elysia({ prefix: "/plugin" })
  .use(requirePluginApiKey)
  .get("/servers", async () => serverService.getAllServers(true))
  .get("/reverse-proxy", async () => reverseProxyService.getAllReverseProxies(true));
