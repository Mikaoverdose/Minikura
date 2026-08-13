import { PrismaReverseProxyRepository } from "../infrastructure/repositories/prisma/reverse-proxy.repository.impl";
import { PrismaServerRepository } from "../infrastructure/repositories/prisma/server.repository.impl";
import { PrismaUserRepository } from "../infrastructure/repositories/prisma/user.repository.impl";
import { K8sService } from "../services/k8s";
import { OperatorResourceSync } from "../services/operator-resource-sync";
import { PluginRegistryService } from "../services/plugin-registry";
import { WebSocketService } from "../services/websocket";
import { ReverseProxyService } from "./services/reverse-proxy.service";
import { ServerService } from "./services/server.service";
import { UserService } from "./services/user.service";

const userRepo = new PrismaUserRepository();
const serverRepo = new PrismaServerRepository();
const reverseProxyRepo = new PrismaReverseProxyRepository();
const webSocketService = new WebSocketService();
const k8sService = new K8sService();
const operatorResourceSync = new OperatorResourceSync();
const pluginRegistryService = new PluginRegistryService();

export const userService = new UserService(userRepo);
export const serverService = new ServerService(serverRepo, k8sService);
export const reverseProxyService = new ReverseProxyService(reverseProxyRepo, k8sService);
export const wsService = webSocketService;
export { k8sService, operatorResourceSync, pluginRegistryService };
