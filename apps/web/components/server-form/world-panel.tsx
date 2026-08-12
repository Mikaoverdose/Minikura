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
import type { ServerFormPanelProps } from "./types";

export function WorldPanel({ formData, updateField }: ServerFormPanelProps) {
  return (
    <TabsContent value="world" className="space-y-4 mt-4">
      {formData.type === "CUSTOM" && (
        <FormNotice>
          World options apply to standard server properties and may be ignored by custom jars.
        </FormNotice>
      )}
      <Field id="levelName" label="World Name">
        <Input
          id="levelName"
          value={formData.levelName}
          onChange={(event) => updateField("levelName", event.target.value)}
          placeholder="world"
        />
      </Field>
      <Field
        id="levelSeed"
        label="World Seed"
        tooltip="Leave empty for random generation. Can be numeric or text."
      >
        <Input
          id="levelSeed"
          value={formData.levelSeed || ""}
          onChange={(event) => updateField("levelSeed", event.target.value)}
          placeholder="Leave empty for random"
        />
      </Field>
      <Field id="levelType" label="Level Type">
        <Select
          value={formData.levelType || "default"}
          onValueChange={(value) => updateField("levelType", value === "default" ? "" : value)}
        >
          <SelectTrigger id="levelType">
            <SelectValue placeholder="Default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="flat">Flat/Superflat</SelectItem>
            <SelectItem value="largeBiomes">Large Biomes</SelectItem>
            <SelectItem value="amplified">Amplified</SelectItem>
            <SelectItem value="buffet">Buffet (Single Biome)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field
        id="generatorSettings"
        label="Generator Settings"
        tooltip="JSON configuration for custom world generation. Advanced users only."
      >
        <Textarea
          id="generatorSettings"
          value={formData.generatorSettings || ""}
          onChange={(event) => updateField("generatorSettings", event.target.value)}
          placeholder={'{"structures": {...}, "layers": [...]}'}
          rows={3}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field
          id="spawnProtection"
          label="Spawn Protection (blocks)"
          tooltip="Radius around spawn where only ops can build. Set to 0 to disable."
        >
          <Input
            id="spawnProtection"
            type="number"
            value={formData.spawnProtection}
            onChange={(event) => updateField("spawnProtection", event.target.value)}
            min="0"
          />
        </Field>
        <Field
          id="simulationDistance"
          label="Simulation Distance"
          tooltip="Distance in chunks where game logic runs (redstone, crops, etc.)"
        >
          <Input
            id="simulationDistance"
            type="number"
            value={formData.simulationDistance}
            onChange={(event) => updateField("simulationDistance", event.target.value)}
            min="3"
            max="32"
          />
        </Field>
      </div>
      <div className="space-y-3">
        <CheckboxField
          id="spawnAnimals"
          checked={formData.spawnAnimals}
          onCheckedChange={(value) => updateField("spawnAnimals", value)}
        >
          Spawn Animals
        </CheckboxField>
        <CheckboxField
          id="spawnMonsters"
          checked={formData.spawnMonsters}
          onCheckedChange={(value) => updateField("spawnMonsters", value)}
        >
          Spawn Monsters
        </CheckboxField>
        <CheckboxField
          id="spawnNpcs"
          checked={formData.spawnNpcs}
          onCheckedChange={(value) => updateField("spawnNpcs", value)}
        >
          Spawn NPCs (Villagers)
        </CheckboxField>
      </div>
    </TabsContent>
  );
}
