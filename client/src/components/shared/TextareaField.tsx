import ErrorTooltip from "@/components/shared/ErrorTooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { UseFormRegisterReturn } from "react-hook-form";

type TextareaFieldProps = {
  id: string;
  label?: string;
  registerProps?: UseFormRegisterReturn;
  error?: string;
  required?: boolean;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  horizontal?: boolean;
  labelSize?: string;
  labelWidth?: string;
  inputWidth?: string;
  labelClassName?: string;
  inputClassName?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
};

const TextareaField = ({
  id,
  label = "",
  registerProps,
  error,
  required = true,
  value,
  defaultValue = "",
  disabled = false,
  readOnly = false,
  placeholder = "",
  horizontal = true,
  labelSize = "text-sm",
  labelWidth = "md:w-28",
  inputWidth = "",
  labelClassName = "",
  inputClassName = "",
  onChange,
  rows = 4,
}: TextareaFieldProps) => {
  const wrapperClass = horizontal
    ? "flex flex-col md:flex-row md:items-start gap-2"
    : "flex flex-col gap-1";

  const labelClass = cn(
    "flex items-center gap-1 mt-2",
    horizontal ? labelWidth : "",
    labelSize,
    labelClassName,
  );

  const valueProps = value !== undefined ? { value } : { defaultValue };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    registerProps?.onChange?.(e);
    onChange?.(e);
  };

  return (
    <div className={wrapperClass}>
      {label && (
        <Label htmlFor={id} className={labelClass}>
          <span>{label}</span>
          {required && (
            <span className="text-red-500 text-[20px] leading-none relative -top-1">
              *
            </span>
          )}
        </Label>
      )}

      <div className={horizontal ? "flex-1" : ""}>
        <ErrorTooltip error={error}>
          <Textarea
            id={id}
            {...valueProps}
            {...registerProps}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            onChange={handleChange}
            rows={rows}
            className={cn(
              "w-full rounded-md border px-2 py-1 transition-shadow resize-none",
              error
                ? "!border-red-400 !ring-red-400 !focus:ring-red-400"
                : "!focus:ring-blue-500",
              inputWidth,
              inputClassName,
            )}
          />
        </ErrorTooltip>
      </div>
    </div>
  );
};

export default TextareaField;
