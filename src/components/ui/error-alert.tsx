"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorAlertProps {
  message?: string;
  className?: string;
}

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-xs text-red-400 flex items-center gap-2",
        className
      )}
    >
      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
