import { Elysia, t } from "elysia";
import { pluginRegistryService, operatorResourceSync } from "../application/di-container";
import { assertAdmin, requireAuth } from "../middleware/auth-guards";

const providerSchema = t.Union([t.Literal("MODRINTH"), t.Literal("HANGAR")]);
const platformSchema = t.Union([t.Literal("PAPER"), t.Literal("FOLIA"), t.Literal("VELOCITY")]);
const versionSchema = t.Object({
  provider: providerSchema,
  projectId: t.String({ minLength: 1 }),
  projectName: t.Optional(t.String({ minLength: 1 })),
  versionId: t.String({ minLength: 1 }),
  version: t.String({ minLength: 1 }),
  platform: platformSchema,
  minecraftVersions: t.Array(t.String()),
  filename: t.String({ minLength: 1 }),
  size: t.Integer({ minimum: 1 }),
  sha256: t.Nullable(t.String({ minLength: 64, maxLength: 64 })),
  downloadUrl: t.String({ format: "uri" }),
  license: t.Nullable(t.String()),
  description: t.Optional(t.String()),
  author: t.Optional(t.String()),
  iconUrl: t.Optional(t.Nullable(t.String())),
  projectUrl: t.Optional(t.String({ format: "uri" })),
  categories: t.Optional(t.Array(t.String())),
  updatedAt: t.Optional(t.Nullable(t.String())),
});

export const registryDownloadRoutes = new Elysia({ prefix: "/registry/artifacts" }).get(
  "/:token/download",
  async ({ params }) => {
    const download = await pluginRegistryService.download(params.token);
    if (download.response) return download.response;
    if (download.redirect) return Response.redirect(download.redirect, 302);
    throw new Error("Plugin artifact download is unavailable");
  }
);

export const registryRoutes = new Elysia({ prefix: "/registry" })
  .use(requireAuth)
  .get(
    "/search",
    async ({ query, user }) => {
      assertAdmin(user);
      return pluginRegistryService.search(
        query.query ?? "",
        query.platform,
        query.minecraftVersion
      );
    },
    {
      query: t.Object({
        query: t.Optional(t.String({ default: "" })),
        platform: platformSchema,
        minecraftVersion: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/versions",
    async ({ query, user }) => {
      assertAdmin(user);
      return pluginRegistryService.versions(
        query.provider,
        query.projectId,
        query.platform,
        query.minecraftVersion
      );
    },
    {
      query: t.Object({
        provider: providerSchema,
        projectId: t.String({ minLength: 1 }),
        platform: platformSchema,
        minecraftVersion: t.Optional(t.String()),
      }),
    }
  )
  .get("/artifacts", async ({ user }) => {
    assertAdmin(user);
    return pluginRegistryService.listArtifacts();
  })
  .post(
    "/artifacts",
    async ({ body, user }) => {
      assertAdmin(user);
      return pluginRegistryService.register(body);
    },
    { body: versionSchema }
  )
  .post(
    "/artifacts/upload",
    async ({ body, user }) => {
      assertAdmin(user);
      return pluginRegistryService.upload(body.file);
    },
    { body: t.Object({ file: t.File({ type: "application/java-archive" }) }) }
  )
  .delete("/library/:artifactId", async ({ params, user }) => {
    assertAdmin(user);
    const serverIds = await pluginRegistryService.deleteArtifact(params.artifactId);
    await Promise.all(serverIds.map((serverId) => operatorResourceSync.syncServerById(serverId)));
    return { success: true };
  })
  .get("/servers/:serverId/plugins", async ({ params, user }) => {
    assertAdmin(user);
    return pluginRegistryService.list(params.serverId);
  })
  .put(
    "/servers/:serverId/plugins",
    async ({ params, body, user }) => {
      assertAdmin(user);
      await pluginRegistryService.reconcile(params.serverId, body.artifactIds);
      await operatorResourceSync.syncServerById(params.serverId);
      return { success: true };
    },
    { body: t.Object({ artifactIds: t.Array(t.String()) }) }
  )
  .post(
    "/servers/:serverId/plugins",
    async ({ params, body, user }) => {
      assertAdmin(user);
      const registered = await pluginRegistryService.register(body);
      const artifact = await pluginRegistryService.deploy(params.serverId, registered.id);
      await operatorResourceSync.syncServerById(params.serverId);
      return artifact;
    },
    { body: versionSchema }
  )
  .post("/servers/:serverId/deployments/:artifactId", async ({ params, user }) => {
    assertAdmin(user);
    const artifact = await pluginRegistryService.deploy(params.serverId, params.artifactId);
    await operatorResourceSync.syncServerById(params.serverId);
    return artifact;
  })
  .delete("/servers/:serverId/installations/:installationId", async ({ params, user }) => {
    assertAdmin(user);
    await pluginRegistryService.remove(params.serverId, params.installationId);
    await operatorResourceSync.syncServerById(params.serverId);
    return { success: true };
  });
