import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-start gap-2 whitespace-nowrap font-heading font-[var(--font-heading-weight)] text-sm transition-colors disabled:pointer-events-none disabled:opacity-45 rounded-[var(--radius-sm)] cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "text-[var(--color-accent-ink)] [background:var(--gradient-primary)] hover:brightness-110 active:brightness-95",
        secondary:
          "border-[length:var(--border-width)] border-[var(--color-border-strong)] text-[var(--color-text)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)]",
        ghost:
          "text-[var(--color-text)] bg-transparent border-[length:var(--border-width)] border-transparent hover:bg-[var(--color-surface)]",
        outline:
          "text-[var(--color-text)] bg-transparent border-[length:var(--border-width)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
      },
      size: {
        sm: "px-3 py-2 text-xs",
        md: "px-4 py-2.5",
        lg: "px-6 py-3.5 text-base",
        icon: "h-10 w-10 justify-center px-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
