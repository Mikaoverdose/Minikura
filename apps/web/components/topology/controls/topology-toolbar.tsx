"use client";

import type { LucideIcon } from "lucide-react";
import { Box, Filter, Globe, Search, Server } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import type { TopologyFilters } from "@/lib/topology-types";
import { HealthBadge } from "../topology-primitives";

type ToggleFilterKey = "showServers" | "showProxies" | "showK8sNodes" | "showConnections";

interface TopologyToolbarProps {
  filters: TopologyFilters;
  onFiltersChange: (filters: TopologyFilters) => void;
  metadata: {
    totalServers: number;
    totalProxies: number;
    totalK8sNodes: number;
    totalConnections: number;
    healthySystems: number;
    degradedSystems: number;
    unhealthySystems: number;
  };
}

export function TopologyToolbar({ filters, onFiltersChange, metadata }: TopologyToolbarProps) {
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onFiltersChange({ ...filters, searchQuery: value });
  };

  const toggleFilter = (key: ToggleFilterKey) => {
    onFiltersChange({ ...filters, [key]: !filters[key] });
  };

  const stats = [
    { label: "Servers", value: metadata.totalServers, icon: Server },
    { label: "Proxies", value: metadata.totalProxies, icon: Globe },
    { label: "Nodes", value: metadata.totalK8sNodes, icon: Box },
  ];

  const filterOptions: Array<{
    id: string;
    label: string;
    filter: ToggleFilterKey;
    icon?: LucideIcon;
  }> = [
    { id: "show-servers", label: "Servers", filter: "showServers", icon: Server },
    { id: "show-proxies", label: "Reverse Proxies", filter: "showProxies", icon: Globe },
    { id: "show-k8s-nodes", label: "K8s Nodes", filter: "showK8sNodes", icon: Box },
    { id: "show-connections", label: "Connection Lines", filter: "showConnections" },
  ];

  return (
    <div className="flex w-[calc(100vw-4.5rem)] max-w-[350px] flex-col gap-3 rounded-sm border-2 border-foreground bg-card/95 p-3 shadow-[5px_5px_0_color-mix(in_oklch,var(--foreground)_16%,transparent)] backdrop-blur-sm sm:w-[350px] sm:p-4">
      <div className="grid grid-cols-3 gap-2">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex flex-col items-center border bg-muted/50 p-2">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Icon className="h-3 w-3" />
              <span className="text-xs">{label}</span>
            </div>
            <span className="text-lg font-bold">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-between text-xs">
        <HealthBadge status="healthy" appearance="summary">
          {metadata.healthySystems} Healthy
        </HealthBadge>
        <HealthBadge status="degraded" appearance="summary">
          {metadata.degradedSystems} Degraded
        </HealthBadge>
        <HealthBadge status="unhealthy" appearance="summary">
          {metadata.unhealthySystems} Down
        </HealthBadge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-3rem)] max-w-80" align="start">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3">Show/Hide</h4>
              <div className="space-y-3">
                {filterOptions.map(({ id, label, filter, icon: Icon }) => (
                  <div key={id} className="flex items-center justify-between">
                    <Label
                      htmlFor={id}
                      className={Icon ? "flex items-center gap-2 cursor-pointer" : "cursor-pointer"}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      <span>{label}</span>
                    </Label>
                    <Switch
                      id={id}
                      checked={filters[filter]}
                      onCheckedChange={() => toggleFilter(filter)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
