import type { ReverseProxyWithEnvVars } from "@minikura/db";
import {
  ReverseProxyCreatedEvent,
  ReverseProxyDeletedEvent,
  ReverseProxyUpdatedEvent,
} from "../../domain/events/reverse-proxy-lifecycle.events";
import type {
  ReverseProxyCreateInput,
  ReverseProxyRepository,
  ReverseProxyUpdateInput,
} from "../../domain/repositories/reverse-proxy.repository";
import { eventBus } from "../../infrastructure/event-bus";
import type { K8sService } from "../../services/k8s";
import { operatorResourceName } from "../../services/operator-resource-sync";
import type { IReverseProxyService } from "../interfaces/reverse-proxy.service.interface";
import { BaseCrudService } from "./base-crud.service";

export class ReverseProxyService
  extends BaseCrudService<
    ReverseProxyWithEnvVars,
    ReverseProxyCreateInput,
    ReverseProxyUpdateInput,
    ReverseProxyRepository,
    {
      created: typeof ReverseProxyCreatedEvent;
      updated: typeof ReverseProxyUpdatedEvent;
      deleted: typeof ReverseProxyDeletedEvent;
    }
  >
  implements IReverseProxyService
{
  constructor(
    reverseProxyRepo: ReverseProxyRepository,
    private k8sService: K8sService
  ) {
    super(
      reverseProxyRepo,
      {
        created: ReverseProxyCreatedEvent,
        updated: ReverseProxyUpdatedEvent,
        deleted: ReverseProxyDeletedEvent,
      },
      "ReverseProxyServer"
    );
  }

  protected getEntityType(input: ReverseProxyCreateInput) {
    return input.type || "VELOCITY";
  }

  protected getInputId(input: ReverseProxyCreateInput): string {
    return typeof input.id === "string" ? input.id : String(input.id);
  }

  getAllReverseProxies(omitSensitive = false) {
    return this.getAll(omitSensitive);
  }

  getReverseProxyById(id: string, omitSensitive = false) {
    return this.getById(id, omitSensitive);
  }

  createReverseProxy(input: ReverseProxyCreateInput) {
    return this.create(input);
  }

  updateReverseProxy(id: string, input: ReverseProxyUpdateInput) {
    return this.update(id, input);
  }

  deleteReverseProxy(id: string) {
    return this.delete(id);
  }

  override async setEnvVariable(proxyId: string, key: string, value: string): Promise<void> {
    await super.setEnvVariable(proxyId, key, value);
    await eventBus.publish(new ReverseProxyUpdatedEvent(proxyId, {}));
  }

  override async deleteEnvVariable(proxyId: string, key: string): Promise<void> {
    await super.deleteEnvVariable(proxyId, key);
    await eventBus.publish(new ReverseProxyUpdatedEvent(proxyId, {}));
  }

  async getConnectionInfo(proxyId: string) {
    const proxy = await this.getReverseProxyById(proxyId);
    const serviceName = `${String(proxy.type).toLowerCase()}-${operatorResourceName(proxyId)}`;
    return this.k8sService.getServerConnectionInfo(serviceName);
  }
}
