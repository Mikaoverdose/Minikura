import { FormNotice } from "@/components/form-controls";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CheckboxField, Field } from "./fields";
import type { ServerFormPanelProps } from "./types";

export function PlayersPanel({ formData, updateField }: ServerFormPanelProps) {
  return (
    <TabsContent value="players" className="space-y-4 mt-4">
      {formData.type === "CUSTOM" && (
        <FormNotice>Some custom jars do not support managed whitelist/ops settings.</FormNotice>
      )}
      <CheckboxField
        id="enableWhitelist"
        checked={formData.enableWhitelist}
        onCheckedChange={(value) => updateField("enableWhitelist", value)}
        tooltip="Only whitelisted players can join the server"
      >
        Enable Whitelist
      </CheckboxField>
      {formData.enableWhitelist && (
        <>
          <Field
            id="whitelist"
            label="Whitelisted Players"
            tooltip="Comma-separated list of usernames or UUIDs"
          >
            <Textarea
              id="whitelist"
              value={formData.whitelist || ""}
              onChange={(event) => updateField("whitelist", event.target.value)}
              placeholder="Player1,Player2,UUID-here"
              rows={3}
            />
          </Field>
          <Field
            id="whitelistFile"
            label="Whitelist File URL"
            tooltip="URL or path to a whitelist.json file. Overrides the whitelist field."
          >
            <Input
              id="whitelistFile"
              value={formData.whitelistFile || ""}
              onChange={(event) => updateField("whitelistFile", event.target.value)}
              placeholder="https://example.com/whitelist.json"
            />
          </Field>
        </>
      )}
      <Field
        id="ops"
        label="Operators (Ops)"
        tooltip="Comma-separated list of usernames or UUIDs with full server permissions"
      >
        <Textarea
          id="ops"
          value={formData.ops || ""}
          onChange={(event) => updateField("ops", event.target.value)}
          placeholder="Admin1,Admin2"
          rows={3}
        />
      </Field>
      <Field id="opsFile" label="Ops File URL">
        <Input
          id="opsFile"
          value={formData.opsFile || ""}
          onChange={(event) => updateField("opsFile", event.target.value)}
          placeholder="https://example.com/ops.json"
        />
      </Field>
    </TabsContent>
  );
}
