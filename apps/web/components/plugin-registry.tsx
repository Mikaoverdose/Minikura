"use client";

import { HardDriveUpload, LoaderCircle, Package, PackageSearch, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader, PageShell, StatePanel } from "@/components/page-layout";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";

type Project = {
  provider: "MODRINTH" | "HANGAR";
  projectId: string;
  name: string;
  description: string;
  iconUrl: string | null;
  downloads: number;
  license: string | null;
  author: string;
  categories: string[];
  minecraftVersions: string[];
  updatedAt: string | null;
  projectUrl: string;
};

type Version = {
  provider: "MODRINTH" | "HANGAR";
  projectId: string;
  projectName?: string;
  versionId: string;
  version: string;
  platform: "PAPER" | "FOLIA" | "VELOCITY";
  minecraftVersions: string[];
  filename: string;
  size: number;
  sha256: string | null;
  downloadUrl: string;
  license: string | null;
  description?: string;
  author?: string;
  iconUrl?: string | null;
  projectUrl?: string;
  categories?: string[];
  updatedAt?: string | null;
};

type Artifact = {
  id: string;
  provider: string;
  name: string;
  version: string;
  filename: string;
  description: string | null;
  author: string | null;
  icon_url: string | null;
  project_url: string | null;
  categories: string[];
  server_plugins: Array<{ server_id: string }>;
};

