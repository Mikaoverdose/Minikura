import { type EnvVariable, prisma, type ServerWithEnvVars } from "@minikura/db";
import { ConflictError, NotFoundError } from "../../../domain/errors/base.error";
import type {
  ServerCreateInput,
  ServerRepository,
  ServerUpdateInput,
} from "../../../domain/repositories/server.repository";
import { ApiKeyGeneratorImpl } from "../../api-key-generator";

export class PrismaServerRepository implements ServerRepository {
  private apiKeyGenerator = new ApiKeyGeneratorImpl();

  async findById(id: string, omitSensitive = false): Promise<ServerWithEnvVars | null> {
    const server = await prisma.server.findUnique({
      where: { id },
      include: { env_variables: true },
    });

    if (!server) return null;

    if (omitSensitive) {
      const { api_key, env_variables, ...rest } = server;
      return { ...rest, api_key: "", env_variables: [] } as ServerWithEnvVars;
    }

    return server;
  }

  async findAll(omitSensitive = false): Promise<ServerWithEnvVars[]> {
    const servers = await prisma.server.findMany({
      include: { env_variables: true },
    });

    if (omitSensitive) {
      return servers.map((server) => {
        const { api_key, env_variables, ...rest } = server;
        return { ...rest, api_key: "", env_variables: [] } as ServerWithEnvVars;
      });
    }

    return servers;
  }

  async exists(id: string): Promise<boolean> {
    const server = await prisma.server.findUnique({
      where: { id },
      select: { id: true },
    });
    return server !== null;
  }

  async create(input: ServerCreateInput): Promise<ServerWithEnvVars> {
    const existing = await this.exists(input.id);
    if (existing) {
      throw new ConflictError("Server", input.id);
    }

    const token = this.apiKeyGenerator.generateServerApiKey();

    const server = await prisma.server.create({
      data: {
        id: input.id,
        type: input.type,
        description: input.description ?? null,
        listen_port: input.listen_port,
        service_type: input.service_type ?? "CLUSTER_IP",
        node_port: input.node_port ?? null,
        memory: input.memory ?? 2048,
        memory_request: input.memory_request ?? 1024,
        cpu_request: input.cpu_request ?? "500m",
        cpu_limit: input.cpu_limit ?? "2",
        jar_type: input.jar_type ?? "VANILLA",
        minecraft_version: input.minecraft_version ?? "LATEST",
        jvm_opts: input.jvm_opts ?? null,
        use_aikar_flags: input.use_aikar_flags ?? false,
        use_meowice_flags: input.use_meowice_flags ?? false,
        difficulty: input.difficulty ?? "EASY",
        game_mode: input.game_mode ?? "SURVIVAL",
        max_players: input.max_players ?? 20,
        pvp: input.pvp ?? true,
        online_mode: input.online_mode ?? true,
        motd: input.motd ?? null,
        level_seed: input.level_seed ?? null,
        level_type: input.level_type ?? null,
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

    return server;
  }

  async update(id: string, input: ServerUpdateInput): Promise<ServerWithEnvVars> {
    const server = await prisma.server.findUnique({
      where: { id },
    });

    if (!server) {
      throw new NotFoundError("Server", id);
    }

    if (input.env_variables !== undefined) {
      await this.replaceEnvVariables(id, input.env_variables);
    }

    const updated = await prisma.server.update({
      where: { id },
      data: {
        description: input.description,
        listen_port: input.listen_port,
        service_type: input.service_type,
        node_port: input.node_port,
        memory: input.memory,
        memory_request: input.memory_request,
        cpu_request: input.cpu_request,
        cpu_limit: input.cpu_limit,
        jar_type: input.jar_type,
        minecraft_version: input.minecraft_version,
        jvm_opts: input.jvm_opts,
        use_aikar_flags: input.use_aikar_flags,
        use_meowice_flags: input.use_meowice_flags,
        difficulty: input.difficulty,
        game_mode: input.game_mode,
        max_players: input.max_players,
        pvp: input.pvp,
        online_mode: input.online_mode,
        motd: input.motd,
        level_seed: input.level_seed,
        level_type: input.level_type,
      },
      include: { env_variables: true },
    });

    return updated;
  }

  async delete(id: string): Promise<void> {
    await prisma.server.delete({
      where: { id },
    });
  }

  async setEnvVariable(serverId: string, key: string, value: string): Promise<void> {
    await prisma.customEnvironmentVariable.upsert({
      where: {
        key_server_id: {
          key,
          server_id: serverId,
        },
      },
      update: {
        value,
      },
      create: {
        key,
        value,
        server_id: serverId,
      },
    });
  }

  async getEnvVariables(serverId: string): Promise<EnvVariable[]> {
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: { env_variables: true },
    });

    if (!server) {
      throw new NotFoundError("Server", serverId);
    }

    return server.env_variables.map((ev) => ({
      key: ev.key,
      value: ev.value,
    }));
  }

  async deleteEnvVariable(serverId: string, key: string): Promise<void> {
    await prisma.customEnvironmentVariable.deleteMany({
      where: {
        key,
        server_id: serverId,
      },
    });
  }

  async replaceEnvVariables(serverId: string, envVars: EnvVariable[]): Promise<void> {
    await prisma.customEnvironmentVariable.deleteMany({
      where: { server_id: serverId },
    });

    if (envVars.length > 0) {
      await prisma.customEnvironmentVariable.createMany({
        data: envVars.map((envVar) => ({
          key: envVar.key,
          value: envVar.value,
          server_id: serverId,
        })),
      });
    }
  }
}
