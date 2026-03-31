import ErrorTooltip from "@/components/shared/ErrorTooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { UseFormRegisterReturn } from "react-hook-form";

type InputFieldProps = {
  id: string;
  label?: string;
  type?: string;
  autocomplete?: string;
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
  onChange?: (ve: React.ChangeEvent<HTMLInputElement>) => void;
  onInput?: (e: React.FormEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
};

const InputField = ({
  id,
  label = "",
  type = "text",
  autocomplete,
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
  onInput,
  onFocus,
  min,
  max,
  step,
}: InputFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const currentType = isPassword && showPassword ? "text" : type;

  const wrapperClass = horizontal
    ? "flex flex-col md:flex-row md:items-center gap-2"
    : "flex flex-col gap-1";

  const labelClass = cn(
    "flex items-center gap-1",
    horizontal ? labelWidth : "",
    labelSize,
    labelClassName,
  );

  const valueProps = value !== undefined ? { value } : { defaultValue };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    registerProps?.onChange?.(e);
    onChange?.(e);
  };
  return (
    <div className={wrapperClass}>
      <Label htmlFor={id} className={labelClass}>
        <span>{label}</span>
        {required && (
          <span className="text-red-500 text-[20px] leading-none relative -top-1">
            *
          </span>
        )}
      </Label>

      <div className={horizontal ? "flex" : ""}>
        <ErrorTooltip error={error}>
          <div className="relative">
            <Input
              id={id}
              type={currentType}
              {...valueProps}
              autoComplete={autocomplete}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              {...registerProps}
              min={min}
              max={max}
              step={step}
              onChange={handleChange}
              onInput={onInput}
              onFocus={onFocus}
              className={cn(
                "w-full h-10 rounded-md border px-2 transition-shadow",
                error
                  ? "!border-red-400 !ring-red-400 !focus:ring-red-400"
                  : "!focus:ring-blue-500",
                inputWidth,
                inputClassName,
                isPassword ? "pr-10" : "",
              )}
            />
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            )}
          </div>
        </ErrorTooltip>
      </div>
    </div>
  );
};

export default InputField;
