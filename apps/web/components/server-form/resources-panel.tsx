import { FormNotice } from "@/components/form-controls";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { CheckboxField, Field } from "./fields";
import type { ServerFormPanelProps } from "./types";

export function ResourcesPanel({ formData, updateField }: ServerFormPanelProps) {
  return (
    <TabsContent value="resources" className="space-y-4 mt-4">
      {formData.type === "CUSTOM" && (
        <FormNotice>Resource pack settings may not apply to custom jars.</FormNotice>
      )}
      <Field id="resourcePack" label="Resource Pack URL" tooltip="URL or path to a resource pack ZIP file">
        <Input
          id="resourcePack"
          value={formData.resourcePack || ""}
          onChange={(event) => updateField("resourcePack", event.target.value)}
          placeholder="https://example.com/resourcepack.zip"
        />
      </Field>
      <Field id="resourcePackSha1" label="Resource Pack SHA1" tooltip="SHA1 checksum of the resource pack for verification">
        <Input
          id="resourcePackSha1"
          value={formData.resourcePackSha1 || ""}
          onChange={(event) => updateField("resourcePackSha1", event.target.value)}
          placeholder="a1b2c3d4e5f6..."
        />
      </Field>
      <CheckboxField
        id="resourcePackEnforce"
        checked={formData.resourcePackEnforce}
        onCheckedChange={(value) => updateField("resourcePackEnforce", value)}
        tooltip="Require players to accept the resource pack to join"
      >
        Enforce Resource Pack
      </CheckboxField>
      <Field id="serverIcon" label="Server Icon URL" tooltip="URL or path to a server icon image (PNG, 64x64 recommended)">
        <Input
          id="serverIcon"
          value={formData.serverIcon || ""}
          onChange={(event) => updateField("serverIcon", event.target.value)}
          placeholder="https://example.com/icon.png"
        />
      </Field>
    </TabsContent>
  );
}
