import { Elysia } from "elysia";
import { userService } from "../application/di-container";
import { requireAdmin } from "../middleware/auth-guards";
import { updateSuspensionSchema, updateUserSchema } from "../schemas/user.schema";

export const userRoutes = new Elysia({ prefix: "/users" })
  .use(requireAdmin)
  .get("/", async () => {
    return await userService.getAllUsers();
  })
  .get("/:id", async ({ params }) => {
    return await userService.getUserById(params.id);
  })
  .patch("/:id", async ({ params, body }) => {
    const input = updateUserSchema.parse(body);
    return await userService.updateUser(params.id, input);
  })
  .patch("/:id/suspension", async ({ params, body }) => {
    const payload = updateSuspensionSchema.parse(body);
    return await userService.updateSuspension(params.id, {
      isSuspended: payload.isSuspended,
      suspendedUntil: payload.suspendedUntil ? new Date(payload.suspendedUntil) : null,
    });
  })
  .delete("/:id", async ({ params, user }) => {
    await userService.deleteUser(user.id, params.id);
    return { success: true };
  });
