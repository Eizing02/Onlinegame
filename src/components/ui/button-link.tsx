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
          ? "border border-primary/50 bg-primary text-white shadow-sm hover:border-cyan/50 hover:bg-primary-dark"
          : "border border-cyan/35 bg-cyan/10 text-cyan hover:border-cyan hover:bg-cyan/20",
        className,
      )}
    >
      {children}
    </Link>
  );
}
