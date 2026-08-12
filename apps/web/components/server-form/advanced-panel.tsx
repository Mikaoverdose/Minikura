import { Plus, Trash2 } from "lucide-react";
import { HelpTooltip } from "@/components/form-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Field } from "./fields";
import type { ServerFormPanelProps } from "./types";

interface AdvancedPanelProps extends ServerFormPanelProps {
  addEnvVar: () => void;
  removeEnvVar: (index: number) => void;
  updateEnvVar: (index: number, field: "key" | "value", value: string) => void;
}

export function AdvancedPanel({
  formData,
  updateField,
  addEnvVar,
  removeEnvVar,
  updateEnvVar,
}: AdvancedPanelProps) {
  return (
    <TabsContent value="advanced" className="space-y-4 mt-4">
      <div className="grid grid-cols-3 gap-4">
        <Field id="timezone" label="Timezone" tooltip="Timezone for server logs and scheduling (e.g., America/New_York)">
          <Input
            id="timezone"
            value={formData.timezone}
            onChange={(event) => updateField("timezone", event.target.value)}
            placeholder="UTC"
          />
        </Field>
        <Field id="uid" label="User ID (UID)" tooltip="Linux user ID for the Minecraft process">
          <Input
            id="uid"
            value={formData.uid}
            onChange={(event) => updateField("uid", event.target.value)}
            placeholder="1000"
          />
        </Field>
        <Field id="gid" label="Group ID (GID)" tooltip="Linux group ID for the Minecraft process">
          <Input
            id="gid"
            value={formData.gid}
            onChange={(event) => updateField("gid", event.target.value)}
            placeholder="1000"
          />
        </Field>
      </div>
      <Field
        id="stopDuration"
        label="Graceful Shutdown Timeout (seconds)"
        tooltip="How long to wait for graceful shutdown before forcing stop"
      >
        <Input
          id="stopDuration"
          type="number"
          value={formData.stopDuration}
          onChange={(event) => updateField("stopDuration", event.target.value)}
          min="1"
        />
      </Field>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>
            Custom Environment Variables
            <HelpTooltip content="Additional environment variables to pass to the container" />
          </Label>
          <Button type="button" variant="outline" size="sm" onClick={addEnvVar}>
            <Plus className="h-4 w-4 mr-2" />
            Add Variable
          </Button>
        </div>
        {formData.envVars.length > 0 && (
          <div className="space-y-3">
            {formData.envVars.map((envVar, index) => (
              <div key={envVar.id} className="flex gap-2">
                <Input
                  placeholder="KEY"
                  value={envVar.key}
                  onChange={(event) => updateEnvVar(index, "key", event.target.value)}
                  className="flex-1 font-mono"
                />
                <Input
                  placeholder="value"
                  value={envVar.value}
                  onChange={(event) => updateEnvVar(index, "value", event.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeEnvVar(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </TabsContent>
  );
}
