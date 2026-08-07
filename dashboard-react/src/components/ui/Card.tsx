import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white shadow-sm ring-1 ring-outline p-3 md:p-5",
        className
      )}
    >
      {children}
    </div>
  );
}
