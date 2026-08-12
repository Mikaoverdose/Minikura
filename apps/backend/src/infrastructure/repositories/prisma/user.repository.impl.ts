import { prisma, type UpdateSuspensionInput, type UpdateUserInput, type User } from "@minikura/db";
import type { UserRepository } from "../../../domain/repositories/user.repository";

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

  async update(id: string, input: UpdateUserInput): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: input,
    });
  }

  async updateSuspension(id: string, input: UpdateSuspensionInput): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }
}
