import { FormNotice } from "@/components/form-controls";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CheckboxField, Field } from "./fields";
import type { ServerFormPanelProps } from "./types";

export function PerformancePanel({ formData, updateField }: ServerFormPanelProps) {
  return (
    <TabsContent value="performance" className="space-y-4 mt-4">
      {formData.type === "CUSTOM" && (
        <FormNotice>
          Custom jars may not honor built-in tuning flags. Use custom env vars if required.
        </FormNotice>
      )}
      <div className="space-y-3">
        <CheckboxField
          id="useAikarFlags"
          checked={formData.useAikarFlags}
          onCheckedChange={(value) => updateField("useAikarFlags", value)}
          tooltip="Optimized G1GC garbage collection flags. Recommended for servers with 1GB+ RAM."
        >
          Use Aikar's Flags
        </CheckboxField>
        <CheckboxField
          id="useMeowiceFlags"
          checked={formData.useMeowiceFlags}
          onCheckedChange={(value) => updateField("useMeowiceFlags", value)}
          tooltip="Modern optimization flags for Java 17+. Based on Aikar's flags with improvements."
        >
          Use Meowice Flags
        </CheckboxField>
        <CheckboxField
          id="enableJmx"
          checked={formData.enableJmx}
          onCheckedChange={(value) => updateField("enableJmx", value)}
          tooltip="Enables remote JMX monitoring for advanced profiling"
        >
          Enable JMX
        </CheckboxField>
      </div>
      <Field
        id="jvmOpts"
        label="Custom JVM Options"
        tooltip="Space-separated JVM arguments (e.g., -Xms2G -Xmx4G)"
      >
        <Textarea
          id="jvmOpts"
          value={formData.jvmOpts || ""}
          onChange={(event) => updateField("jvmOpts", event.target.value)}
          placeholder="-XX:+UseG1GC -XX:MaxGCPauseMillis=200"
          rows={3}
        />
      </Field>
      <Field id="jvmXxOpts" label="JVM -XX Options" tooltip="Space-separated -XX JVM flags for advanced tuning">
        <Textarea
          id="jvmXxOpts"
          value={formData.jvmXxOpts || ""}
          onChange={(event) => updateField("jvmXxOpts", event.target.value)}
          placeholder="+UnlockExperimentalVMOptions +UseZGC"
          rows={2}
        />
      </Field>
      <Field id="jvmDdOpts" label="JVM -D System Properties" tooltip="Comma-separated key=value pairs for system properties">
        <Textarea
          id="jvmDdOpts"
          value={formData.jvmDdOpts || ""}
          onChange={(event) => updateField("jvmDdOpts", event.target.value)}
          placeholder="property1=value1,property2=value2"
          rows={2}
        />
      </Field>
    </TabsContent>
  );
}
