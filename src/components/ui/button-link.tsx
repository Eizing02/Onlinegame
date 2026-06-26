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
        "inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition",
        variant === "primary"
          ? "bg-primary text-white hover:bg-primary-dark"
          : "border border-border bg-white text-foreground hover:bg-surface",
        className,
      )}
    >
      {children}
    </Link>
  );
}
