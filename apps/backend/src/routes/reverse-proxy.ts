import { Elysia } from "elysia";
import { reverseProxyService } from "../application/di-container";
import { assertAdmin, requireAuth } from "../middleware/auth-guards";
import {
  createReverseProxySchema,
  envVariableSchema,
  updateReverseProxySchema,
} from "../schemas/server.schema";

export const reverseProxyRoutes = new Elysia({ prefix: "/reverse-proxy" })
  .use(requireAuth)
  .get("/", async ({ user }) => {
    return await reverseProxyService.getAllReverseProxies(user.role !== "admin");
  })

  .get("/:id", async ({ params, user }) => {
    return await reverseProxyService.getReverseProxyById(params.id, user.role !== "admin");
  })

  .get("/:id/connection-info", async ({ params }) => {
    return await reverseProxyService.getConnectionInfo(params.id);
  })

  .post("/", async ({ body, user }) => {
    assertAdmin(user);
    const payload = createReverseProxySchema.parse(body);
    const proxy = await reverseProxyService.createReverseProxy(payload);
    return proxy;
  })

  .patch("/:id", async ({ params, body, user }) => {
    assertAdmin(user);
    const payload = updateReverseProxySchema.parse(body);
    const proxy = await reverseProxyService.updateReverseProxy(params.id, payload);
    return proxy;
  })

  .delete("/:id", async ({ params, user }) => {
    assertAdmin(user);
    await reverseProxyService.deleteReverseProxy(params.id);
    return { success: true };
  })

  .get("/:id/env", async ({ params, user }) => {
    assertAdmin(user);
    const envVariables = await reverseProxyService.getEnvVariables(params.id);
    return { env_variables: envVariables };
  })

  .post("/:id/env", async ({ params, body, user }) => {
    assertAdmin(user);
    const payload = envVariableSchema.parse(body);
    await reverseProxyService.setEnvVariable(params.id, payload.key, payload.value);
    return { success: true };
  })

  .delete("/:id/env/:key", async ({ params, user }) => {
    assertAdmin(user);
    await reverseProxyService.deleteEnvVariable(params.id, params.key);
    return { success: true };
  });
