import { createHash } from "node:crypto";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { type PluginArtifact, type PluginProvider, prisma } from "@minikura/db";
import { NotFoundError, ValidationError } from "../domain/errors/base.error";

const USER_AGENT = process.env.PLUGIN_REGISTRY_USER_AGENT || "Minikura/1.0 (plugin registry)";
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export type RegistryProject = {
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

export type RegistryVersion = {
  provider: "MODRINTH" | "HANGAR";
  projectId: string;
  projectName?: string;
  versionId: string;
  version: string;
  platform: string;
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

type ModrinthSearchResponse = {
  hits: Array<{
    project_id: string;
    title: string;
    description: string;
    icon_url?: string;
    downloads: number;
    license?: string;
    author: string;
    categories: string[];
    versions: string[];
    date_modified: string;
    slug?: string;
  }>;
};

type ModrinthVersion = {
  id: string;
  version_number: string;
  version_type: string;
  game_versions: string[];
  loaders: string[];
  files: Array<{
    filename: string;
    size: number;
    url: string;
    primary: boolean;
    hashes: { sha512?: string; sha1?: string };
  }>;
};

type HangarProject = {
  namespace: { owner: string; slug: string };
  name: string;
  description: string;
  avatarUrl?: string;
  stats: { downloads: number };
  settings?: { license?: { type?: string; name?: string } };
  category?: string;
  lastUpdated?: string;
  memberNames?: string[] | null;
  supportedPlatforms?: Record<string, string[]>;
};

type HangarVersion = {
  id: number;
  name: string;
  channel: { name: string };
  downloads: Record<
    string,
    {
      fileInfo: { name: string; sizeBytes: number; sha256Hash: string };
      downloadUrl: string | null;
      externalUrl: string | null;
    }
  >;
  platformDependencies: Record<string, string[]>;
};

function s3Client(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials:
      process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
}

async function registryFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Plugin provider request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

function modrinthLoader(platform: string): string {
  if (platform === "VELOCITY") return "velocity";
  if (platform === "FOLIA") return "folia";
  return "paper";
}

export class PluginRegistryService {
  async search(query: string, platform: string, minecraftVersion?: string) {
    const loader = modrinthLoader(platform);
    const facets = [["project_type:plugin"], [`categories:${loader}`]];
    if (minecraftVersion && minecraftVersion !== "LATEST") {
      facets.push([`versions:${minecraftVersion}`]);
    }

    const modrinthUrl = new URL("https://api.modrinth.com/v2/search");
    modrinthUrl.searchParams.set("query", query);
    modrinthUrl.searchParams.set("limit", "20");
    modrinthUrl.searchParams.set("index", "downloads");
    modrinthUrl.searchParams.set("facets", JSON.stringify(facets));

    const hangarUrl = new URL("https://hangar.papermc.io/api/v1/projects");
    if (query.trim()) hangarUrl.searchParams.set("query", query);
    hangarUrl.searchParams.set("limit", "20");
    hangarUrl.searchParams.set("sort", "-downloads");
    hangarUrl.searchParams.set("platform", platform === "FOLIA" ? "PAPER" : platform);

    const [modrinth, hangar] = await Promise.allSettled([
      registryFetch<ModrinthSearchResponse>(modrinthUrl.toString()),
      registryFetch<{ result: HangarProject[] }>(hangarUrl.toString()),
    ]);
    const projects: RegistryProject[] = [];

    if (modrinth.status === "fulfilled") {
      projects.push(
        ...modrinth.value.hits.map((project) => ({
          provider: "MODRINTH" as const,
          projectId: project.project_id,
          name: project.title,
          description: project.description,
          iconUrl: project.icon_url ?? null,
          downloads: project.downloads,
          license: project.license ?? null,
          author: project.author,
          categories: project.categories,
          minecraftVersions: project.versions,
          updatedAt: project.date_modified,
          projectUrl: `https://modrinth.com/plugin/${project.slug ?? project.project_id}`,
        }))
      );
    }
    if (hangar.status === "fulfilled") {
      projects.push(
        ...hangar.value.result.map((project) => ({
          provider: "HANGAR" as const,
          projectId: `${project.namespace.owner}/${project.namespace.slug}`,
          name: project.name,
          description: project.description,
          iconUrl: project.avatarUrl ?? null,
          downloads: project.stats.downloads,
          license: project.settings?.license?.type ?? project.settings?.license?.name ?? null,
          author: project.memberNames?.[0] ?? project.namespace.owner,
          categories: project.category ? [project.category] : [],
          minecraftVersions: Object.values(project.supportedPlatforms ?? {}).flat(),
          updatedAt: project.lastUpdated ?? null,
          projectUrl: `https://hangar.papermc.io/${project.namespace.owner}/${project.namespace.slug}`,
        }))
      );
    }
    return projects.sort((a, b) => b.downloads - a.downloads);
  }

  async versions(
    provider: "MODRINTH" | "HANGAR",
    projectId: string,
    platform: string,
    minecraftVersion?: string
  ): Promise<RegistryVersion[]> {
    if (provider === "MODRINTH") {
      const url = new URL(
        `https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}/version`
      );
      url.searchParams.set("loaders", JSON.stringify([modrinthLoader(platform)]));
      if (minecraftVersion && minecraftVersion !== "LATEST") {
        url.searchParams.set("game_versions", JSON.stringify([minecraftVersion]));
      }
      url.searchParams.set("include_changelog", "false");
      const versions = await registryFetch<ModrinthVersion[]>(url.toString());
      return versions
        .filter((version) => version.version_type === "release")
        .flatMap((version): RegistryVersion[] => {
          const file = version.files.find((candidate) => candidate.primary) ?? version.files[0];
          return file
            ? [
                {
                  provider,
                  projectId,
                  versionId: version.id,
                  version: version.version_number,
                  platform,
                  minecraftVersions: version.game_versions,
                  filename: file.filename,
                  size: file.size,
                  sha256: null,
                  downloadUrl: file.url,
                  license: null,
                },
              ]
            : [];
        });
    }

    const [owner, slug] = projectId.split("/", 2);
    if (!owner || !slug) throw new ValidationError("Invalid Hangar project ID");
    const url = new URL(
      `https://hangar.papermc.io/api/v1/projects/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}/versions`
    );
    url.searchParams.set("limit", "100");
    const response = await registryFetch<{ result: HangarVersion[] }>(url.toString());
    const resolvedPlatform = platform === "FOLIA" ? "PAPER" : platform;
    return response.result
      .filter((version) => version.channel.name.toLowerCase() === "release")
      .filter(
        (version) =>
          !minecraftVersion ||
          minecraftVersion === "LATEST" ||
          version.platformDependencies[resolvedPlatform]?.includes(minecraftVersion)
      )
      .flatMap((version) => {
        const download = version.downloads[resolvedPlatform];
        const downloadUrl = download?.downloadUrl ?? download?.externalUrl;
        if (!download || !downloadUrl) return [];
        return [
          {
            provider,
            projectId,
            versionId: String(version.id),
            version: version.name,
            platform,
            minecraftVersions: version.platformDependencies[resolvedPlatform] ?? [],
            filename: download.fileInfo.name,
            size: download.fileInfo.sizeBytes,
            sha256: download.fileInfo.sha256Hash,
            downloadUrl,
            license: null,
          },
        ];
      });
  }

  async register(input: RegistryVersion): Promise<PluginArtifact> {
    this.validateProviderUrl(input.provider, input.downloadUrl);
    const sha256 = input.sha256 ?? (await this.hashRemoteFile(input.downloadUrl, input.size));
    const artifact = await prisma.pluginArtifact.upsert({
      where: {
        provider_provider_version_id_platform_filename: {
          provider: input.provider,
          provider_version_id: input.versionId,
          platform: input.platform,
          filename: input.filename,
        },
      },
      update: {
        source_url: input.downloadUrl,
        sha256,
        size: input.size,
        name: input.projectName ?? input.projectId,
        license: input.license,
        description: input.description,
        author: input.author,
        icon_url: input.iconUrl,
        project_url: input.projectUrl,
        categories: input.categories ?? [],
        provider_updated_at: input.updatedAt ? new Date(input.updatedAt) : null,
      },
      create: {
        provider: input.provider,
        provider_project_id: input.projectId,
        provider_version_id: input.versionId,
        name: input.projectName ?? input.projectId,
        version: input.version,
        platform: input.platform,
        minecraft_versions: input.minecraftVersions,
        filename: input.filename,
        size: input.size,
        sha256,
        source_url: input.downloadUrl,
        license: input.license,
      },
    });
    return artifact;
  }

  async deploy(serverId: string, artifactId: string): Promise<PluginArtifact> {
    const [server, artifact] = await Promise.all([
      prisma.server.findUnique({ where: { id: serverId } }),
      prisma.pluginArtifact.findUnique({ where: { id: artifactId } }),
    ]);
    if (!server) throw new NotFoundError("Server", serverId);
    if (!artifact) throw new NotFoundError("Plugin artifact", artifactId);
    await prisma.$transaction([
      prisma.serverPlugin.deleteMany({
        where: {
          server_id: serverId,
          artifact: {
            provider: artifact.provider,
            provider_project_id: artifact.provider_project_id,
            id: { not: artifact.id },
          },
        },
      }),
      prisma.serverPlugin.upsert({
        where: { server_id_artifact_id: { server_id: serverId, artifact_id: artifact.id } },
        update: { enabled: true },
        create: { server_id: serverId, artifact_id: artifact.id },
      }),
    ]);
    return artifact;
  }

  async upload(file: File): Promise<PluginArtifact> {
    if (!file.name.toLowerCase().endsWith(".jar")) {
      throw new ValidationError("Plugin upload must be a JAR file");
    }
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      throw new ValidationError("Plugin upload must be between 1 byte and 100 MiB");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      throw new ValidationError("Plugin upload is not a valid JAR archive");
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const bucket = this.bucket();
    const client = s3Client();
    await this.ensureBucket(client, bucket);
    const objectKey = `artifacts/sha256/${sha256.slice(0, 2)}/${sha256}.jar`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: bytes,
        ContentType: "application/java-archive",
        Metadata: { sha256, filename: file.name },
      })
    );
    const artifact = await prisma.pluginArtifact.upsert({
      where: {
        provider_provider_version_id_platform_filename: {
          provider: "UPLOAD",
          provider_version_id: sha256,
          platform: "SERVER",
          filename: file.name,
        },
      },
      update: { object_key: objectKey },
      create: {
        provider: "UPLOAD",
        provider_project_id: sha256,
        provider_version_id: sha256,
        name: file.name.replace(/\.jar$/i, ""),
        version: "uploaded",
        platform: "SERVER",
        minecraft_versions: [],
        filename: file.name,
        size: file.size,
        sha256,
        storage_mode: "S3",
        object_key: objectKey,
      },
    });
    return artifact;
  }

  async listArtifacts() {
    return prisma.pluginArtifact.findMany({
      include: { server_plugins: { select: { server_id: true } } },
      orderBy: { created_at: "desc" },
    });
  }

  async deleteArtifact(artifactId: string): Promise<string[]> {
    const artifact = await prisma.pluginArtifact.findUnique({
      where: { id: artifactId },
      include: { server_plugins: { select: { server_id: true } } },
    });
    if (!artifact) throw new NotFoundError("Plugin artifact", artifactId);

    if (artifact.storage_mode === "S3" && artifact.object_key) {
      await s3Client().send(
        new DeleteObjectCommand({ Bucket: this.bucket(), Key: artifact.object_key })
      );
    }

    await prisma.$transaction([
      prisma.serverPlugin.deleteMany({ where: { artifact_id: artifactId } }),
      prisma.pluginArtifact.delete({ where: { id: artifactId } }),
    ]);
    return [...new Set(artifact.server_plugins.map((plugin) => plugin.server_id))];
  }

  async list(serverId: string) {
    return prisma.serverPlugin.findMany({
      where: { server_id: serverId },
      include: { artifact: true },
      orderBy: { created_at: "asc" },
    });
  }

  async reconcile(serverId: string, artifactIds: string[]): Promise<void> {
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundError("Server", serverId);
    const uniqueIds = [...new Set(artifactIds)];
    const artifacts = await prisma.pluginArtifact.findMany({ where: { id: { in: uniqueIds } } });
    if (artifacts.length !== uniqueIds.length) {
      throw new ValidationError("One or more plugin artifacts do not exist");
    }
    await prisma.$transaction([
      prisma.serverPlugin.deleteMany({
        where: { server_id: serverId, artifact_id: { notIn: uniqueIds } },
      }),
      ...uniqueIds.map((artifactId) =>
        prisma.serverPlugin.upsert({
          where: { server_id_artifact_id: { server_id: serverId, artifact_id: artifactId } },
          update: { enabled: true },
          create: { server_id: serverId, artifact_id: artifactId },
        })
      ),
    ]);
  }

  async remove(serverId: string, installationId: string): Promise<void> {
    const result = await prisma.serverPlugin.deleteMany({
      where: { id: installationId, server_id: serverId },
    });
    if (result.count === 0) throw new NotFoundError("Server plugin", installationId);
  }

  async download(token: string): Promise<{ redirect?: string; response?: Response }> {
    const artifact = await prisma.pluginArtifact.findUnique({ where: { download_token: token } });
    if (!artifact) throw new NotFoundError("Plugin artifact");
    if (artifact.storage_mode === "REMOTE" && artifact.source_url) {
      return { redirect: artifact.source_url };
    }
    if (!artifact.object_key) throw new NotFoundError("Plugin artifact object");
    const object = await s3Client().send(
      new GetObjectCommand({
        Bucket: this.bucket(),
        Key: artifact.object_key,
      })
    );
    if (!object.Body) throw new NotFoundError("Plugin artifact object");
    return {
      response: new Response(object.Body.transformToWebStream(), {
        headers: {
          "Content-Type": object.ContentType || "application/java-archive",
          "Content-Length": String(object.ContentLength ?? artifact.size),
          "Content-Disposition": `attachment; filename="${artifact.filename.replaceAll('"', "")}"`,
          ETag: `"${artifact.sha256}"`,
          "Cache-Control": "private, max-age=300, immutable",
        },
      }),
    };
  }

  artifactUrl(token: string): string {
    const baseUrl =
      process.env.MINIKURA_PLUGIN_DOWNLOAD_BASE_URL ||
      process.env.MINIKURA_OPERATOR_BACKEND_URL ||
      "http://minikura-backend:3000/api";
    return `${baseUrl.replace(/\/$/, "")}/registry/artifacts/${token}/download`;
  }

  private async hashRemoteFile(url: string, expectedSize: number): Promise<string> {
    if (expectedSize > MAX_UPLOAD_BYTES) throw new ValidationError("Plugin artifact is too large");
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    if (!response.ok) throw new ValidationError("Unable to download plugin artifact");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength !== expectedSize)
      throw new ValidationError("Plugin artifact size changed");
    return createHash("sha256").update(bytes).digest("hex");
  }

  private validateProviderUrl(provider: PluginProvider, value: string): void {
    const url = new URL(value);
    const allowed =
      provider === "MODRINTH"
        ? url.protocol === "https:" && url.hostname === "cdn.modrinth.com"
        : provider === "HANGAR"
          ? url.protocol === "https:" && url.hostname === "hangarcdn.papermc.io"
          : false;
    if (!allowed)
      throw new ValidationError("Plugin artifact URL is not from the selected provider");
  }

  private bucket(): string {
    return process.env.S3_BUCKET || "minikura-plugins";
  }

  private async ensureBucket(client: S3Client, bucket: string): Promise<void> {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  }
}
