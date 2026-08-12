import { describe, expect, test } from "bun:test";
import { DomainEvent } from "../domain/events/domain-event";
import { EventBus } from "./event-bus";

class TestEvent extends DomainEvent {}

describe("EventBus", () => {
  test("continues dispatching after a handler fails", async () => {
    const bus = new EventBus();
    let handled = false;
    bus.subscribe(TestEvent, () => {
      throw new Error("sync failed");
    });
    bus.subscribe(TestEvent, () => {
      handled = true;
    });

    await expect(bus.publish(new TestEvent())).resolves.toBeUndefined();
    expect(handled).toBeTrue();
  });
});
