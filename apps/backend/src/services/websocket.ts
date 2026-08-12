import { logger } from "../infrastructure/logger";

export type WebSocketClient = {
  send: (message: string) => void;
};

export interface IWebSocketService {
  addClient(client: WebSocketClient): void;
  removeClient(client: WebSocketClient): void;
  broadcast(action: string, serverType: string, serverId: string): void;
  getClientCount(): number;
}

export class WebSocketService implements IWebSocketService {
  private clients = new Set<WebSocketClient>();

  addClient(client: WebSocketClient): void {
    this.clients.add(client);
    logger.debug({ totalClients: this.clients.size }, "WebSocket client connected");
  }

  removeClient(client: WebSocketClient): void {
    this.clients.delete(client);
    logger.debug({ totalClients: this.clients.size }, "WebSocket client disconnected");
  }

  broadcast(action: string, serverType: string, serverId: string): void {
    const message = JSON.stringify({
      type: "SERVER_CHANGE",
      action,
      serverType,
      serverId,
      timestamp: new Date().toISOString(),
    });

    let failedClients = 0;
    this.clients.forEach((client) => {
      try {
        client.send(message);
      } catch {
        failedClients++;
        this.clients.delete(client);
      }
    });

    if (failedClients > 0) {
      logger.warn({ failedClients }, "Removed failed WebSocket clients");
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
