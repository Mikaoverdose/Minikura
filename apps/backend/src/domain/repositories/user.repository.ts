import type { UpdateSuspensionInput, UpdateUserInput, User } from "@minikura/db";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  updateWithAdminSafety(id: string, input: UpdateUserInput): Promise<User>;
  updateSuspensionWithAdminSafety(id: string, input: UpdateSuspensionInput): Promise<User>;
  deleteWithAdminSafety(id: string): Promise<void>;
}
