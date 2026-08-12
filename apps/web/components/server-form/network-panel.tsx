import { FormNotice } from "@/components/form-controls";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Field } from "./fields";
import type { ServerFormPanelProps, ServiceType } from "./types";

export function NetworkPanel({ formData, updateField }: ServerFormPanelProps) {
  return (
    <TabsContent value="network" className="space-y-4 mt-4">
      {formData.type === "CUSTOM" && (
        <FormNotice>
          Network settings apply at the container level and still work with custom jars.
        </FormNotice>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field id="listenPort" label="Listen Port">
          <Input
            id="listenPort"
            type="number"
            value={formData.listenPort}
            onChange={(event) => updateField("listenPort", event.target.value)}
            min="1"
            max="65535"
          />
        </Field>
        <Field id="serviceType" label="Service Type" tooltip="How the server is exposed in Kubernetes">
          <Select
            value={formData.serviceType}
            onValueChange={(value) => updateField("serviceType", value as ServiceType)}
          >
            <SelectTrigger id="serviceType"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CLUSTER_IP">ClusterIP (Internal Only)</SelectItem>
              <SelectItem value="NODE_PORT">NodePort (External Access)</SelectItem>
              <SelectItem value="LOAD_BALANCER">LoadBalancer (Cloud/MetalLB)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      {formData.serviceType === "NODE_PORT" && (
        <Field
          id="nodePort"
          label="Node Port"
          tooltip="Specific port on the node (30000-32767). Leave empty for auto-assignment."
        >
          <Input
            id="nodePort"
            type="number"
            value={formData.nodePort || ""}
            onChange={(event) => updateField("nodePort", event.target.value)}
            placeholder="30000-32767"
            min="30000"
            max="32767"
          />
        </Field>
      )}
    </TabsContent>
  );
}
