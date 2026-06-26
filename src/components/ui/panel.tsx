import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-white p-5 shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}
