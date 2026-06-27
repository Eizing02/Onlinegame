import Link from "next/link";

import { cn } from "@/lib/utils";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
        variant === "primary"
          ? "bg-primary text-white hover:bg-primary-dark"
          : "border border-border bg-panel/70 text-foreground hover:border-primary/70 hover:bg-primary/15",
        className,
      )}
    >
      {children}
    </Link>
  );
}
