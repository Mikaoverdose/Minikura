import { isUserSuspended } from "@minikura/db";
import { Elysia } from "elysia";
import { auth } from "./auth";

async function getSessionFromHeaders(headers: Headers | Record<string, string>) {
  const headersObj =
    headers instanceof Headers ? headers : new Headers(headers as Record<string, string>);

  return auth.api.getSession({
    headers: headersObj,
  });
}

export const authPlugin = new Elysia({ name: "auth" }).derive(
  { as: "scoped" },
  async ({ request }) => {
    const session = await getSessionFromHeaders(request.headers);

    if (
      session?.user &&
      ((session.user as unknown as { banned?: boolean }).banned === true ||
        isUserSuspended(
          session.user as unknown as Pick<
            { isSuspended: boolean; suspendedUntil: Date | null },
            "isSuspended" | "suspendedUntil"
          >
        ))
    ) {
      return {
        user: null,
        session: null,
        isAuthenticated: false,
        isSuspended: true,
      };
    }

    return {
      user: session?.user || null,
      session: session?.session || null,
      isAuthenticated: Boolean(session?.user),
      isSuspended: false,
    };
  }
);

export type AuthPlugin = typeof authPlugin;
