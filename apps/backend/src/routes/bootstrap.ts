import { prisma } from "@minikura/db";
import { Elysia } from "elysia";
import { logger } from "../infrastructure/logger";
import { auth } from "../middleware/auth";
import { bootstrapSchema } from "../schemas/bootstrap.schema";

export const bootstrapRoutes = new Elysia({ prefix: "/bootstrap" })
  .get("/status", async () => {
    const userCount = await prisma.user.count();
    return { needsSetup: userCount === 0 };
  })
  .post("/setup", async ({ body, set }) => {
    try {
      const validated = bootstrapSchema.safeParse(body);
      if (!validated.success) {
        const firstError = validated.error.issues[0];
        set.status = 400;
        return {
          message: `${firstError.path.join(".")}: ${firstError.message}`,
        };
      }
      const data = validated.data;

      const result = await prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(673886947)`;
          if ((await tx.user.count()) > 0) return null;
          return auth.api.createUser({
            body: {
              email: data.email,
              password: data.password,
              name: data.name,
              role: "admin",
            },
          });
        },
        { timeout: 15_000 }
      );

      if (!result) {
        set.status = 400;
        return { message: "Setup already completed" };
      }

      if (!result.user) {
        logger.error({ result }, "No user in bootstrap response");
        set.status = 500;
        return { message: "Failed to create user" };
      }

      return { success: true };
    } catch (err: unknown) {
      logger.error({ err }, "Bootstrap setup failed");
      set.status = 500;
      return { message: "Failed to complete setup" };
    }
  });
