import { FormNotice } from "@/components/form-controls";
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

export function AutomationPanel({ formData, updateField }: ServerFormPanelProps) {
  return (
    <TabsContent value="automation" className="space-y-4 mt-4">
      {formData.type === "CUSTOM" && (
        <FormNotice>
          Automation hooks depend on container scripts; custom jars may ignore them.
        </FormNotice>
      )}
      <Accordion type="multiple" className="w-full">
        <AccordionItem value="rcon">
          <AccordionTrigger>RCON Configuration</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <CheckboxField
              id="enableRcon"
              checked={formData.enableRcon}
              onCheckedChange={(value) => updateField("enableRcon", value)}
              tooltip="Remote console for server management. Enabled by default for graceful shutdown."
            >
              Enable RCON
            </CheckboxField>
            {formData.enableRcon && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field id="rconPassword" label="RCON Password">
                    <Input
                      id="rconPassword"
                      type="password"
                      value={formData.rconPassword || ""}
                      onChange={(event) => updateField("rconPassword", event.target.value)}
                      placeholder="Auto-generated if empty"
                    />
                  </Field>
                  <Field id="rconPort" label="RCON Port">
                    <Input
                      id="rconPort"
                      type="number"
                      value={formData.rconPort}
                      onChange={(event) => updateField("rconPort", event.target.value)}
                      min="1"
                      max="65535"
                    />
                  </Field>
                </div>
                <Field
                  id="rconCmdsStartup"
                  label="RCON Commands on Startup"
                  tooltip="Semicolon-separated commands to run when server starts"
                >
                  <Textarea
                    id="rconCmdsStartup"
                    value={formData.rconCmdsStartup || ""}
                    onChange={(event) => updateField("rconCmdsStartup", event.target.value)}
                    placeholder="say Server starting...;gamerule doDaylightCycle false"
                    rows={2}
                  />
                </Field>
                <Field id="rconCmdsOnConnect" label="Commands on Player Connect">
                  <Textarea
                    id="rconCmdsOnConnect"
                    value={formData.rconCmdsOnConnect || ""}
                    onChange={(event) => updateField("rconCmdsOnConnect", event.target.value)}
                    placeholder="tell {{player}} Welcome to the server!"
                    rows={2}
                  />
                </Field>
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="query">
          <AccordionTrigger>Query Protocol</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <CheckboxField
              id="enableQuery"
              checked={formData.enableQuery}
              onCheckedChange={(value) => updateField("enableQuery", value)}
              tooltip="Allows external tools to query server status and player list"
            >
              Enable Query Protocol
            </CheckboxField>
            {formData.enableQuery && (
              <Field id="queryPort" label="Query Port">
                <Input
                  id="queryPort"
                  type="number"
                  value={formData.queryPort}
                  onChange={(event) => updateField("queryPort", event.target.value)}
                  min="1"
                  max="65535"
                />
              </Field>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="autopause">
          <AccordionTrigger>Auto-Pause</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <CheckboxField
              id="enableAutopause"
              checked={formData.enableAutopause}
              onCheckedChange={(value) => updateField("enableAutopause", value)}
              tooltip="Automatically pauses the server when no players are online to save resources"
            >
              Enable Auto-Pause
            </CheckboxField>
            {formData.enableAutopause && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field id="autopauseTimeoutEst" label="Timeout After Disconnect (seconds)">
                    <Input
                      id="autopauseTimeoutEst"
                      type="number"
                      value={formData.autopauseTimeoutEst}
                      onChange={(event) => updateField("autopauseTimeoutEst", event.target.value)}
                      min="0"
                    />
                  </Field>
                  <Field id="autopauseTimeoutInit" label="Timeout After Startup (seconds)">
                    <Input
                      id="autopauseTimeoutInit"
                      type="number"
                      value={formData.autopauseTimeoutInit}
                      onChange={(event) => updateField("autopauseTimeoutInit", event.target.value)}
                      min="0"
                    />
                  </Field>
                </div>
                <Field id="autopauseKnockInterface" label="Network Interface">
                  <Input
                    id="autopauseKnockInterface"
                    value={formData.autopauseKnockInterface}
                    onChange={(event) => updateField("autopauseKnockInterface", event.target.value)}
                    placeholder="eth0"
                  />
                </Field>
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="autostop">
          <AccordionTrigger>Auto-Stop</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <CheckboxField
              id="enableAutostop"
              checked={formData.enableAutostop}
              onCheckedChange={(value) => updateField("enableAutostop", value)}
              tooltip="Automatically stops the server when no players are online"
            >
              Enable Auto-Stop
            </CheckboxField>
            {formData.enableAutostop && (
              <div className="grid grid-cols-2 gap-4">
                <Field id="autostopTimeoutEst" label="Timeout After Player Departure (seconds)">
                  <Input
                    id="autostopTimeoutEst"
                    type="number"
                    value={formData.autostopTimeoutEst}
                    onChange={(event) => updateField("autostopTimeoutEst", event.target.value)}
                    min="0"
                  />
                </Field>
                <Field id="autostopTimeoutInit" label="Timeout After Launch (seconds)">
                  <Input
                    id="autostopTimeoutInit"
                    type="number"
                    value={formData.autostopTimeoutInit}
                    onChange={(event) => updateField("autostopTimeoutInit", event.target.value)}
                    min="0"
                  />
                </Field>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </TabsContent>
  );
}
