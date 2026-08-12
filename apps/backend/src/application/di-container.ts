import { PrismaReverseProxyRepository } from "../infrastructure/repositories/prisma/reverse-proxy.repository.impl";
import { PrismaServerRepository } from "../infrastructure/repositories/prisma/server.repository.impl";
import { PrismaUserRepository } from "../infrastructure/repositories/prisma/user.repository.impl";
import { K8sService } from "../services/k8s";
import { WebSocketService } from "../services/websocket";
import { ReverseProxyService } from "./services/reverse-proxy.service";
import { ServerService } from "./services/server.service";
import { UserService } from "./services/user.service";

const userRepo = new PrismaUserRepository();
const serverRepo = new PrismaServerRepository();
const reverseProxyRepo = new PrismaReverseProxyRepository();
const webSocketService = new WebSocketService();
const k8sService = new K8sService();

export const userService = new UserService(userRepo);
export const serverService = new ServerService(serverRepo, k8sService);
export const reverseProxyService = new ReverseProxyService(reverseProxyRepo);
export const wsService = webSocketService;
export { k8sService };
