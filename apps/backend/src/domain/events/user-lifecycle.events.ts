import { DomainEvent } from "./domain-event";

export class UserSuspendedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly suspendedUntil: Date | null
  ) {
    super();
  }
}

export class UserUnsuspendedEvent extends DomainEvent {
  constructor(public readonly userId: string) {
    super();
  }
}
