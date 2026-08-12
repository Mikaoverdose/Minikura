import type { CustomEnvironmentVariable, ReverseProxyServer } from "@minikura/db";
import {
  createReverseProxyServer,
  deleteReverseProxyServer,
} from "../resources/reverseProxyServer";
import type { ReverseProxyConfig } from "../types";
import { BaseController } from "./base-controller";

type ReverseProxyWithEnvVars = ReverseProxyServer & {
  env_variables: CustomEnvironmentVariable[];
};

export class ReverseProxyController extends BaseController {
  private deployedProxies = new Map<string, ReverseProxyWithEnvVars>();

  protected getControllerName(): string {
    return "ReverseProxyController";
  }

  protected async syncResources(): Promise<void> {
    try {
      const appsApi = this.k8sClient.getAppsApi();
      const coreApi = this.k8sClient.getCoreApi();
      const networkingApi = this.k8sClient.getNetworkingApi();

      const proxies = (await this.prisma.reverseProxyServer.findMany({
        include: {
          env_variables: true,
        },
      })) as ReverseProxyWithEnvVars[];

      const currentProxyIds = new Set(proxies.map((proxy) => proxy.id));

      for (const [proxyId, proxy] of this.deployedProxies.entries()) {
        if (!currentProxyIds.has(proxyId)) {
          this.logger.info(
            { proxyId, proxyType: proxy.type },
            "Reverse proxy removed from database, deleting K8s resources"
          );
          await deleteReverseProxyServer(proxy.id, proxy.type, appsApi, coreApi, this.namespace);
          this.deployedProxies.delete(proxyId);
        }
      }

      for (const proxy of proxies) {
        const deployedProxy = this.deployedProxies.get(proxy.id);

        if (!deployedProxy || this.hasProxyChanged(deployedProxy, proxy)) {
          const action = !deployedProxy ? "Creating" : "Updating";
          this.logger.info(
            {
              proxyId: proxy.id,
              proxyType: proxy.type,
              action: action.toLowerCase(),
              externalAddress: proxy.external_address,
              externalPort: proxy.external_port,
              listenPort: proxy.listen_port,
            },
            `${action} reverse proxy server in Kubernetes`
          );

          const proxyConfig: ReverseProxyConfig = {
            id: proxy.id,
            external_address: proxy.external_address,
            external_port: proxy.external_port,
            listen_port: proxy.listen_port,
            description: proxy.description,
            apiKey: proxy.api_key,
            type: proxy.type,
            memory: proxy.memory,
            service_type: proxy.service_type,
            env_variables: proxy.env_variables?.map((ev) => ({
              key: ev.key,
              value: ev.value,
            })),
          };

          await createReverseProxyServer(
            proxyConfig,
            appsApi,
            coreApi,
            networkingApi,
            this.namespace
          );

          this.deployedProxies.set(proxy.id, { ...proxy });
        }
      }
    } catch (error) {
      this.logger.error({ err: error }, "Failed to sync reverse proxy servers to Kubernetes");
      throw error;
    }
  }

  private hasProxyChanged(
    oldProxy: ReverseProxyWithEnvVars,
    newProxy: ReverseProxyWithEnvVars
  ): boolean {
    const basicPropsChanged =
      oldProxy.external_address !== newProxy.external_address ||
      oldProxy.external_port !== newProxy.external_port ||
      oldProxy.listen_port !== newProxy.listen_port ||
      oldProxy.description !== newProxy.description ||
      oldProxy.service_type !== newProxy.service_type ||
      oldProxy.memory !== newProxy.memory ||
      oldProxy.type !== newProxy.type;

    if (basicPropsChanged) return true;

    const oldEnvVars = oldProxy.env_variables || [];
    const newEnvVars = newProxy.env_variables || [];

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
