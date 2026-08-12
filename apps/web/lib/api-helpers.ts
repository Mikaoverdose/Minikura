import { api } from "@/lib/api-client";

type ReverseProxyApi = {
  get: () => Promise<{ data?: unknown; error?: unknown }>;
  (params: {
    id: string;
  }): {
    delete: () => Promise<{ data?: unknown; error?: unknown }>;
    patch: (body: unknown) => Promise<{ data?: unknown; error?: unknown }>;
    "connection-info": { get: () => Promise<{ data?: unknown; error?: unknown }> };
  };
};

type UserSuspensionApi = {
  suspension: {
    patch: (body: {
      isSuspended: boolean;
      suspendedUntil: string | null;
    }) => Promise<{ error?: unknown }>;
  };
};

export const getReverseProxyApi = (): ReverseProxyApi => {
  const apiRoot = api.api as unknown as { "reverse-proxy": ReverseProxyApi };
  return apiRoot["reverse-proxy"];
};

export const getUserApi = (id: string): UserSuspensionApi => {
  return api.api.users({ id }) as unknown as UserSuspensionApi;
};
