import type { CustomEnvironmentVariable, Server } from "@minikura/db";
import { createServer, deleteServer } from "../resources/server";
import type { ServerConfig } from "../types";
import { BaseController } from "./base-controller";

type ServerWithEnvVars = Server & {
  env_variables: CustomEnvironmentVariable[];
};

export class ServerController extends BaseController {
  private deployedServers = new Map<string, ServerWithEnvVars>();

  protected getControllerName(): string {
    return "ServerController";
  }

  protected async syncResources(): Promise<void> {
    try {
      const appsApi = this.k8sClient.getAppsApi();
      const coreApi = this.k8sClient.getCoreApi();
      const networkingApi = this.k8sClient.getNetworkingApi();

      const servers = (await this.prisma.server.findMany({
        include: {
          env_variables: true,
        },
      })) as ServerWithEnvVars[];

      const currentServerIds = new Set(servers.map((server) => server.id));

      for (const [serverId, server] of this.deployedServers.entries()) {
        if (!currentServerIds.has(serverId)) {
          this.logger.info(
            { serverId, serverName: server.id },
            "Server removed from database, deleting K8s resources"
          );
          await deleteServer(serverId, appsApi, coreApi, this.namespace);
          this.deployedServers.delete(serverId);
        }
      }

      for (const server of servers) {
        const deployedServer = this.deployedServers.get(server.id);

        if (!deployedServer || this.hasServerChanged(deployedServer, server)) {
          const action = !deployedServer ? "Creating" : "Updating";
          this.logger.info(
            {
              serverId: server.id,
              serverType: server.type,
              action: action.toLowerCase(),
              memory: server.memory,
              port: server.listen_port,
            },
            `${action} Minecraft server in Kubernetes`
          );

          const serverConfig: ServerConfig = {
            id: server.id,
            type: server.type,
            apiKey: server.api_key,
            description: server.description,
            listen_port: server.listen_port,
            memory: server.memory,
            service_type: server.service_type,
            env_variables: server.env_variables?.map((ev) => ({
              key: ev.key,
              value: ev.value,
            })),
          };

          await createServer(serverConfig, appsApi, coreApi, networkingApi, this.namespace);

          this.deployedServers.set(server.id, { ...server });
        }
      }
    } catch (error) {
      this.logger.error({ err: error }, "Failed to sync servers to Kubernetes");
      throw error;
    }
  }

  private hasServerChanged(oldServer: ServerWithEnvVars, newServer: ServerWithEnvVars): boolean {
    const basicPropsChanged =
      oldServer.type !== newServer.type ||
      oldServer.listen_port !== newServer.listen_port ||
      oldServer.description !== newServer.description ||
      oldServer.service_type !== newServer.service_type ||
      oldServer.memory !== newServer.memory;

    if (basicPropsChanged) return true;

    const oldEnvVars = oldServer.env_variables || [];
    const newEnvVars = newServer.env_variables || [];

    if (oldEnvVars.length !== newEnvVars.length) return true;

    for (const newEnv of newEnvVars) {
      const oldEnv = oldEnvVars.find((e) => e.key === newEnv.key);
      if (!oldEnv || oldEnv.value !== newEnv.value) {
        return true;
      }
    }

    return false;
  }
}
