import { type EnvVariable, prisma, type ReverseProxyWithEnvVars } from "@minikura/db";
import { ConflictError, NotFoundError } from "../../../domain/errors/base.error";
import type {
  ReverseProxyCreateInput,
  ReverseProxyRepository,
  ReverseProxyUpdateInput,
} from "../../../domain/repositories/reverse-proxy.repository";
import { ApiKeyGeneratorImpl } from "../../api-key-generator";

export class PrismaReverseProxyRepository implements ReverseProxyRepository {
  private apiKeyGenerator = new ApiKeyGeneratorImpl();

  async findById(id: string, omitSensitive = false): Promise<ReverseProxyWithEnvVars | null> {
    const proxy = await prisma.reverseProxyServer.findUnique({
      where: { id },
      include: { env_variables: true },
    });

    if (!proxy) return null;

    if (omitSensitive) {
      const { api_key, ...rest } = proxy;
      return { ...rest, api_key: "" } as ReverseProxyWithEnvVars;
    }

    return proxy;
  }

  async findAll(omitSensitive = false): Promise<ReverseProxyWithEnvVars[]> {
    const proxies = await prisma.reverseProxyServer.findMany({
      include: { env_variables: true },
    });

    if (omitSensitive) {
      return proxies.map((proxy) => {
        const { api_key, ...rest } = proxy;
        return { ...rest, api_key: "" } as ReverseProxyWithEnvVars;
      });
    }

    return proxies;
  }

  async exists(id: string): Promise<boolean> {
    const proxy = await prisma.reverseProxyServer.findUnique({
      where: { id },
      select: { id: true },
    });
    return proxy !== null;
  }

  async create(input: ReverseProxyCreateInput): Promise<ReverseProxyWithEnvVars> {
    const existing = await this.exists(input.id);
    if (existing) {
      throw new ConflictError("ReverseProxyServer", input.id);
    }

    const token = this.apiKeyGenerator.generateReverseProxyApiKey();

    const proxy = await prisma.reverseProxyServer.create({
      data: {
        id: input.id,
        type: input.type ?? "VELOCITY",
        description: input.description ?? null,
        external_address: input.external_address,
        external_port: input.external_port,
        listen_port: input.listen_port ?? 25565,
        service_type: input.service_type ?? "LOAD_BALANCER",
        node_port: input.node_port ?? null,
        memory: input.memory ?? 512,
        cpu_request: input.cpu_request ?? "250m",
        cpu_limit: input.cpu_limit ?? "500m",
        api_key: token,
        env_variables: input.env_variables
          ? {
              create: input.env_variables.map((ev) => ({
                key: ev.key,
                value: ev.value,
              })),
            }
          : undefined,
      },
      include: { env_variables: true },
    });

    return proxy;
  }

  async update(id: string, input: ReverseProxyUpdateInput): Promise<ReverseProxyWithEnvVars> {
    const proxy = await prisma.reverseProxyServer.findUnique({
      where: { id },
    });

    if (!proxy) {
      throw new NotFoundError("ReverseProxyServer", id);
    }

    const updated = await prisma.reverseProxyServer.update({
      where: { id },
      data: {
        description: input.description,
        external_address: input.external_address,
        external_port: input.external_port,
        listen_port: input.listen_port,
        type: input.type,
        service_type: input.service_type,
        node_port: input.node_port,
        memory: input.memory,
        cpu_request: input.cpu_request,
        cpu_limit: input.cpu_limit,
      },
      include: { env_variables: true },
    });

    return updated;
  }

  async delete(id: string): Promise<void> {
    await prisma.reverseProxyServer.delete({
      where: { id },
    });
  }

  async setEnvVariable(proxyId: string, key: string, value: string): Promise<void> {
    await prisma.customEnvironmentVariable.upsert({
      where: {
        key_reverse_proxy_id: {
          key,
          reverse_proxy_id: proxyId,
        },
      },
      update: {
        value,
      },
      create: {
        key,
        value,
        reverse_proxy_id: proxyId,
      },
    });
  }

  async getEnvVariables(proxyId: string): Promise<EnvVariable[]> {
    const proxy = await prisma.reverseProxyServer.findUnique({
      where: { id: proxyId },
      include: { env_variables: true },
    });

    if (!proxy) {
      throw new NotFoundError("ReverseProxyServer", proxyId);
    }

    return proxy.env_variables.map((ev) => ({
      key: ev.key,
      value: ev.value,
    }));
  }

  async deleteEnvVariable(proxyId: string, key: string): Promise<void> {
    await prisma.customEnvironmentVariable.deleteMany({
      where: {
        key,
        reverse_proxy_id: proxyId,
      },
    });
  }

  async replaceEnvVariables(proxyId: string, envVars: EnvVariable[]): Promise<void> {
    await prisma.customEnvironmentVariable.deleteMany({
      where: { reverse_proxy_id: proxyId },
    });

    if (envVars.length > 0) {
      await prisma.customEnvironmentVariable.createMany({
        data: envVars.map((envVar) => ({
          key: envVar.key,
          value: envVar.value,
          reverse_proxy_id: proxyId,
        })),
      });
    }
  }
}
