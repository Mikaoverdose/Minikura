"use client";

import type { CreateServerRequest } from "@minikura/api";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ServerForm, type ServerFormData } from "@/components/server-form";
import { PageHeader, PageShell } from "@/components/page-layout";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { toCommonServerRequestFields } from "@/lib/server-form/mappings";

export default function CreateServerPage() {
  const router = useRouter();

  const handleSubmit = async (data: ServerFormData) => {
    const payload: CreateServerRequest = {
      id: data.id.trim(),
      type: "STATEFUL",
      ...toCommonServerRequestFields(data),
    };

    const response = await api.api.servers.post(payload);

    if (response.error) {
      const errorMsg =
        typeof response.error === "object" &&
        response.error &&
        "value" in response.error &&
        typeof response.error.value === "object" &&
        response.error.value &&
        "message" in response.error.value
          ? String(response.error.value.message)
          : "Failed to create server";
      throw new Error(errorMsg);
    }

    router.push("/dashboard/servers");
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Compute / Provision"
        title="Create Server"
        description="Define the runtime, world, resources, and network contract."
        leading={
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/servers")}>
            <ArrowLeft className="size-5" />
          </Button>
        }
        className="flex-row items-center justify-start"
      />

      <SectionCard
        title="Server Configuration"
        description="Complete configuration for the itzg/minecraft-server workload."
      >
        <ServerForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/dashboard/servers")}
          submitLabel="Create Server"
        />
      </SectionCard>
    </PageShell>
  );
}
