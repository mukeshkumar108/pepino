import clsx from "clsx";
import type { ComponentPropsWithoutRef, ElementType } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "icon";

type ButtonProps<T extends ElementType = "button"> = {
  as?: T;
  variant?: ButtonVariant;
  className?: string;
  children?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

const base =
  "inline-flex items-center justify-center rounded-xl px-4 h-11 text-sm font-medium " +
  "transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-black/70 " +
  "active:scale-[0.99] disabled:opacity-50 gap-2";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-black text-white hover:opacity-90 dark:bg-white dark:text-black",
  secondary:
    "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 " +
    "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-850",
  ghost: "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  icon:
    "w-9 h-9 p-0 rounded-lg border border-transparent hover:bg-neutral-100 " +
    "dark:hover:bg-neutral-800",
};

export function Button<T extends ElementType = "button">({
  as,
  variant = "primary",
  className,
  leftIcon,
  rightIcon,
  children,
  ...props
}: ButtonProps<T>) {
  const As = (as ?? "button") as ElementType;
  const extra = As === "button" && !("type" in props) ? { type: "button" as const } : {};
  return (
    <As className={clsx(base, variantClasses[variant], className)} {...extra} {...(props as any)}>
      {leftIcon}
      {children}
      {rightIcon}
    </As>
  );
}
