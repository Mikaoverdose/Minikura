import type { CreateServerRequest, NormalServer } from "@minikura/api";
import type { EnvVar, ServerFormData, ServerType, ServiceType } from "@/components/server-form";

type EnvironmentVariable = { key: string; value: string };

export type CommonServerRequestFields = Omit<CreateServerRequest, "id" | "type">;

const MANAGED_ENVIRONMENT_KEYS = new Set([
  "EULA",
  "TYPE",
  "VERSION",
  "CUSTOM_SERVER",
  "MOTD",
  "DIFFICULTY",
  "MODE",
  "MAX_PLAYERS",
  "PVP",
  "ONLINE_MODE",
  "ALLOW_FLIGHT",
  "ENABLE_COMMAND_BLOCK",
  "SPAWN_PROTECTION",
  "VIEW_DISTANCE",
  "SIMULATION_DISTANCE",
  "LEVEL",
  "SEED",
  "LEVEL_TYPE",
  "GENERATOR_SETTINGS",
  "HARDCORE",
  "SPAWN_ANIMALS",
  "SPAWN_MONSTERS",
  "SPAWN_NPCS",
  "ENABLE_WHITELIST",
  "WHITELIST",
  "WHITELIST_FILE",
  "OPS",
  "OPS_FILE",
  "USE_AIKAR_FLAGS",
  "USE_MEOWICE_FLAGS",
  "JVM_OPTS",
  "JVM_XX_OPTS",
  "JVM_DD_OPTS",
  "ENABLE_JMX",
  "RESOURCE_PACK",
  "RESOURCE_PACK_SHA1",
  "RESOURCE_PACK_ENFORCE",
  "ENABLE_RCON",
  "RCON_PASSWORD",
  "RCON_PORT",
  "RCON_CMDS_STARTUP",
  "RCON_CMDS_ON_CONNECT",
  "RCON_CMDS_FIRST_CONNECT",
  "RCON_CMDS_ON_DISCONNECT",
  "RCON_CMDS_LAST_DISCONNECT",
  "ENABLE_QUERY",
  "QUERY_PORT",
  "ENABLE_AUTOPAUSE",
  "AUTOPAUSE_TIMEOUT_EST",
  "AUTOPAUSE_TIMEOUT_INIT",
  "AUTOPAUSE_TIMEOUT_KN",
  "AUTOPAUSE_PERIOD",
  "AUTOPAUSE_KNOCK_INTERFACE",
  "ENABLE_AUTOSTOP",
  "AUTOSTOP_TIMEOUT_EST",
  "AUTOSTOP_TIMEOUT_INIT",
  "AUTOSTOP_PERIOD",
  "PLUGINS",
  "REMOVE_OLD_PLUGINS",
  "SPIGET_RESOURCES",
  "PAPER_BUILD",
  "TZ",
  "UID",
  "GID",
  "STOP_DURATION",
  "ICON",
]);

export const normalizeDifficulty = (value?: string | null): ServerFormData["difficulty"] => {
  const normalized = value?.toLowerCase();
  if (
    normalized === "peaceful" ||
    normalized === "easy" ||
    normalized === "normal" ||
    normalized === "hard"
  ) {
    return normalized;
  }
  return "easy";
};

export const normalizeMode = (value?: string | null): ServerFormData["mode"] => {
  const normalized = value?.toLowerCase();
  if (
    normalized === "survival" ||
    normalized === "creative" ||
    normalized === "adventure" ||
    normalized === "spectator"
  ) {
    return normalized;
  }
  return "survival";
};

export const normalizeServiceType = (value?: string | null): ServiceType => {
  if (value === "NODE_PORT" || value === "LOAD_BALANCER") {
    return value;
  }
  return "CLUSTER_IP";
};

export const normalizeServerType = (value?: string | null): ServerType => {
  if (
    value === "VANILLA" ||
    value === "PAPER" ||
    value === "SPIGOT" ||
    value === "PURPUR" ||
    value === "FABRIC" ||
    value === "CUSTOM"
  ) {
    return value;
  }
  return "PAPER";
};

export const toApiDifficulty = (
  value: ServerFormData["difficulty"]
): Uppercase<ServerFormData["difficulty"]> => {
  return value.toUpperCase() as Uppercase<ServerFormData["difficulty"]>;
};

export const toApiMode = (value: ServerFormData["mode"]): Uppercase<ServerFormData["mode"]> => {
  return value.toUpperCase() as Uppercase<ServerFormData["mode"]>;
};

