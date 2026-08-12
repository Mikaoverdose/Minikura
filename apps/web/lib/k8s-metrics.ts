export interface ResourceMetrics {
  cpuUsage?: string;
  cpuUsagePercent?: number;
  memoryUsage?: string;
  memoryUsagePercent?: number;
}
export function parseCpuUsage(cpuNano: string): string | undefined {
  const usageNano = Number.parseInt(cpuNano.replace("n", ""), 10);
  if (Number.isNaN(usageNano)) return undefined;

  const usageMilli = Math.round(usageNano / 1_000_000);
  return `${usageMilli}m`;
}

export function calculateCpuPercent(cpuNano: string, capacityNano: string): number | undefined {
  const usageNano = Number.parseInt(cpuNano.replace("n", ""), 10);
  const capNano = Number.parseInt(capacityNano.replace("n", ""), 10);

  if (Number.isNaN(usageNano) || Number.isNaN(capNano) || capNano === 0) {
    return undefined;
  }

  return Math.round((usageNano / capNano) * 100);
}
export function parseMemoryUsage(memoryKi: string): string | undefined {
  const usageKi = Number.parseInt(memoryKi.replace("Ki", ""), 10);
  if (Number.isNaN(usageKi)) return undefined;

  const usageMi = Math.round(usageKi / 1024);
  return `${usageMi}Mi`;
}

export function calculateMemoryPercent(memoryKi: string, capacityKi: string): number | undefined {
  const usageKi = Number.parseInt(memoryKi.replace("Ki", ""), 10);
  const capKi = Number.parseInt(capacityKi.replace("Ki", ""), 10);

  if (Number.isNaN(usageKi) || Number.isNaN(capKi) || capKi === 0) {
    return undefined;
  }

  return Math.round((usageKi / capKi) * 100);
}
export function parseK8sMetrics(
  cpuUsage?: string,
  memoryUsage?: string,
  cpuCapacity?: string,
  memoryCapacity?: string
): ResourceMetrics {
  const result: ResourceMetrics = {};

  if (cpuUsage) {
    result.cpuUsage = parseCpuUsage(cpuUsage);
    if (cpuCapacity) {
      result.cpuUsagePercent = calculateCpuPercent(cpuUsage, cpuCapacity);
    }
  }

  if (memoryUsage) {
    result.memoryUsage = parseMemoryUsage(memoryUsage);
    if (memoryCapacity) {
      result.memoryUsagePercent = calculateMemoryPercent(memoryUsage, memoryCapacity);
    }
  }

  return result;
}
