import { prisma, type UpdateSuspensionInput, type UpdateUserInput, type User } from "@minikura/db";
import { BusinessRuleError, NotFoundError } from "../../../domain/errors/base.error";
import type { UserRepository } from "../../../domain/repositories/user.repository";

const activeAdminFilter = (excludedId: string) => ({
  id: { not: excludedId },
  role: "admin",
  banned: false,
  OR: [
    { isSuspended: false },
    { isSuspended: true, suspendedUntil: { not: null, lte: new Date() } },
  ],
});

export class PrismaUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  async findAll(): Promise<User[]> {
    return await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async updateWithAdminSafety(id: string, input: UpdateUserInput): Promise<User> {
    return prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({ where: { id } });
        if (!target) throw new NotFoundError("User", id);
        if (
          target.role === "admin" &&
          input.role === "user" &&
          (await tx.user.count({ where: activeAdminFilter(id) })) === 0
        ) {
          throw new BusinessRuleError("Cannot demote the last active administrator");
        }
        return tx.user.update({ where: { id }, data: input });
      },
      { isolationLevel: "Serializable" }
    );
  }

  async updateSuspensionWithAdminSafety(id: string, input: UpdateSuspensionInput): Promise<User> {
    return prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({ where: { id } });
        if (!target) throw new NotFoundError("User", id);
        const suspensionIsActive =
          input.isSuspended && (!input.suspendedUntil || input.suspendedUntil > new Date());
        if (
          target.role === "admin" &&
          suspensionIsActive &&
          (await tx.user.count({ where: activeAdminFilter(id) })) === 0
        ) {
          throw new BusinessRuleError("Cannot suspend the last active administrator");
        }
        return tx.user.update({ where: { id }, data: input });
      },
      { isolationLevel: "Serializable" }
    );
  }

  async deleteWithAdminSafety(id: string): Promise<void> {
    await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({ where: { id } });
        if (!target) throw new NotFoundError("User", id);
        if (
          target.role === "admin" &&
          (await tx.user.count({ where: activeAdminFilter(id) })) === 0
        ) {
          throw new BusinessRuleError("Cannot delete the last active administrator");
        }
        await tx.user.delete({ where: { id } });
      },
      { isolationLevel: "Serializable" }
    );
  }
}
