import type { ReactNode } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { SectionCard } from "@/components/section-card";

export type K8sResourceColumn<T> = {
  header: string;
  render: (resource: T) => ReactNode;
  className?: string;
};

type K8sResourceTableCardProps<T extends { name?: string }> = {
  title: string;
  description: string;
  emptyMessage: string;
  resources: readonly T[];
  columns: readonly K8sResourceColumn<T>[];
};

export function K8sResourceTableCard<T extends { name?: string }>({
  title,
  description,
  emptyMessage,
  resources,
  columns,
}: K8sResourceTableCardProps<T>) {
  const tableColumns: readonly DataTableColumn<T>[] = columns.map((column) => ({
    id: column.header,
    header: column.header,
    cell: column.render,
    className: column.className,
  }));

  return (
    <SectionCard title={title} description={description}>
      {resources.length === 0 ? (
        <div className="border border-dashed bg-muted/25 px-4 py-12 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <DataTable
          data={resources}
          columns={tableColumns}
          getRowKey={(resource, index) => resource.name ?? index}
        />
      )}
    </SectionCard>
  );
}
