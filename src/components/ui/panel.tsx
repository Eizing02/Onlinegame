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
        "rounded-2xl border border-border bg-panel p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}
