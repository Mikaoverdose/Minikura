import { prisma } from "@minikura/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, openAPI } from "better-auth/plugins";

const webUrl = process.env.WEB_URL || "http://localhost:3001";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    usePlural: false,
  }),
  emailAndPassword: { enabled: true },
  plugins: [admin(), openAPI()],
  trustedOrigins: [webUrl],
  basePath: "/auth",
  advanced: {
    useSecureCookies: webUrl.startsWith("https://"),
  },
});

export type Auth = typeof auth;