export function PluginRegistry() {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Artifact | null>(null);
  const platform = "PAPER" as const;

  const loadArtifacts = async () => {
    const response = await api.api.registry.artifacts.get();
    if (response.error) throw response.error;
    setArtifacts((response.data ?? []) as Artifact[]);
  };

  useEffect(() => {
    void api.api.registry.artifacts
      .get()
      .then(({ data, error: responseError }) => {
        if (responseError) throw responseError;
        setArtifacts((data ?? []) as Artifact[]);
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Failed to load registry")
      );
  }, []);

  useEffect(() => {
    if (projects.length > 0) return;
    void api.api.registry.search
      .get({
        query: {
          query: "",
          platform,
        },
      })
      .then(({ data, error: responseError }) => {
        if (responseError) throw responseError;
        setProjects((data ?? []) as Project[]);
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Failed to load top plugins")
      );
  }, [platform, projects.length]);

  const search = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    setSelectedProject(null);
    setVersions([]);
    try {
      const response = await api.api.registry.search.get({
        query: {
          query,
          platform,
        },
      });
      if (response.error) throw response.error;
      setProjects((response.data ?? []) as Project[]);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  const selectProject = async (project: Project) => {
    setBusy(true);
    setError(null);
    setSelectedProject(project);
    try {
      const response = await api.api.registry.versions.get({
        query: {
          provider: project.provider,
          projectId: project.projectId,
          platform,
        },
      });
      if (response.error) throw response.error;
      setVersions((response.data ?? []) as Version[]);
    } catch (versionError) {
      setError(versionError instanceof Error ? versionError.message : "Failed to load versions");
    } finally {
      setBusy(false);
    }
  };

  const store = async (version: Version) => {
    setBusy(true);
    setError(null);
    try {
      const response = await api.api.registry.artifacts.post({
        ...version,
        projectName: selectedProject?.name,
        description: selectedProject?.description,
        author: selectedProject?.author,
        iconUrl: selectedProject?.iconUrl,
        projectUrl: selectedProject?.projectUrl,
        categories: selectedProject?.categories,
        updatedAt: selectedProject?.updatedAt,
      });
      if (response.error) throw response.error;
      await loadArtifacts();
    } catch (installError) {
      setError(installError instanceof Error ? installError.message : "Registry import failed");
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const response = await api.api.registry.artifacts.upload.post({ file });
      if (response.error) throw response.error;
      await loadArtifacts();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteArtifact = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      const response = await api.api.registry.library({ artifactId: deleteTarget.id }).delete();
      if (response.error) throw response.error;
      setDeleteTarget(null);
      await loadArtifacts();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete artifact");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Artifacts"
        title="Plugin Registry"
        description="Discover releases and maintain a global plugin artifact library. Assign plugins from a server's Mods/Plugins settings."
      />

      <Tabs defaultValue="discover" className="gap-5">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="discover">
            <PackageSearch className="size-4" /> Discover
          </TabsTrigger>
          <TabsTrigger value="library">
            <Package className="size-4" /> Library
            <span className="ml-1 rounded-full bg-background/15 px-1.5 py-0.5 text-[9px]">
              {artifacts.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover">
          <SectionCard
            title="Catalog"
            description="Browse Paper-compatible plugins from Modrinth and Hangar"
            icon={<PackageSearch className="size-5 text-primary" />}
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void search();
                    }
                  }}
                  placeholder="Search ViaVersion, LuckPerms, CoreProtect..."
                />
                <Button
                  type="button"
                  disabled={busy || !query.trim()}
                  onClick={() => void search()}
                >
                  {busy ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <PackageSearch className="size-4" />
                  )}
                  Search
                </Button>
              </div>

              {error && (
                <p className="border-l-2 border-destructive pl-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              {selectedProject ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="flex items-center gap-3">
                        {selectedProject.iconUrl ? (
                          <span
                            role="img"
                            aria-label={`${selectedProject.name} icon`}
                            className="size-12 rounded-sm border bg-cover bg-center"
                            style={{ backgroundImage: `url(${selectedProject.iconUrl})` }}
                          />
                        ) : (
                          <div className="grid size-12 place-items-center border bg-muted">
                            <Package className="size-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold">{selectedProject.name}</p>
                          <p className="text-xs text-muted-foreground">
                            by {selectedProject.author} ·{" "}
                            {selectedProject.downloads.toLocaleString()} downloads
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
                        {selectedProject.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Badge variant="outline">{selectedProject.provider}</Badge>
                        {selectedProject.license && (
                          <Badge variant="secondary">{selectedProject.license}</Badge>
                        )}
                        {selectedProject.categories.slice(0, 4).map((category) => (
                          <Badge key={category} variant="secondary">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <a href={selectedProject.projectUrl} target="_blank" rel="noreferrer">
                          Provider page
                        </a>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProject(null)}
                      >
                        Back
                      </Button>
                    </div>
                  </div>
                  {!busy && versions.length === 0 && (
                    <StatePanel title="No compatible release found" className="min-h-32" />
                  )}
                  {versions.slice(0, 15).map((version) => (
                    <div
                      key={`${version.provider}-${version.versionId}-${version.platform}`}
                      className="flex items-center justify-between gap-3 border bg-background px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold">{version.version}</p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          {version.filename} · {(version.size / 1024 / 1024).toFixed(1)} MiB
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void store(version)}
                        >
                          Store
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : projects.length > 0 ? (
                <div className="space-y-3">
                  {!query.trim() && (
                    <div className="flex items-end justify-between border-b pb-3">
                      <div>
                        <p className="font-bold">Top plugins</p>
                        <p className="text-xs text-muted-foreground">
                          Popular projects ranked by downloads
                        </p>
                      </div>
                      <Badge variant="outline">{projects.length} projects</Badge>
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    {projects.map((project, index) => (
                      <button
                        type="button"
                        key={`${project.provider}-${project.projectId}`}
                        className="group relative space-y-3 border bg-background p-4 text-left transition-colors hover:border-primary"
                        onClick={() => void selectProject(project)}
                      >
                        {!query.trim() && (
                          <span className="absolute right-3 top-3 font-mono text-2xl font-black text-muted-foreground/20">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        )}
                        <div className="flex items-start gap-3 pr-8">
                          {project.iconUrl ? (
                            <span
                              role="img"
                              aria-label={`${project.name} icon`}
                              className="size-12 shrink-0 rounded-sm border bg-cover bg-center"
                              style={{ backgroundImage: `url(${project.iconUrl})` }}
                            />
                          ) : (
                            <div className="grid size-12 shrink-0 place-items-center border bg-muted">
                              <Package className="size-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-bold group-hover:text-primary">
                              {project.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              by {project.author}
                            </p>
                          </div>
                        </div>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {project.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline">{project.provider}</Badge>
                          {project.categories.slice(0, 2).map((category) => (
                            <Badge key={category} variant="secondary">
                              {category}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex justify-between gap-3 font-mono text-[10px] uppercase text-muted-foreground">
                          <span>{project.downloads.toLocaleString()} downloads</span>
                          <span>{project.license ?? "License unspecified"}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <StatePanel
                  title="Search the public catalog"
                  description="Results combine Modrinth and PaperMC Hangar."
                  icon={<Package className="size-7" />}
                  className="min-h-56"
                />
              )}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="library" className="space-y-6">
          <SectionCard
            title="Artifact Library"
            description="Provider releases and private JARs stored independently of server deployments."
            icon={<Package className="size-5 text-primary" />}
            headerAction={
              <Button type="button" size="sm" asChild disabled={busy}>
                <label className="cursor-pointer">
                  <HardDriveUpload className="size-4" /> Upload private JAR
                  <input
                    type="file"
                    accept=".jar,application/java-archive"
                    className="sr-only"
                    onChange={(event) => void upload(event.target.files?.[0])}
                  />
                </label>
              </Button>
            }
          >
            {artifacts.length === 0 ? (
              <StatePanel
                title="Your library is empty"
                description="Store a release from Discover or upload a private plugin JAR."
                icon={<Package className="size-7" />}
                className="min-h-52"
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {artifacts.map((artifact) => (
                  <article
                    key={artifact.id}
                    className="flex min-h-40 flex-col justify-between gap-4 border bg-background p-4 transition-colors hover:border-foreground/40"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        {artifact.icon_url ? (
                          <span
                            role="img"
                            aria-label={`${artifact.name} icon`}
                            className="size-10 shrink-0 rounded-sm border bg-cover bg-center"
                            style={{ backgroundImage: `url(${artifact.icon_url})` }}
                          />
                        ) : (
                          <div className="grid size-10 shrink-0 place-items-center border bg-muted">
                            <Package className="size-4" />
                          </div>
                        )}
                        <Badge variant={artifact.provider === "UPLOAD" ? "secondary" : "outline"}>
                          {artifact.provider === "UPLOAD" ? "Private" : artifact.provider}
                        </Badge>
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold">{artifact.name}</h3>
                        {artifact.author && (
                          <p className="truncate text-xs text-muted-foreground">
                            by {artifact.author}
                          </p>
                        )}
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          {artifact.version} · {artifact.filename}
                        </p>
                      </div>
                      {artifact.description && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {artifact.description}
                        </p>
                      )}
                      {artifact.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {artifact.categories.slice(0, 3).map((category) => (
                            <Badge key={category} variant="secondary">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Deployed to {artifact.server_plugins.length}{" "}
                        {artifact.server_plugins.length === 1 ? "server" : "servers"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t pt-3">
                      <span className="text-xs text-muted-foreground">
                        Assign from Create/Edit Server
                      </span>
                      {artifact.project_url && (
                        <Button type="button" variant="ghost" size="sm" asChild>
                          <a href={artifact.project_url} target="_blank" rel="noreferrer">
                            Source
                          </a>
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        onClick={() => setDeleteTarget(artifact)}
                        aria-label={`Delete ${artifact.name} from registry`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Plugin Artifact"
        description={
          <>
            Delete <strong>{deleteTarget?.name}</strong> from the global registry? This removes it
            from every server and permanently deletes private S3 content.
          </>
        }
        confirmLabel="Delete Artifact"
        onConfirm={deleteArtifact}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </PageShell>
  );
}
