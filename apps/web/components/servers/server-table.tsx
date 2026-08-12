import type { NormalServer, ReverseProxyServer } from "@minikura/api";
import { Pencil, Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { TableActions } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConnectionInfoCell } from "./connection-info-cell";
import { ServerStatusCell } from "./server-status-cell";

type ServerTableProps =
  | {
      type: "normal";
      servers: NormalServer[];
      onEdit?: (id: string) => void;
      onDelete?: (id: string) => void;
    }
  | {
      type: "proxy";
      servers: ReverseProxyServer[];
      onEdit?: (id: string) => void;
      onDelete?: (id: string) => void;
    };

function RowActions({
  id,
  kind,
  onEdit,
  onDelete,
}: {
  id: string;
  kind: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  if (!onEdit && !onDelete) return null;
  return (
    <TableActions>
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(id)}
          aria-label={`Edit ${kind} ${id}`}
        >
          <Pencil />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(id)}
          aria-label={`Delete ${kind} ${id}`}
        >
          <Trash2 />
        </Button>
      )}
    </TableActions>
  );
}

export function ServerTable(props: ServerTableProps) {
  if (props.type === "normal") {
    const columns: readonly DataTableColumn<NormalServer>[] = [
      { id: "id", header: "ID", cell: (server) => server.id, className: "font-bold" },
      {
        id: "status",
        header: "Status",
        cell: (server) => <ServerStatusCell serverId={server.id} type="normal" />,
      },
      {
        id: "storage",
        header: "Storage",
        cell: (server) => <Badge variant="outline">{server.type}</Badge>,
      },
      {
        id: "software",
        header: "Software",
        cell: (server) => <Badge variant="secondary">{server.jar_type || "VANILLA"}</Badge>,
      },
      {
        id: "version",
        header: "Version",
        cell: (server) => server.minecraft_version || "LATEST",
        className: "text-muted-foreground",
      },
      { id: "memory", header: "Memory", cell: (server) => `${server.memory || 1024} MB` },
      {
        id: "network",
        header: "Network",
        cell: (server) => <ConnectionInfoCell serverId={server.id} type="normal" />,
      },
      {
        id: "description",
        header: "Description",
        cell: (server) => server.description || "-",
        className: "max-w-64 truncate text-muted-foreground",
      },
      {
        id: "actions",
        header: "Actions",
        headerClassName: "text-right",
        className: "text-right",
        cell: (server) => (
          <RowActions
            id={server.id}
            kind="server"
            onEdit={props.onEdit}
            onDelete={props.onDelete}
          />
        ),
      },
    ];

    return <DataTable data={props.servers} columns={columns} getRowKey={(server) => server.id} />;
  }

  const columns: readonly DataTableColumn<ReverseProxyServer>[] = [
    { id: "id", header: "ID", cell: (server) => server.id, className: "font-bold" },
    {
      id: "status",
      header: "Status",
      cell: (server) => <ServerStatusCell serverId={server.id} type="proxy" />,
    },
    {
      id: "type",
      header: "Type",
      cell: (server) => <Badge variant="outline">{server.type}</Badge>,
    },
    {
      id: "external",
      header: "External",
      cell: (server) => `${server.external_address}:${server.external_port}`,
    },
    { id: "port", header: "Listen port", cell: (server) => server.listen_port },
    { id: "memory", header: "Memory", cell: (server) => `${server.memory} MB` },
    {
      id: "network",
      header: "Network",
      cell: (server) => <ConnectionInfoCell serverId={server.id} type="proxy" />,
    },
    {
      id: "description",
      header: "Description",
      cell: (server) => server.description || "-",
      className: "max-w-64 truncate text-muted-foreground",
    },
    {
      id: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (server) => (
        <RowActions id={server.id} kind="proxy" onEdit={props.onEdit} onDelete={props.onDelete} />
      ),
    },
  ];

  return <DataTable data={props.servers} columns={columns} getRowKey={(server) => server.id} />;
}