export const toManagedEnvironmentVariables = (data: ServerFormData): Record<string, string> => {
  const environment: Record<string, string> = {};

  if (data.allowFlight) environment.ALLOW_FLIGHT = String(data.allowFlight);
  if (data.enableCommandBlock) {
    environment.ENABLE_COMMAND_BLOCK = String(data.enableCommandBlock);
  }
  if (data.spawnProtection) environment.SPAWN_PROTECTION = data.spawnProtection;
  if (data.viewDistance) environment.VIEW_DISTANCE = data.viewDistance;
  if (data.simulationDistance) environment.SIMULATION_DISTANCE = data.simulationDistance;

  if (data.levelName) environment.LEVEL = data.levelName;
  if (data.levelSeed) environment.SEED = data.levelSeed;
  if (data.levelType) environment.LEVEL_TYPE = data.levelType;
  if (data.generatorSettings) environment.GENERATOR_SETTINGS = data.generatorSettings;
  if (data.hardcore) environment.HARDCORE = String(data.hardcore);
  if (data.spawnAnimals !== undefined) environment.SPAWN_ANIMALS = String(data.spawnAnimals);
  if (data.spawnMonsters !== undefined) environment.SPAWN_MONSTERS = String(data.spawnMonsters);
  if (data.spawnNpcs !== undefined) environment.SPAWN_NPCS = String(data.spawnNpcs);

  if (data.enableWhitelist) environment.ENABLE_WHITELIST = String(data.enableWhitelist);
  if (data.whitelist) environment.WHITELIST = data.whitelist;
  if (data.whitelistFile) environment.WHITELIST_FILE = data.whitelistFile;
  if (data.ops) environment.OPS = data.ops;
  if (data.opsFile) environment.OPS_FILE = data.opsFile;

  if (data.jvmXxOpts) environment.JVM_XX_OPTS = data.jvmXxOpts;
  if (data.jvmDdOpts) environment.JVM_DD_OPTS = data.jvmDdOpts;
  if (data.enableJmx) environment.ENABLE_JMX = String(data.enableJmx);

  if (data.resourcePack) environment.RESOURCE_PACK = data.resourcePack;
  if (data.resourcePackSha1) environment.RESOURCE_PACK_SHA1 = data.resourcePackSha1;
  if (data.resourcePackEnforce) {
    environment.RESOURCE_PACK_ENFORCE = String(data.resourcePackEnforce);
  }

  if (data.enableRcon !== undefined) environment.ENABLE_RCON = String(data.enableRcon);
  if (data.rconPassword) environment.RCON_PASSWORD = data.rconPassword;
  if (data.rconPort) environment.RCON_PORT = data.rconPort;
  if (data.rconCmdsStartup) environment.RCON_CMDS_STARTUP = data.rconCmdsStartup;
  if (data.rconCmdsOnConnect) environment.RCON_CMDS_ON_CONNECT = data.rconCmdsOnConnect;
  if (data.rconCmdsFirstConnect) {
    environment.RCON_CMDS_FIRST_CONNECT = data.rconCmdsFirstConnect;
  }
  if (data.rconCmdsOnDisconnect) {
    environment.RCON_CMDS_ON_DISCONNECT = data.rconCmdsOnDisconnect;
  }
  if (data.rconCmdsLastDisconnect) {
    environment.RCON_CMDS_LAST_DISCONNECT = data.rconCmdsLastDisconnect;
  }

  if (data.enableQuery !== undefined) environment.ENABLE_QUERY = String(data.enableQuery);
  if (data.queryPort) environment.QUERY_PORT = data.queryPort;

  if (data.enableAutopause) environment.ENABLE_AUTOPAUSE = String(data.enableAutopause);
  if (data.autopauseTimeoutEst) environment.AUTOPAUSE_TIMEOUT_EST = data.autopauseTimeoutEst;
  if (data.autopauseTimeoutInit) environment.AUTOPAUSE_TIMEOUT_INIT = data.autopauseTimeoutInit;
  if (data.autopauseTimeoutKn) environment.AUTOPAUSE_TIMEOUT_KN = data.autopauseTimeoutKn;
  if (data.autopausePeriod) environment.AUTOPAUSE_PERIOD = data.autopausePeriod;
  if (data.autopauseKnockInterface) {
    environment.AUTOPAUSE_KNOCK_INTERFACE = data.autopauseKnockInterface;
  }

  if (data.enableAutostop) environment.ENABLE_AUTOSTOP = String(data.enableAutostop);
  if (data.autostopTimeoutEst) environment.AUTOSTOP_TIMEOUT_EST = data.autostopTimeoutEst;
  if (data.autostopTimeoutInit) environment.AUTOSTOP_TIMEOUT_INIT = data.autostopTimeoutInit;
  if (data.autostopPeriod) environment.AUTOSTOP_PERIOD = data.autostopPeriod;

  if (data.plugins) environment.PLUGINS = data.plugins;
  if (data.removeOldPlugins) environment.REMOVE_OLD_PLUGINS = String(data.removeOldPlugins);
  if (data.spigetResources) environment.SPIGET_RESOURCES = data.spigetResources;
  if (data.paperBuild) environment.PAPER_BUILD = data.paperBuild;

  if (data.type === "CUSTOM" && data.customJarUrl) {
    environment.CUSTOM_SERVER = data.customJarUrl;
    environment.VERSION = "";
  }

  if (data.timezone) environment.TZ = data.timezone;
  if (data.uid) environment.UID = data.uid;
  if (data.gid) environment.GID = data.gid;
  if (data.stopDuration) environment.STOP_DURATION = data.stopDuration;
  if (data.serverIcon) environment.ICON = data.serverIcon;

  environment.EULA = String(data.eula);
  environment.TYPE = data.type;
  if (data.type !== "CUSTOM" && data.version) {
    environment.VERSION = data.version;
  }
  if (data.type === "CUSTOM" && !data.customJarUrl) {
    throw new Error("Custom jar URL is required for custom servers");
  }

  return environment;
};

