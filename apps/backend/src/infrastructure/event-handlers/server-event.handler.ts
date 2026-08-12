import { operatorResourceSync, wsService } from "../../application/di-container";
import {
  ServerCreatedEvent,
  ServerDeletedEvent,
  ServerUpdatedEvent,
} from "../../domain/events/server-lifecycle.events";
import { eventBus } from "../event-bus";
import { logger } from "../logger";

eventBus.subscribe(ServerCreatedEvent, async (event) => {
  logger.info({ serverId: event.serverId, serverType: event.serverType }, "Server created event");
  wsService.broadcast("create", event.serverType, event.serverId);
  await operatorResourceSync.syncServerById(event.serverId);
});

eventBus.subscribe(ServerUpdatedEvent, async (event) => {
  logger.info({ serverId: event.serverId }, "Server updated event");
  wsService.broadcast("update", "server", event.serverId);
  await operatorResourceSync.syncServerById(event.serverId);
});

eventBus.subscribe(ServerDeletedEvent, async (event) => {
  logger.info({ serverId: event.serverId }, "Server deleted event");
  wsService.broadcast("delete", "server", event.serverId);
  await operatorResourceSync.deleteServer(event.serverId);
});
