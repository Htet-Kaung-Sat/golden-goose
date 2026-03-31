import { Label } from "@/components/ui/label";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import * as React from "react";

export interface RadioFieldProps {
  value: string;
  id: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  radioClassName?: string;
}

const RadioField = ({
  id,
  value,
  label,
  description,
  error,
  disabled,
  required,
  className,
  labelClassName,
  radioClassName,
}: RadioFieldProps) => {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-start gap-2">
        <RadioGroupItem
          id={id}
          value={value}
          disabled={disabled}
          className={cn(error && "border-destructive", radioClassName)}
        />

        {label && (
          <Label
            htmlFor={id}
            className={cn(
              "cursor-pointer text-sm font-medium leading-tight",
              disabled && "cursor-not-allowed opacity-70",
              labelClassName
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
        <p className="pl-6 text-xs text-muted-foreground">{description}</p>
      )}

      {error && <p className="pl-6 text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default RadioField;
