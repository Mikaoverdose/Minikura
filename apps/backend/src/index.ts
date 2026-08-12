import { dotenvLoad } from "dotenv-mono";

dotenvLoad();

import { node } from "@elysiajs/node";
import { Elysia } from "elysia";
import { logger } from "./infrastructure/logger";
import { auth } from "./middleware/auth";
import { authPlugin } from "./middleware/auth-plugin";
import { errorHandler } from "./middleware/error-handler";
import { bootstrapRoutes } from "./routes/bootstrap";
import { k8sRoutes } from "./routes/k8s";
import { reverseProxyRoutes } from "./routes/reverse-proxy";
import { serverRoutes } from "./routes/servers";
import { terminalRoutes } from "./routes/terminal";
import { userRoutes } from "./routes/users";

import "./infrastructure/event-handlers";
import { operatorResourceSync } from "./application/di-container";

operatorResourceSync.start();

const app = new Elysia({ adapter: node() })
  .use(errorHandler)
  .onRequest(({ set }) => {
    const origin = process.env.WEB_URL || "http://localhost:3001";
    set.headers["Access-Control-Allow-Origin"] = origin;
    set.headers["Access-Control-Allow-Credentials"] = "true";
    set.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
    set.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cookie";
  })
  .options("/*", () => new Response(null, { status: 204 }))
  .all("/auth/*", ({ request }) => auth.handler(request))
  .use(bootstrapRoutes)
  .use(authPlugin)
  .group("/api", (app) =>
    app.use(userRoutes).use(serverRoutes).use(reverseProxyRoutes).use(k8sRoutes).use(terminalRoutes)
  );

export type App = typeof app;

app.listen(3000, () => {
  logger.info({ port: 3000, url: "http://localhost:3000" }, "Backend API server started");
});
