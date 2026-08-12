import type { EnvVariable, ReverseProxyWithEnvVars } from "@minikura/db";
import type {
  ReverseProxyCreateInput,
  ReverseProxyUpdateInput,
} from "../../domain/repositories/reverse-proxy.repository";

export interface IReverseProxyService {
  getAllReverseProxies(omitSensitive?: boolean): Promise<ReverseProxyWithEnvVars[]>;
  getReverseProxyById(id: string, omitSensitive?: boolean): Promise<ReverseProxyWithEnvVars>;
  createReverseProxy(input: ReverseProxyCreateInput): Promise<ReverseProxyWithEnvVars>;
  updateReverseProxy(id: string, input: ReverseProxyUpdateInput): Promise<ReverseProxyWithEnvVars>;
  deleteReverseProxy(id: string): Promise<void>;
  setEnvVariable(proxyId: string, key: string, value: string): Promise<void>;
  getEnvVariables(proxyId: string): Promise<EnvVariable[]>;
  deleteEnvVariable(proxyId: string, key: string): Promise<void>;
  getConnectionInfo(proxyId: string): Promise<unknown>;
}
