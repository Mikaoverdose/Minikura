import type { Prisma, User as PrismaUser } from "../generated/prisma";

export type User = PrismaUser;

export type CreateUserInput = Prisma.UserCreateInput;

export type UpdateUserInput = {
  name?: string;
  role?: "admin" | "user";
};

export type UpdateSuspensionInput = {
  isSuspended: boolean;
  suspendedUntil?: Date | null;
};

export function isUserSuspended(user: Pick<PrismaUser, "isSuspended" | "suspendedUntil">): boolean {
  if (!user.isSuspended) {
    return false;
  }

  if (user.suspendedUntil && user.suspendedUntil <= new Date()) {
    return false;
  }

  return true;
}
