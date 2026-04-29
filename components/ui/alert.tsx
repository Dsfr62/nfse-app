import * as React from "react";

import { cn } from "@/lib/utils";

type AlertVariant = "default" | "success" | "warning" | "danger";

const variants: Record<AlertVariant, string> = {
  default: "border-slate-200 bg-white text-slate-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  danger: "border-red-200 bg-red-50 text-red-900"
};

export function Alert({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }) {
  return <div className={cn("rounded-lg border p-4 text-sm", variants[variant], className)} {...props} />;
}
