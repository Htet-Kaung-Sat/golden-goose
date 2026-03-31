import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import * as React from "react";

export interface CheckboxFieldProps {
  id: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  required?: boolean;
  indeterminate?: boolean;
  labelPlacement?: "left" | "right";
  className?: string;
  labelClassName?: string;
  checkboxClassName?: string;
  onCheckedChange?: (checked: boolean) => void;
}

const CheckboxField = ({
  id,
  label,
  description,
  error,
  checked,
  defaultChecked,
  disabled,
  required,
  indeterminate,
  labelPlacement = "right",
  className,
  labelClassName,
  checkboxClassName,
  onCheckedChange,
}: CheckboxFieldProps) => {
  const checkedValue = indeterminate ? "indeterminate" : checked;
  return (
    <div className={cn("space-y-1.5 rounded", className)}>
      <div
        className={cn(
          "flex items-start gap-2",
          labelPlacement === "left" && "flex-row-reverse justify-end",
        )}
      >
        <Checkbox
          id={id}
          checked={checkedValue}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          className={cn(
            error && "border-destructive data-[state=checked]:bg-destructive",
            checkboxClassName,
            "cursor-pointer",
          )}
          {...(indeterminate && { "data-state": "indeterminate" })}
        />

        {(label || required) && (
          <Label
            htmlFor={id}
            className={cn(
              "cursor-pointer text-sm font-medium leading-tight",
              disabled && "cursor-not-allowed opacity-70",
              labelClassName,
            )}
          >
            <span className="flex items-center gap-1">
              {label}
              {required && <span className="text-destructive">*</span>}
            </span>
          </Label>
        )}
      </div>

      {description && !error && (
        <p className="text-xs text-muted-foreground pl-6">{description}</p>
      )}

      {error && <p className="text-xs text-destructive pl-6">{error}</p>}
    </div>
  );
};

export default CheckboxField;
