import type { ServerType } from "../entities/enums";
import type { ServerCreateInput, ServerUpdateInput } from "../repositories/server.repository";
import { DomainEvent } from "./domain-event";

export class ServerCreatedEvent extends DomainEvent {
  constructor(
    public readonly serverId: string,
    public readonly serverType: ServerType,
    public readonly config: ServerCreateInput
  ) {
    super();
  }
}

export class ServerUpdatedEvent extends DomainEvent {
  constructor(
    public readonly serverId: string,
    public readonly changes: ServerUpdateInput
  ) {
    super();
  }
}

export class ServerDeletedEvent extends DomainEvent {
  constructor(public readonly serverId: string) {
    super();
  }
}
