import { cn } from "@/lib/utils";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { CircleIcon } from "lucide-react";
import * as React from "react";

function RadioGroup({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  const layoutClass =
    orientation === "horizontal"
      ? "flex flex-row items-center gap-3"
      : "flex flex-col gap-3";
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      orientation={orientation}
      className={cn(layoutClass, className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      {...props}
      className={cn(
        "border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon className="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

type LabelPosition = "right" | "left" | "top" | "bottom";

interface RadioItemWithLabelProps extends React.ComponentProps<
  typeof RadioGroupPrimitive.Item
> {
  label?: React.ReactNode;
  labelPosition?: LabelPosition;
  // optional wrapper classname for spacing/layout
  wrapperClassName?: string;
  labelClassName?: string;
}

function RadioItemWithLabel({
  label,
  labelPosition = "right",
  wrapperClassName,
  labelClassName,
  id,
  value,
  ...props
}: RadioItemWithLabelProps) {
  // ensure an id so <label htmlFor> works; prefer provided id, otherwise make one from value
  const itemId = id ?? `radio-${String(value)}`;

  // layout depending on labelPosition
  const isHorizontal = labelPosition === "left" || labelPosition === "right";
  const containerClass = isHorizontal
    ? "flex items-center gap-2"
    : "flex flex-col gap-1";

  // For left label we want label then item; for right item then label
  const labelEl = label ? (
    <label htmlFor={itemId} className={cn("text-sm", labelClassName)}>
      {label}
    </label>
  ) : null;

  return (
    <div className={cn(containerClass, wrapperClassName)}>
      {labelPosition === "left" && labelEl}
      <RadioGroupPrimitive.Item id={itemId} value={value} {...props}>
        <RadioGroupPrimitive.Indicator className="relative flex items-center justify-center">
          <CircleIcon className="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
      {(labelPosition === "right" ||
        labelPosition === "top" ||
        labelPosition === "bottom") &&
        (labelPosition === "right" ? labelEl : labelEl)}
    </div>
  );
}

export { RadioGroup, RadioGroupItem, RadioItemWithLabel };
