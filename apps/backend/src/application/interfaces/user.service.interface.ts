import type { UpdateSuspensionInput, UpdateUserInput, User } from "@minikura/db";

export interface IUserService {
  getUserById(id: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(requestingUserId: string, id: string, input: UpdateUserInput): Promise<User>;
  updateSuspension(
    requestingUserId: string,
    id: string,
    input: UpdateSuspensionInput
  ): Promise<User>;
  deleteUser(requestingUserId: string, targetUserId: string): Promise<void>;
}