export const filterCustomEnvironmentVariables = (
  environmentVariables?: EnvironmentVariable[]
): EnvVar[] => {
  return (environmentVariables ?? [])
    .filter(({ key }) => !MANAGED_ENVIRONMENT_KEYS.has(key))
    .map(({ key, value }) => ({ key, value }));
};

export const toCommonServerRequestFields = (data: ServerFormData): CommonServerRequestFields => {
  const environment = toManagedEnvironmentVariables(data);
  for (const { key, value } of data.envVars) {
    if (key && value) {
      environment[key] = value;
    }
  }

  return {
    description: data.description.trim() || null,
    listen_port: Number(data.listenPort),
    service_type: data.serviceType,
    node_port: data.serviceType === "NODE_PORT" && data.nodePort ? Number(data.nodePort) : null,
    env_variables: Object.entries(environment).map(([key, value]) => ({ key, value })),
    memory: data.memoryLimit ? Number(data.memoryLimit) : undefined,
    memory_request: data.memoryRequest ? Number(data.memoryRequest) : undefined,
    cpu_request: data.cpuRequest || undefined,
    cpu_limit: data.cpuLimit || undefined,
    jar_type: data.type === "CUSTOM" ? "VANILLA" : data.type,
    minecraft_version: data.type === "CUSTOM" ? undefined : data.version || "LATEST",
    jvm_opts: data.jvmOpts || undefined,
    use_aikar_flags: data.useAikarFlags || undefined,
    use_meowice_flags: data.useMeowiceFlags || undefined,
    difficulty: toApiDifficulty(data.difficulty),
    game_mode: toApiMode(data.mode),
    max_players: data.maxPlayers ? Number(data.maxPlayers) : undefined,
    pvp: data.pvp,
    online_mode: data.onlineMode,
    motd: data.motd,
    level_seed: data.levelSeed,
    level_type: data.levelType,
  };
};

