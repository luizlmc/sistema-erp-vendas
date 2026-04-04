"use client";

import * as React from "react";

type ButtonVariant = "default" | "outline" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

function joinClasses(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(" ");
}

const variantClass: Record<ButtonVariant, string> = {
  default:
    "border border-[#2563eb] bg-[#2563eb] text-white hover:bg-[#1d4ed8] hover:border-[#1d4ed8]",
  outline:
    "border border-[#2a3045] bg-[#1e2332] text-[#cbd5e1] hover:border-[#3a4260] hover:text-[#e2e8f0]",
  destructive:
    "border border-[#991b1b] bg-[#7f1d1d] text-[#fee2e2] hover:bg-[#991b1b] hover:border-[#b91c1c]",
};

const sizeClass: Record<ButtonSize, string> = {
  default: "h-10 px-4 text-[14px]",
  sm: "h-8 px-3 text-[13px]",
  lg: "h-11 px-5 text-[15px]",
  icon: "h-10 w-10",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "default", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={joinClasses(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      type={type}
      {...props}
    />
  );
});

