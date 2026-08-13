import { FormNotice } from "@/components/form-controls";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CheckboxField, Field } from "./fields";
import { ArtifactSelector } from "./artifact-selector";
import type { ServerFormPanelProps } from "./types";

export function ModsPanel({ formData, updateField }: ServerFormPanelProps) {
  return (
    <TabsContent value="mods" className="space-y-4 mt-4">
      {formData.type === "CUSTOM" && (
        <FormNotice>Mods/plugins automation is intended for Vanilla/Paper workflows.</FormNotice>
      )}
      {["PAPER", "SPIGOT", "PURPUR"].includes(formData.type) && (
        <ArtifactSelector formData={formData} updateField={updateField} />
      )}
      <Field
        id="plugins"
        label="Plugins"
        tooltip="Comma-separated list of plugin URLs or filenames"
      >
        <Textarea
          id="plugins"
          value={formData.plugins || ""}
          onChange={(event) => updateField("plugins", event.target.value)}
          placeholder="https://example.com/plugin1.jar,plugin2.jar"
          rows={3}
        />
        <p className="text-sm text-muted-foreground">
          For Paper/Spigot/Bukkit servers. URLs or local filenames.
        </p>
      </Field>
      <Field
        id="spigetResources"
        label="Spiget Resource IDs"
        tooltip="Comma-separated Spiget resource IDs to auto-download from SpigotMC"
      >
        <Input
          id="spigetResources"
          value={formData.spigetResources || ""}
          onChange={(event) => updateField("spigetResources", event.target.value)}
          placeholder="1234,5678,9012"
        />
      </Field>
      <div className="space-y-3">
        <CheckboxField
          id="removeOldPlugins"
          checked={formData.removeOldPlugins}
          onCheckedChange={(value) => updateField("removeOldPlugins", value)}
          tooltip="Automatically remove old versions of plugins when updating"
        >
          Remove Old Plugins
        </CheckboxField>
      </div>
    </TabsContent>
  );
}
