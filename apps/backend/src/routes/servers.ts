import { Elysia } from "elysia";
import { serverService, wsService } from "../application/di-container";
import { bearerToken, findApiKeyOwner } from "../middleware/api-key";
import { assertAdmin, requireAuth } from "../middleware/auth-guards";
import {
  createServerSchema,
  envVariableSchema,
  updateServerSchema,
} from "../schemas/server.schema";
import type { WebSocketClient } from "../services/websocket";

export const serverRoutes = new Elysia({ prefix: "/servers" })
  .ws("/ws", {
    async open(
      ws: WebSocketClient & {
        data?: { headers?: Record<string, string | undefined> };
        close: () => void;
      }
    ) {
      const owner = await findApiKeyOwner(bearerToken(ws.data?.headers?.authorization ?? null));
      if (owner?.kind !== "reverse-proxy") {
        ws.close();
        return;
      }
      wsService.addClient(ws);
    },
    close(ws: WebSocketClient) {
      wsService.removeClient(ws);
    },
    message() {},
  })
  .use(requireAuth)
  .get("/", async ({ user }) => {
    return await serverService.getAllServers(user.role !== "admin");
  })

  .get("/:id", async ({ params, user }) => {
    return await serverService.getServerById(params.id, user.role !== "admin");
  })

  .get("/:id/connection-info", async ({ params }) => {
    return await serverService.getConnectionInfo(params.id);
  })

  .post("/", async ({ body, user }) => {
    assertAdmin(user);
    const payload = createServerSchema.parse(body);
    const server = await serverService.createServer(payload);
    return server;
  })

  .patch("/:id", async ({ params, body, user }) => {
    assertAdmin(user);
    const payload = updateServerSchema.parse(body);
    const server = await serverService.updateServer(params.id, payload);
    return server;
  })

  .delete("/:id", async ({ params, user }) => {
    assertAdmin(user);
    await serverService.deleteServer(params.id);
    return { success: true };
  })

  .get("/:id/env", async ({ params, user }) => {
    assertAdmin(user);
    const envVariables = await serverService.getEnvVariables(params.id);
    return { env_variables: envVariables };
  })

  .post("/:id/env", async ({ params, body, user }) => {
    assertAdmin(user);
    const payload = envVariableSchema.parse(body);
    await serverService.setEnvVariable(params.id, payload.key, payload.value);
    return { success: true };
  })

  .delete("/:id/env/:key", async ({ params, user }) => {
    assertAdmin(user);
    await serverService.deleteEnvVariable(params.id, params.key);
    return { success: true };
  });
