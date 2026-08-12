import { operatorResourceSync, wsService } from "../../application/di-container";
import {
  ReverseProxyCreatedEvent,
  ReverseProxyDeletedEvent,
  ReverseProxyUpdatedEvent,
} from "../../domain/events/reverse-proxy-lifecycle.events";
import { eventBus } from "../event-bus";
import { logger } from "../logger";

eventBus.subscribe(ReverseProxyCreatedEvent, async (event) => {
  logger.info(
    { proxyId: event.proxyId, proxyType: event.proxyType },
    "Reverse proxy created event"
  );
  wsService.broadcast("create", event.proxyType, event.proxyId);
  await operatorResourceSync.syncReverseProxyById(event.proxyId);
});

eventBus.subscribe(ReverseProxyUpdatedEvent, async (event) => {
  logger.info({ proxyId: event.proxyId }, "Reverse proxy updated event");
  wsService.broadcast("update", "reverse-proxy", event.proxyId);
  await operatorResourceSync.syncReverseProxyById(event.proxyId);
});

eventBus.subscribe(ReverseProxyDeletedEvent, async (event) => {
  logger.info({ proxyId: event.proxyId }, "Reverse proxy deleted event");
  wsService.broadcast("delete", "reverse-proxy", event.proxyId);
  await operatorResourceSync.deleteReverseProxy(event.proxyId);
});
