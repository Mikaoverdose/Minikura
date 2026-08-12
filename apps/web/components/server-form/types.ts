import type { GameMode, ServiceType as PrismaServiceType, ServerDifficulty } from "@minikura/db";

export type ServerType = "VANILLA" | "PAPER" | "SPIGOT" | "PURPUR" | "FABRIC" | "CUSTOM";
export type ServiceType = PrismaServiceType;
export type Difficulty = ServerDifficulty;
export type Mode = GameMode;

export interface EnvVar {
  id?: string;
  key: string;
  value: string;
}

export interface ServerFormData {
  id: string;
  description: string;
  memoryLimit: string;
  memoryRequest: string;
  cpuRequest: string;
  cpuLimit: string;
  type: ServerType;
  version?: string;
  customJarUrl?: string;
  eula: boolean;
  listenPort: string;
  serviceType: ServiceType;
  nodePort?: string;
  motd?: string;
  difficulty: "peaceful" | "easy" | "normal" | "hard";
  mode: "survival" | "creative" | "adventure" | "spectator";
  maxPlayers: string;
  pvp: boolean;
  onlineMode: boolean;
  allowFlight: boolean;
  enableCommandBlock: boolean;
  spawnProtection: string;
  viewDistance: string;
  simulationDistance: string;
  levelName: string;
  levelSeed?: string;
  levelType?: string;
  generatorSettings?: string;
  hardcore: boolean;
  spawnAnimals: boolean;
  spawnMonsters: boolean;
  spawnNpcs: boolean;
  enableWhitelist: boolean;
  whitelist?: string;
  whitelistFile?: string;
  ops?: string;
  opsFile?: string;
  useAikarFlags: boolean;
  useMeowiceFlags: boolean;
  jvmOpts?: string;
  jvmXxOpts?: string;
  jvmDdOpts?: string;
  resourcePack?: string;
  resourcePackSha1?: string;
  resourcePackEnforce: boolean;
  enableRcon: boolean;
  rconPassword?: string;
  rconPort: string;
  rconCmdsStartup?: string;
  rconCmdsOnConnect?: string;
  rconCmdsFirstConnect?: string;
  rconCmdsOnDisconnect?: string;
  rconCmdsLastDisconnect?: string;
  enableQuery: boolean;
  queryPort: string;
  enableAutopause: boolean;
  autopauseTimeoutEst: string;
  autopauseTimeoutInit: string;
  autopauseTimeoutKn: string;
  autopausePeriod: string;
  autopauseKnockInterface: string;
  enableAutostop: boolean;
  autostopTimeoutEst: string;
  autostopTimeoutInit: string;
  autostopPeriod: string;
  plugins?: string;
  removeOldPlugins: boolean;
  spigetResources?: string;
  paperBuild?: string;
  timezone: string;
  uid: string;
  gid: string;
  enableJmx: boolean;
  stopDuration: string;
  serverIcon?: string;
  envVars: EnvVar[];
}

export type UpdateServerField = <K extends keyof ServerFormData>(
  key: K,
  value: ServerFormData[K],
) => void;

export interface ServerFormPanelProps {
  formData: ServerFormData;
  updateField: UpdateServerField;
}
