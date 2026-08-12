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
import { Textarea } from "@/components/ui/textarea";
import { CheckboxField, Field } from "./fields";
import type { ServerFormData, ServerFormPanelProps, ServerType } from "./types";

const toMode = (value: string): ServerFormData["mode"] => {
  if (value === "creative" || value === "adventure" || value === "spectator") return value;
  return "survival";
};

const toDifficulty = (value: string): ServerFormData["difficulty"] => {
  if (value === "peaceful" || value === "normal" || value === "hard") return value;
  return "easy";
};

export function ServerPanel({ formData, updateField }: ServerFormPanelProps) {
  return (
    <TabsContent value="server" className="space-y-4 mt-4">
      {formData.type === "CUSTOM" && (
        <FormNotice>
          Custom jars may ignore built-in server settings. Configure extra values via custom
          environment variables if needed.
        </FormNotice>
      )}
      <Field
        id="type"
        label="Server Type *"
        tooltip="Choose the server software (Vanilla, Paper, or Custom Jar)."
      >
        <Select
          value={formData.type}
          onValueChange={(value) => updateField("type", value as ServerType)}
        >
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="VANILLA">Vanilla (Official Mojang)</SelectItem>
            <SelectItem value="PAPER">Paper (Recommended - High Performance)</SelectItem>
            <SelectItem value="CUSTOM">Custom Jar</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {formData.type !== "CUSTOM" && (
        <Field
          id="version"
          label="Minecraft Version"
          tooltip="Use LATEST for newest stable, SNAPSHOT for snapshots, or specific version like 1.20.4"
        >
          <Input
            id="version"
            value={formData.version || ""}
            onChange={(event) => updateField("version", event.target.value)}
            placeholder="LATEST"
          />
        </Field>
      )}

      {formData.type === "PAPER" && (
        <Field id="paperBuild" label="Paper Build Number">
          <Input
            id="paperBuild"
            value={formData.paperBuild || ""}
            onChange={(event) => updateField("paperBuild", event.target.value)}
            placeholder="Leave empty for latest"
          />
        </Field>
      )}

      {formData.type === "CUSTOM" && (
        <Field id="customJarUrl" label="Custom Server Jar URL/Path">
          <Input
            id="customJarUrl"
            value={formData.customJarUrl || ""}
            onChange={(event) => updateField("customJarUrl", event.target.value)}
            placeholder="https://example.com/server.jar"
          />
          <p className="text-sm text-muted-foreground">
            Sets CUSTOM_SERVER for the itzg/minecraft-server image.
          </p>
        </Field>
      )}

      <Field id="motd" label="Message of the Day (MOTD)">
        <Textarea
          id="motd"
          value={formData.motd || ""}
          onChange={(event) => updateField("motd", event.target.value)}
          placeholder="A Minecraft Server"
          rows={2}
        />
        <p className="text-sm text-muted-foreground">
          Supports formatting codes like §l for bold, §c for red
        </p>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field id="mode" label="Game Mode">
          <Select
            value={formData.mode}
            onValueChange={(value) => updateField("mode", toMode(value))}
          >
            <SelectTrigger id="mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="survival">Survival</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
              <SelectItem value="adventure">Adventure</SelectItem>
              <SelectItem value="spectator">Spectator</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field id="difficulty" label="Difficulty">
          <Select
            value={formData.difficulty}
            onValueChange={(value) => updateField("difficulty", toDifficulty(value))}
          >
            <SelectTrigger id="difficulty">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="peaceful">Peaceful</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field id="maxPlayers" label="Max Players">
          <Input
            id="maxPlayers"
            type="number"
            value={formData.maxPlayers}
            onChange={(event) => updateField("maxPlayers", event.target.value)}
            min="1"
            max="1000"
          />
        </Field>
        <Field id="viewDistance" label="View Distance (chunks)">
          <Input
            id="viewDistance"
            type="number"
            value={formData.viewDistance}
            onChange={(event) => updateField("viewDistance", event.target.value)}
            min="3"
            max="32"
          />
        </Field>
      </div>

      <div className="space-y-3">
        <CheckboxField
          id="pvp"
          checked={formData.pvp}
          onCheckedChange={(value) => updateField("pvp", value)}
        >
          Enable PvP (Player vs Player)
        </CheckboxField>
        <CheckboxField
          id="onlineMode"
          checked={formData.onlineMode}
          onCheckedChange={(value) => updateField("onlineMode", value)}
        >
          Online Mode (Requires authenticated Minecraft accounts)
        </CheckboxField>
        <CheckboxField
          id="allowFlight"
          checked={formData.allowFlight}
          onCheckedChange={(value) => updateField("allowFlight", value)}
        >
          Allow Flight
        </CheckboxField>
        <CheckboxField
          id="enableCommandBlock"
          checked={formData.enableCommandBlock}
          onCheckedChange={(value) => updateField("enableCommandBlock", value)}
        >
          Enable Command Blocks
        </CheckboxField>
        <CheckboxField
          id="hardcore"
          checked={formData.hardcore}
          onCheckedChange={(value) => updateField("hardcore", value)}
        >
          Hardcore Mode (Permanent Death)
        </CheckboxField>
      </div>
    </TabsContent>
  );
}
