import {
  MinecraftServerJarType,
  ReverseProxyServerType,
  ServerType,
  ServiceType,
} from "@minikura/db";
import { z } from "zod";
import { GameMode, ServerDifficulty } from "../domain/entities/enums";

const resourceIdSchema = z
  .string()
  .min(1, "Server ID is required")
  .max(51, "Server ID must be at most 51 characters")
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "ID must be a lowercase DNS label");

export const serverIdSchema = z.object({ id: resourceIdSchema });

export const createServerSchema = z.object({
  id: resourceIdSchema,
  description: z.string().nullable().optional(),
  listen_port: z.number().int().min(1).max(65535),
  type: z.nativeEnum(ServerType),
  service_type: z.nativeEnum(ServiceType).optional(),
  node_port: z.union([z.number().int().min(30000).max(32767), z.null()]).optional(),
  env_variables: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.string(),
      })
    )
    .optional(),
  memory: z.number().int().min(256).optional(),
  memory_request: z.number().int().min(256).optional(),
  cpu_request: z.string().optional(),
  cpu_limit: z.string().optional(),

  jar_type: z.nativeEnum(MinecraftServerJarType).optional(),
  minecraft_version: z.string().optional(),

  jvm_opts: z.string().optional(),
  use_aikar_flags: z.boolean().optional(),
  use_meowice_flags: z.boolean().optional(),

  difficulty: z.nativeEnum(ServerDifficulty).optional(),
  game_mode: z.nativeEnum(GameMode).optional(),
  max_players: z.number().int().min(1).max(1000).optional(),
  pvp: z.boolean().optional(),
  online_mode: z.boolean().optional(),
  motd: z.string().optional(),
  level_seed: z.string().optional(),
  level_type: z.string().optional(),
  running: z.boolean().optional(),
});

export const updateServerSchema = createServerSchema.omit({ id: true, type: true }).partial();

export const createReverseProxySchema = z.object({
  id: resourceIdSchema,
  description: z.string().nullable().optional(),
  external_address: z.string().min(1, "External address is required"),
  external_port: z.number().int().min(1).max(65535),
  listen_port: z.number().int().min(1).max(65535).optional(),
  type: z.nativeEnum(ReverseProxyServerType).optional(),
  service_type: z.nativeEnum(ServiceType).optional(),
  node_port: z.union([z.number().int().min(30000).max(32767), z.null()]).optional(),
  env_variables: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.string(),
      })
    )
    .optional(),
  memory: z.number().int().min(256).optional(),
  cpu_request: z.string().optional(),
  cpu_limit: z.string().optional(),
});

export const updateReverseProxySchema = createReverseProxySchema
  .omit({ id: true, env_variables: true })
  .partial();

export const envVariableSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string(),
});

export type CreateServerInput = z.infer<typeof createServerSchema>;
export type UpdateServerInput = z.infer<typeof updateServerSchema>;
export type CreateReverseProxyInput = z.infer<typeof createReverseProxySchema>;
export type UpdateReverseProxyInput = z.infer<typeof updateReverseProxySchema>;
export type EnvVariableInput = z.infer<typeof envVariableSchema>;
