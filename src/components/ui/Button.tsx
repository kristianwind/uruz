import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-strong active:brightness-95",
  secondary:
    "bg-elev-2 text-text border border-border-strong hover:border-accent active:brightness-95",
  ghost: "bg-transparent text-muted hover:text-text hover:bg-elev-2",
  danger: "bg-danger text-white hover:brightness-110 active:brightness-95",
  success: "bg-success text-white hover:brightness-110 active:brightness-95",
};

const SIZES: Record<Size, string> = {
  // Large, thumb-friendly touch targets by default (spec §11).
  sm: "h-9 px-3 text-sm rounded-lg gap-1.5",
  md: "h-12 px-5 text-base rounded-xl gap-2",
  lg: "h-14 px-6 text-lg rounded-xl gap-2.5",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", fullWidth, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline-2 focus-visible:outline-accent",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
});
