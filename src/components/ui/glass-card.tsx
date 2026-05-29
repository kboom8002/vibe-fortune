import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "subtle";
  padding?: "sm" | "md" | "lg";
}

export function GlassCard({
  children,
  className,
  variant = "default",
  padding = "lg",
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl backdrop-blur-md border",
        {
          "bg-zinc-900/30 border-zinc-800/80": variant === "default",
          "bg-zinc-900/40 border-zinc-800/80 shadow-xl": variant === "elevated",
          "bg-zinc-900/20 border-zinc-800/50": variant === "subtle",
        },
        {
          "p-5": padding === "sm",
          "p-6": padding === "md",
          "p-8": padding === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
