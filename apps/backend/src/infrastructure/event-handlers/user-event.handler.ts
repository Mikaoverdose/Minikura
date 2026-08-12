import {
  UserSuspendedEvent,
  UserUnsuspendedEvent,
} from "../../domain/events/user-lifecycle.events";
import { eventBus } from "../event-bus";
import { logger } from "../logger";

eventBus.subscribe(UserSuspendedEvent, async (event) => {
  if (event.suspendedUntil) {
    logger.warn(
      { userId: event.userId, suspendedUntil: event.suspendedUntil.toISOString() },
      "User suspended with expiry"
    );
  } else {
    logger.warn({ userId: event.userId }, "User suspended indefinitely");
  }
});

eventBus.subscribe(UserUnsuspendedEvent, async (event) => {
  logger.info({ userId: event.userId }, "User unsuspended");
});
