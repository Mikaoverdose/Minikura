import type { User } from "@minikura/db";
import type { Elysia } from "elysia";
import { ForbiddenError, UnauthorizedError } from "../domain/errors/base.error";
import { bearerToken, findApiKeyOwner } from "./api-key";

function authenticatedUser(ctx: { user?: User | null; isSuspended?: boolean }) {
  const { user, isSuspended } = ctx;
  if (isSuspended) {
    throw new ForbiddenError("Account is suspended");
  }
  if (!user) {
    throw new UnauthorizedError();
  }
  return { user };
}

export function assertAdmin(user: Pick<User, "role">): void {
  if (user.role !== "admin") {
    throw new ForbiddenError("admin access required");
  }
}

export const requireAuth = (app: Elysia) => {
  return app.derive((ctx: any) => authenticatedUser(ctx));
};

export const requireRole = (role: string) => (app: Elysia) => {
  return app.derive((ctx: any) => {
    const { user } = authenticatedUser(ctx);
    if (user.role !== role) {
      throw new ForbiddenError(`${role} access required`);
    }
    return { user };
  });
};

export const requireAdmin = requireRole("admin");

export const requirePluginApiKey = (app: Elysia) => {
  return app.derive(async ({ request }) => {
    const owner = await findApiKeyOwner(bearerToken(request.headers.get("authorization")));
    if (!owner) {
      throw new UnauthorizedError();
    }
    return { pluginAuth: owner };
  });
};

export const requirePluginKind = (kind: "server" | "reverse-proxy") => (app: Elysia) =>
  app.use(requirePluginApiKey).derive(({ pluginAuth }) => {
    if (pluginAuth.kind !== kind) {
      throw new ForbiddenError(`API key is not authorized for ${kind} resources`);
    }
    return { pluginAuth };
  });
