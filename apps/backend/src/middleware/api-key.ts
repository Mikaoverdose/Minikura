import { prisma } from "@minikura/db";

export async function findApiKeyOwner(apiKey: string) {
  if (!apiKey) return null;

  const [server, proxy] = await Promise.all([
    prisma.server.findUnique({ where: { api_key: apiKey }, select: { id: true } }),
    prisma.reverseProxyServer.findUnique({ where: { api_key: apiKey }, select: { id: true } }),
  ]);

  if (server) return { kind: "server" as const, id: server.id };
  if (proxy) return { kind: "reverse-proxy" as const, id: proxy.id };
  return null;
}

export function bearerToken(header: string | null): string {
  if (!header?.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
}
