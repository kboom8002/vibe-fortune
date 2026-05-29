"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuccessToastProps {
  message?: string;
  duration?: number;
  onDismiss?: () => void;
  className?: string;
}

export function SuccessToast({
  message,
  duration = 3000,
  onDismiss,
  className,
}: SuccessToastProps) {
  const [visible, setVisible] = useState(!!message);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!visible || !message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-xs text-emerald-400 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300",
        className
      )}
    >
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
