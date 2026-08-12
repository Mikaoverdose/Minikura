import type { ReactNode } from "react";
import { HelpTooltip } from "@/components/form-controls";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface FieldProps {
  id: string;
  label: ReactNode;
  tooltip?: string;
  children: ReactNode;
}

export function Field({ id, label, tooltip, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {tooltip && <HelpTooltip content={tooltip} />}
      </Label>
      {children}
    </div>
  );
}

interface CheckboxFieldProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
  tooltip?: string;
  labelClassName?: string;
}

export function CheckboxField({
  id,
  checked,
  onCheckedChange,
  children,
  tooltip,
  labelClassName,
}: CheckboxFieldProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value as boolean)}
      />
      <Label htmlFor={id} className={labelClassName}>
        {children}
        {tooltip && <HelpTooltip content={tooltip} />}
      </Label>
    </div>
  );
}
