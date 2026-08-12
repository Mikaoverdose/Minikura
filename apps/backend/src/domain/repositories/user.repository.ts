import type { UpdateSuspensionInput, UpdateUserInput, User } from "@minikura/db";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  update(id: string, input: UpdateUserInput): Promise<User>;
  updateSuspension(id: string, input: UpdateSuspensionInput): Promise<User>;
  delete(id: string): Promise<void>;
}
