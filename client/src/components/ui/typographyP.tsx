import { cn } from "@/lib/utils";

function TypographyP({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <p
      className={cn("leading-7 [&:not(:first-child)]:mt-0", className)}
      {...props}
    />
  );
}

export { TypographyP };
