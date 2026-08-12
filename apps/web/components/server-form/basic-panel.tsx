import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CheckboxField, Field } from "./fields";
import type { ServerFormPanelProps } from "./types";

export function BasicPanel({ formData, updateField }: ServerFormPanelProps) {
  return (
    <TabsContent value="basic" className="space-y-4 mt-4">
      <Field id="id" label="Server ID *">
        <Input
          id="id"
          value={formData.id}
          onChange={(event) => updateField("id", event.target.value)}
          placeholder="my-server"
          required
        />
      </Field>

      <Field id="description" label="Description">
        <Textarea
          id="description"
          value={formData.description}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="A brief description of this server"
          rows={2}
        />
      </Field>

      <div className="grid grid-cols-4 gap-4">
        <Field
          id="memoryRequest"
          label="Memory Request (MB) *"
          tooltip="Kubernetes guaranteed memory. Java heap sizes from the limit."
        >
          <Input
            id="memoryRequest"
            type="number"
            value={formData.memoryRequest}
            onChange={(event) => updateField("memoryRequest", event.target.value)}
            min="256"
            required
          />
        </Field>
        <Field
          id="memoryLimit"
          label="Memory Limit (MB) *"
          tooltip="Kubernetes max memory. Java heap scales from this."
        >
          <Input
            id="memoryLimit"
            type="number"
            value={formData.memoryLimit}
            onChange={(event) => updateField("memoryLimit", event.target.value)}
            min="256"
            required
          />
        </Field>
        <Field
          id="cpuRequest"
          label="CPU Request *"
          tooltip="Guaranteed CPU allocation (e.g., 500m = 0.5 cores)"
        >
          <Input
            id="cpuRequest"
            value={formData.cpuRequest}
            onChange={(event) => updateField("cpuRequest", event.target.value)}
            placeholder="500m"
          />
        </Field>
        <Field id="cpuLimit" label="CPU Limit *" tooltip="Maximum CPU the server can use">
          <Input
            id="cpuLimit"
            value={formData.cpuLimit}
            onChange={(event) => updateField("cpuLimit", event.target.value)}
            placeholder="2"
          />
        </Field>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="advanced-memory">
          <AccordionTrigger>Java Heap Overrides</AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            Heap sizes are derived from the memory limit. Override only if needed.
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <CheckboxField
        id="eula"
        checked={formData.eula}
        onCheckedChange={(checked) => updateField("eula", checked)}
        labelClassName="cursor-pointer"
      >
        I accept the{" "}
        <a
          href="https://www.minecraft.net/eula"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          Minecraft EULA
        </a>{" "}
        *
      </CheckboxField>
    </TabsContent>
  );
}
