import type { User } from "@minikura/db";
import type { Elysia } from "elysia";
import { ForbiddenError, UnauthorizedError } from "../domain/errors/base.error";
import { bearerToken, findApiKeyOwner } from "./api-key";

function authenticatedUser(ctx: { user?: User | null; isSuspended?: boolean }) {
  const { user, isSuspended } = ctx;
  if (!user) {
    throw new UnauthorizedError();
  }
  if (isSuspended) {
    throw new ForbiddenError("Account is suspended");
  }
  return { user };
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
