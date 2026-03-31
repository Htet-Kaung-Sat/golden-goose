import { cn } from "@/lib/utils";

function TypographyH3({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "scroll-m-20 text-2xl font-bold border-b-amber-50 tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export { TypographyH3 };
