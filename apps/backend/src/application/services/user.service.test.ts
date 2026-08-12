import { describe, expect, mock, test } from "bun:test";
import type { User } from "@minikura/db";
import type { UserRepository } from "../../domain/repositories/user.repository";
import { UserService } from "./user.service";

const user = { id: "admin", role: "admin" } as User;

function repository(): UserRepository {
  return {
    findById: mock(async () => user),
    findAll: mock(async () => [user]),
    updateWithAdminSafety: mock(async () => user),
    updateSuspensionWithAdminSafety: mock(async () => user),
    deleteWithAdminSafety: mock(async () => undefined),
  };
}

describe("UserService lockout protection", () => {
  test("rejects self-demotion before writing", async () => {
    const repo = repository();
    const service = new UserService(repo);

    await expect(service.updateUser("admin", "admin", { role: "user" })).rejects.toThrow(
      "Cannot demote yourself"
    );
    expect(repo.updateWithAdminSafety).not.toHaveBeenCalled();
  });

  test("rejects active self-suspension before writing", async () => {
    const repo = repository();
    const service = new UserService(repo);

    await expect(
      service.updateSuspension("admin", "admin", { isSuspended: true, suspendedUntil: null })
    ).rejects.toThrow("Cannot suspend yourself");
    expect(repo.updateSuspensionWithAdminSafety).not.toHaveBeenCalled();
  });

  test("permits an already-expired suspension", async () => {
    const repo = repository();
    const service = new UserService(repo);

    await expect(
      service.updateSuspension("admin", "admin", {
        isSuspended: true,
        suspendedUntil: new Date(0),
      })
    ).resolves.toBe(user);
  });
});
