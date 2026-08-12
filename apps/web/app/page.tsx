import { treaty } from "@elysiajs/eden";
import type { App } from "@minikura/backend";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const apiUrl = process.env.API_URL || "http://localhost:3000";
const api = treaty<App>(apiUrl);

export default async function HomePage() {
  const { data } = await api.bootstrap.status.get();

  if (data?.needsSetup) {
    redirect("/bootstrap");
  } else {
    redirect("/login");
  }
}
