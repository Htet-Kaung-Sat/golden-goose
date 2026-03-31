import ErrorTooltip from "@/components/shared/ErrorTooltip";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { UseFormRegisterReturn } from "react-hook-form";

type Option = {
  value: string | number;
  label: string;
};

type SelectFieldProps = {
  id: string;
  label?: string;
  value?: string | number;
  options: Option[];
  error?: string;
  required?: boolean;
  placeholder?: string;
  autoSelectFirst?: boolean;
  register?: UseFormRegisterReturn;
  onChange?: (value: string) => void;
  className?: string;
  labelClassName?: string;
  selectClassName?: string;
  selectWidth?: string;
  horizontal?: boolean;
  labelWidth?: string;
  labelSize?: string;
  dropdownSide?: "top" | "bottom" | "left" | "right";
  dropdownAlign?: "start" | "center" | "end";
};

const SelectField = ({
  id,
  label,
  value,
  options,
  error,
  required = false,
  placeholder,
  autoSelectFirst = false,
  register,
  onChange,
  className = "",
  labelClassName = "",
  selectClassName = "",
  selectWidth = "",
  horizontal = true,
  labelWidth = "md:w-28",
  labelSize = "text-sm",
  dropdownSide = "bottom",
  dropdownAlign = "end",
}: SelectFieldProps) => {
  const autoValue =
    autoSelectFirst && !value && options.length > 0
      ? String(options[0].value)
      : value !== undefined
        ? String(value)
        : "";

  const wrapperClass = horizontal
    ? "flex flex-col md:flex-row md:items-center gap-2"
    : "flex flex-col md:flex-row gap-1";

  const labelClass = cn(
    "flex items-center gap-1",
    horizontal ? labelWidth : "",
    labelSize,
    labelClassName,
  );

  const handleChange = (val: string) => {
    onChange?.(val);
    if (register) {
      register.onChange({
        target: {
          name: register.name,
          value: val,
        },
      });
    }
  };

  return (
    <div className={cn(wrapperClass, className)}>
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

      <div className={horizontal ? "flex-1 w-full" : "w-full"}>
        <ErrorTooltip error={error}>
          <Select value={autoValue} onValueChange={handleChange}>
            <SelectTrigger
              id={id}
              className={cn(
                "w-full",
                error ? "!border-red-400 focus-visible:ring-red-400" : "",
                selectWidth,
                selectClassName,
              )}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>

            <SelectContent side={dropdownSide} align={dropdownAlign}>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ErrorTooltip>
      </div>
    </div>
  );
};

export default SelectField;