export const toInitialServerFormData = (server: NormalServer): Partial<ServerFormData> => {
  const environment = Object.fromEntries(
    server.env_variables.map(({ key, value }) => [key, value])
  );

  return {
    id: server.id,
    description: server.description || "",
    memoryLimit: String(server.memory || 2048),
    memoryRequest: String(server.memory_request ?? 1024),
    cpuRequest: server.cpu_request || "500m",
    cpuLimit: server.cpu_limit || "2",
    type: normalizeServerType(environment.TYPE || server.jar_type),
    version: environment.VERSION || server.minecraft_version || "",
    customJarUrl: environment.CUSTOM_SERVER || undefined,
    eula: environment.EULA === "true",
    listenPort: String(server.listen_port || 25565),
    serviceType: normalizeServiceType(server.service_type),
    nodePort: server.node_port ? String(server.node_port) : undefined,

    motd: environment.MOTD || server.motd || undefined,
    difficulty: normalizeDifficulty(environment.DIFFICULTY || server.difficulty),
    mode: normalizeMode(environment.MODE || server.game_mode),
    maxPlayers: environment.MAX_PLAYERS || String(server.max_players || 20),
    pvp: environment.PVP ? environment.PVP === "true" : (server.pvp ?? true),
    onlineMode: environment.ONLINE_MODE
      ? environment.ONLINE_MODE === "true"
      : (server.online_mode ?? true),
    allowFlight: environment.ALLOW_FLIGHT === "true",
    enableCommandBlock: environment.ENABLE_COMMAND_BLOCK === "true",
    spawnProtection: environment.SPAWN_PROTECTION || "16",
    viewDistance: environment.VIEW_DISTANCE || "10",
    simulationDistance: environment.SIMULATION_DISTANCE || "10",

    levelName: environment.LEVEL || "world",
    levelSeed: environment.SEED || server.level_seed || undefined,
    levelType: environment.LEVEL_TYPE || server.level_type || undefined,
    generatorSettings: environment.GENERATOR_SETTINGS || undefined,
    hardcore: environment.HARDCORE === "true",
    spawnAnimals: environment.SPAWN_ANIMALS !== "false",
    spawnMonsters: environment.SPAWN_MONSTERS !== "false",
    spawnNpcs: environment.SPAWN_NPCS !== "false",

    enableWhitelist: environment.ENABLE_WHITELIST === "true",
    whitelist: environment.WHITELIST || undefined,
    whitelistFile: environment.WHITELIST_FILE || undefined,
    ops: environment.OPS || undefined,
    opsFile: environment.OPS_FILE || undefined,

    useAikarFlags: environment.USE_AIKAR_FLAGS === "true" || server.use_aikar_flags || false,
    useMeowiceFlags: environment.USE_MEOWICE_FLAGS === "true" || server.use_meowice_flags || false,
    jvmOpts: environment.JVM_OPTS || server.jvm_opts || undefined,
    jvmXxOpts: environment.JVM_XX_OPTS || undefined,
    jvmDdOpts: environment.JVM_DD_OPTS || undefined,
    enableJmx: environment.ENABLE_JMX === "true",

    resourcePack: environment.RESOURCE_PACK || undefined,
    resourcePackSha1: environment.RESOURCE_PACK_SHA1 || undefined,
    resourcePackEnforce: environment.RESOURCE_PACK_ENFORCE === "true",

    enableRcon: environment.ENABLE_RCON !== "false",
    rconPassword: environment.RCON_PASSWORD || undefined,
    rconPort: environment.RCON_PORT || "25575",
    rconCmdsStartup: environment.RCON_CMDS_STARTUP || undefined,
    rconCmdsOnConnect: environment.RCON_CMDS_ON_CONNECT || undefined,
    rconCmdsFirstConnect: environment.RCON_CMDS_FIRST_CONNECT || undefined,
    rconCmdsOnDisconnect: environment.RCON_CMDS_ON_DISCONNECT || undefined,
    rconCmdsLastDisconnect: environment.RCON_CMDS_LAST_DISCONNECT || undefined,

    enableQuery: environment.ENABLE_QUERY === "true",
    queryPort: environment.QUERY_PORT || "25565",

    enableAutopause: environment.ENABLE_AUTOPAUSE === "true",
    autopauseTimeoutEst: environment.AUTOPAUSE_TIMEOUT_EST || "3600",
    autopauseTimeoutInit: environment.AUTOPAUSE_TIMEOUT_INIT || "600",
    autopauseTimeoutKn: environment.AUTOPAUSE_TIMEOUT_KN || "120",
    autopausePeriod: environment.AUTOPAUSE_PERIOD || "10",
    autopauseKnockInterface: environment.AUTOPAUSE_KNOCK_INTERFACE || "eth0",

    enableAutostop: environment.ENABLE_AUTOSTOP === "true",
    autostopTimeoutEst: environment.AUTOSTOP_TIMEOUT_EST || "3600",
    autostopTimeoutInit: environment.AUTOSTOP_TIMEOUT_INIT || "1800",
    autostopPeriod: environment.AUTOSTOP_PERIOD || "10",

    plugins: environment.PLUGINS || undefined,
    removeOldPlugins: environment.REMOVE_OLD_PLUGINS === "true",
    spigetResources: environment.SPIGET_RESOURCES || undefined,
    paperBuild: environment.PAPER_BUILD || undefined,

    timezone: environment.TZ || "UTC",
    uid: environment.UID || "1000",
    gid: environment.GID || "1000",
    stopDuration: environment.STOP_DURATION || "60",
    serverIcon: environment.ICON || undefined,
    envVars: filterCustomEnvironmentVariables(server.env_variables),
  };
};
