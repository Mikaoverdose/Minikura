"use client";

import type {
  CustomResourceSummary,
  DeploymentInfo,
  K8sConfigMapSummary,
  K8sServiceSummary,
  PodInfo,
  StatefulSetInfo,
} from "@minikura/api";
import { AlertCircle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { K8sPhaseBadge } from "@/components/k8s/k8s-phase-badge";
import {
  type K8sResourceColumn,
  K8sResourceTableCard,
} from "@/components/k8s/k8s-resource-table-card";
import { PageHeader, PageShell, StatePanel } from "@/components/page-layout";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useK8sResources } from "@/hooks/use-k8s-resources";

const secondaryCell = "text-sm text-muted-foreground";

const podColumns = [
  { header: "Name", render: (pod) => pod.name, className: "font-medium" },
  { header: "Status", render: (pod) => <K8sPhaseBadge phase={pod.status} /> },
  { header: "Ready", render: (pod) => pod.ready },
  { header: "Restarts", render: (pod) => pod.restarts },
  { header: "Node", render: (pod) => pod.nodeName || "-", className: secondaryCell },
  { header: "Age", render: (pod) => pod.age, className: secondaryCell },
] satisfies readonly K8sResourceColumn<PodInfo>[];

const deploymentColumns = [
  { header: "Name", render: (deployment) => deployment.name, className: "font-medium" },
  { header: "Ready", render: (deployment) => deployment.ready },
  {
    header: "Up-to-date",
    render: (deployment) => deployment.upToDate ?? deployment.updated,
  },
  { header: "Available", render: (deployment) => deployment.available ?? 0 },
  { header: "Age", render: (deployment) => deployment.age, className: secondaryCell },
] satisfies readonly K8sResourceColumn<DeploymentInfo>[];

const statefulSetColumns = [
  { header: "Name", render: (statefulSet) => statefulSet.name, className: "font-medium" },
  { header: "Ready", render: (statefulSet) => statefulSet.ready },
  { header: "Desired", render: (statefulSet) => statefulSet.desired },
  { header: "Current", render: (statefulSet) => statefulSet.current },
  { header: "Age", render: (statefulSet) => statefulSet.age, className: secondaryCell },
] satisfies readonly K8sResourceColumn<StatefulSetInfo>[];

const serviceColumns = [
  { header: "Name", render: (service) => service.name, className: "font-medium" },
  {
    header: "Type",
    render: (service) => <Badge variant="outline">{service.type}</Badge>,
  },
  {
    header: "Cluster IP",
    render: (service) => service.clusterIP,
    className: secondaryCell,
  },
  {
    header: "External IP",
    render: (service) => service.externalIP,
    className: secondaryCell,
  },
  { header: "Ports", render: (service) => service.ports, className: secondaryCell },
  { header: "Age", render: (service) => service.age, className: secondaryCell },
] satisfies readonly K8sResourceColumn<K8sServiceSummary>[];

const configMapColumns = [
  { header: "Name", render: (configMap) => configMap.name, className: "font-medium" },
  { header: "Data Keys", render: (configMap) => configMap.data },
  { header: "Age", render: (configMap) => configMap.age, className: secondaryCell },
] satisfies readonly K8sResourceColumn<K8sConfigMapSummary>[];

const customResourceColumns = [
  { header: "Name", render: (resource) => resource.name, className: "font-medium" },
  {
    header: "Status",
    render: (resource) => <K8sPhaseBadge phase={resource.status?.phase} />,
  },
  { header: "Age", render: (resource) => resource.age, className: secondaryCell },
] satisfies readonly K8sResourceColumn<CustomResourceSummary>[];

