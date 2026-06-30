import { ReactNode } from "react";

type ChipVariant = "ok" | "warn" | "danger" | "neutral";

interface ChipProps {
  variant?: ChipVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Chip({ variant = "neutral", icon, children, className }: ChipProps) {
  return (
    <span className={`chip chip--${variant} ${className ?? ""}`}>
      {icon}
      {children}
    </span>
  );
}
