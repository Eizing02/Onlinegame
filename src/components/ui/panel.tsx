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
        "rounded-xl border border-border bg-panel/88 p-5 shadow-sm backdrop-blur",
        className,
      )}
    >
      {children}
    </section>
  );
}