export default function K8sResourcesPage() {
  const {
    status,
    pods,
    deployments,
    statefulSets,
    services,
    configMaps,
    minecraftServers,
    reverseProxyServers,
    initialLoading,
    refreshing,
    error,
  } = useK8sResources();

  const pageHeader = (
    <PageHeader
      eyebrow="Kubernetes"
      title="Resources"
      description="Inspect workload, networking, configuration, and custom resources."
      actions={
        status?.initialized ? (
          <div className="flex items-center gap-3 border border-border bg-card px-4 py-3">
            <CheckCircle2 className="size-5 text-primary" />
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Cluster link
              </p>
              <span className="text-sm font-bold">Connected</span>
            </div>
            {refreshing && <RefreshCw className="ml-2 size-3 animate-spin text-muted-foreground" />}
          </div>
        ) : undefined
      }
    />
  );

  if (initialLoading && !status) {
    return (
      <PageShell>
        {pageHeader}
        <StatePanel loading title="Loading Kubernetes resources..." className="h-64" />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        {pageHeader}
        <StatePanel
          title="Unable to load Kubernetes resources"
          description={error}
          icon={<XCircle className="size-6" />}
          tone="error"
        />
      </PageShell>
    );
  }

  if (!status?.initialized) {
    return (
      <PageShell>
        {pageHeader}
        <StatePanel
          title="Kubernetes not connected"
          icon={<AlertCircle className="size-6 text-warning" />}
          description={
            <>
              <p>Ensure the operator is running with a valid Kubernetes configuration.</p>
              <p className="mt-2">
                Set{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  KUBERNETES_SKIP_TLS_VERIFY=true
                </code>{" "}
                when using self-signed certificates.
              </p>
            </>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {pageHeader}

      <Tabs defaultValue="pods" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="pods">Pods ({pods.length})</TabsTrigger>
          <TabsTrigger value="deployments">Deployments ({deployments.length})</TabsTrigger>
          <TabsTrigger value="statefulsets">StatefulSets ({statefulSets.length})</TabsTrigger>
          <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
          <TabsTrigger value="configmaps">ConfigMaps ({configMaps.length})</TabsTrigger>
          <TabsTrigger value="minecraft">Minecraft Servers ({minecraftServers.length})</TabsTrigger>
          <TabsTrigger value="reverseproxy">
            Reverse Proxies ({reverseProxyServers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pods" className="space-y-4">
          <K8sResourceTableCard
            title="Pods"
            description="Running pods in the minikura namespace"
            emptyMessage="No pods found"
            resources={pods}
            columns={podColumns}
          />
        </TabsContent>

        <TabsContent value="deployments" className="space-y-4">
          <K8sResourceTableCard
            title="Deployments"
            description="Deployments in the minikura namespace"
            emptyMessage="No deployments found"
            resources={deployments}
            columns={deploymentColumns}
          />
        </TabsContent>

        <TabsContent value="statefulsets" className="space-y-4">
          <K8sResourceTableCard
            title="StatefulSets"
            description="StatefulSets in the minikura namespace"
            emptyMessage="No statefulsets found"
            resources={statefulSets}
            columns={statefulSetColumns}
          />
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <K8sResourceTableCard
            title="Services"
            description="Services in the minikura namespace"
            emptyMessage="No services found"
            resources={services}
            columns={serviceColumns}
          />
        </TabsContent>

        <TabsContent value="configmaps" className="space-y-4">
          <K8sResourceTableCard
            title="ConfigMaps"
            description="ConfigMaps in the minikura namespace"
            emptyMessage="No configmaps found"
            resources={configMaps}
            columns={configMapColumns}
          />
        </TabsContent>

        <TabsContent value="minecraft" className="space-y-4">
          <K8sResourceTableCard
            title="Minecraft Servers"
            description="Custom Minecraft server resources"
            emptyMessage="No Minecraft servers found"
            resources={minecraftServers}
            columns={customResourceColumns}
          />
        </TabsContent>

        <TabsContent value="reverseproxy" className="space-y-4">
          <K8sResourceTableCard
            title="Reverse Proxy Servers"
            description="Custom reverse proxy server resources"
            emptyMessage="No reverse proxy servers found"
            resources={reverseProxyServers}
            columns={customResourceColumns}
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
