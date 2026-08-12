import type {
  EnvVariable as DbEnvVariable,
  ReverseProxyWithEnvVars,
  ServerWithEnvVars,
} from "@minikura/db";

export type EnvVariable = DbEnvVariable;

export type NormalServer = ServerWithEnvVars;

export type ReverseProxyServer = ReverseProxyWithEnvVars;

export type K8sResource = {
  name: string;
  kind: string;
  namespace?: string;
  age: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  [key: string]: unknown;
};

export type K8sServiceSummary = {
  name: string;
  namespace?: string;
  type?: string;
  clusterIP?: string | null;
  externalIP?: string;
  ports?: string;
  age: string;
  labels?: Record<string, string>;
};

export type K8sConfigMapSummary = {
  name: string;
  namespace?: string;
  data: number;
  age: string;
  labels?: Record<string, string>;
};

export type K8sIngressSummary = {
  name: string;
  namespace?: string;
  className?: string | null;
  hosts: string;
  address: string;
  age: string;
  labels?: Record<string, string>;
};

export type K8sServicePort = {
  name?: string | null;
  protocol?: string | null;
  port?: number;
  targetPort?: number | string;
  nodePort?: number | null;
};

export type K8sServiceInfo = {
  name?: string;
  namespace?: string;
  type?: string;
  clusterIP?: string | null;
  externalIPs: string[];
  loadBalancerIP: string | null;
  loadBalancerHostname: string | null;
  ports: K8sServicePort[];
  selector?: Record<string, string>;
};

export type K8sNodeSummary = {
  name?: string;
  status: string;
  roles: string;
  age: string;
  version?: string;
  internalIP?: string;
  externalIP?: string;
  hostname?: string;
};

export type CustomResourceSummary = {
  name?: string;
  namespace?: string;
  age: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  spec?: Record<string, unknown>;
  status?: { phase?: string; [key: string]: unknown };
};

export type K8sStatus = {
  initialized: boolean;
};

export type PodInfo = {
  name: string;
  namespace?: string;
  status: string;
  ready: string;
  restarts: number;
  age?: string;
  containers?: string[];
  nodeName?: string;
  ip?: string;
  labels?: Record<string, string>;
};

export type PodCondition = {
  type?: string;
  status?: string;
  lastTransitionTime?: string;
};

export type PodContainerStatus = {
  name?: string;
  ready?: boolean;
  restartCount?: number;
  state?: Record<string, unknown>;
};

export type PodDetails = PodInfo & {
  conditions?: PodCondition[];
  containerStatuses?: PodContainerStatus[];
};

export type StatefulSetInfo = {
  name: string;
  ready: string;
  desired: number;
  current: number;
  updated: number;
  age: string;
  labels?: Record<string, string>;
};

export type DeploymentInfo = {
  name: string;
  ready: string;
  desired: number;
  current: number;
  updated: number;
  upToDate?: number;
  available?: number;
  age: string;
  labels?: Record<string, string>;
};

export type ConnectionInfo = {
  type: string;
  connectionString?: string | null;
  note?: string | null;
  ip?: string;
  port?: number | null;
  nodeIP?: string;
  nodePort?: number;
  externalIP?: string;
};

export type CreateServerRequest = {
  id: string;
  type: "STATEFUL" | "STATELESS";
  description?: string | null;
  listen_port: number;
  service_type?: string;
  node_port?: number | null;
  env_variables?: EnvVariable[];
  memory?: number;
  memory_request?: number;
  cpu_request?: string;
  cpu_limit?: string;
  jar_type?: string;
  minecraft_version?: string;
  jvm_opts?: string;
  use_aikar_flags?: boolean;
  use_meowice_flags?: boolean;
  difficulty?: string;
  game_mode?: string;
  max_players?: number;
  pvp?: boolean;
  online_mode?: boolean;
  motd?: string | null;
  level_seed?: string | null;
  level_type?: string | null;
};

export type UpdateServerRequest = {
  description?: string | null;
  listen_port?: number;
  service_type?: string;
  node_port?: number | null;
  env_variables?: EnvVariable[];
  memory?: number;
  memory_request?: number;
  cpu_request?: string;
  cpu_limit?: string;
  jar_type?: string;
  minecraft_version?: string;
  jvm_opts?: string;
  use_aikar_flags?: boolean;
  use_meowice_flags?: boolean;
  difficulty?: string;
  game_mode?: string;
  max_players?: number;
  pvp?: boolean;
  online_mode?: boolean;
  motd?: string | null;
  level_seed?: string | null;
  level_type?: string | null;
};
