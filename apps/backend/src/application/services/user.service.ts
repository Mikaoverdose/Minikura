import type { UpdateSuspensionInput, UpdateUserInput, User } from "@minikura/db";
import { BusinessRuleError, NotFoundError } from "../../domain/errors/base.error";
import {
  UserSuspendedEvent,
  UserUnsuspendedEvent,
} from "../../domain/events/user-lifecycle.events";
import type { UserRepository } from "../../domain/repositories/user.repository";
import { eventBus } from "../../infrastructure/event-bus";
import type { IUserService } from "../interfaces/user.service.interface";

export class UserService implements IUserService {
  constructor(private userRepo: UserRepository) {}

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundError("User", id);
    }
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepo.findAll();
  }

  async updateUser(requestingUserId: string, id: string, input: UpdateUserInput): Promise<User> {
    if (requestingUserId === id && input.role && input.role !== "admin") {
      throw new BusinessRuleError("Cannot demote yourself");
    }
    return this.userRepo.updateWithAdminSafety(id, input);
  }

  async updateSuspension(
    requestingUserId: string,
    id: string,
    input: UpdateSuspensionInput
  ): Promise<User> {
    const suspensionIsActive =
      input.isSuspended && (!input.suspendedUntil || input.suspendedUntil > new Date());
    if (requestingUserId === id && suspensionIsActive) {
      throw new BusinessRuleError("Cannot suspend yourself");
    }
    const user = await this.userRepo.updateSuspensionWithAdminSafety(id, input);
    if (input.isSuspended) {
      const suspendedUntil = input.suspendedUntil instanceof Date ? input.suspendedUntil : null;
      await eventBus.publish(new UserSuspendedEvent(id, suspendedUntil));
    } else {
      await eventBus.publish(new UserUnsuspendedEvent(id));
    }
    return user;
  }

  async deleteUser(requestingUserId: string, targetUserId: string): Promise<void> {
    if (requestingUserId === targetUserId) {
      throw new BusinessRuleError("Cannot delete yourself");
    }
    await this.userRepo.deleteWithAdminSafety(targetUserId);
  }
}
