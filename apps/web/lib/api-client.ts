import { treaty } from "@elysiajs/eden";
import type { App } from "@minikura/backend";

const baseUrl =
  typeof window === "undefined"
    ? process.env.API_URL || "http://localhost:3000"
    : window.location.origin;

export const api = treaty<App>(baseUrl, {
  fetch: {
    credentials: "include",
  },
});

export type Api = typeof api;
