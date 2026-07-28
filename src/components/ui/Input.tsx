import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, id, className, ...props },
  ref,
) {
  const inputId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "h-12 w-full rounded-xl border border-border bg-elev-2 px-4 text-base text-text",
          "placeholder:text-faint focus:border-accent focus:outline-none",
          className,
        )}
        {...props}
      />
      {hint && <p className="text-xs text-faint">{hint}</p>}
    </div>
  );
});
