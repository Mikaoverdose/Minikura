import type { DomainEvent } from "../domain/events/domain-event";
import { logger } from "./logger";

type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  subscribe<T extends DomainEvent>(
    eventClass: { new (...args: any[]): T },
    handler: EventHandler<T>
  ): () => void {
    const eventName = eventClass.name;
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName)?.add(handler as EventHandler);
    return () => {
      this.handlers.get(eventName)?.delete(handler as EventHandler);
    };
  }

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const eventName = event.constructor.name;
    const handlers = this.handlers.get(eventName) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        logger.error({ err: error, eventName }, "Error executing event handler");
      }
    }
  }
}

export const eventBus = new EventBus();
