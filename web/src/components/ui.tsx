import React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement> & { className?: string };

export function Card({ className = "", ...props }: DivProps) {
  return <div className={`rounded-xl border bg-white ${className}`} {...props} />;
}

export function CardHeader({ className = "", ...props }: DivProps) {
  return <div className={`border-b px-4 py-3 ${className}`} {...props} />;
}

export function CardTitle({ className = "", ...props }: DivProps) {
  return <div className={`text-base font-semibold text-slate-900 ${className}`} {...props} />;
}

export function CardBody({ className = "", ...props }: DivProps) {
  return <div className={`p-4 ${className}`} {...props} />;
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-white text-slate-900 border hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-500",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;
export function Label({ className = "", ...props }: LabelProps) {
  return <label className={`text-sm text-slate-600 ${className}`} {...props} />;
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export function Input({ className = "", ...props }: InputProps) {
  const { value, defaultValue, ...rest } = props as any;
  const safeValue = value ?? (defaultValue !== undefined ? undefined : "");
  return (
    <input
      className={`mt-1 w-full rounded-lg border px-3 py-2 ${className}`}
      value={safeValue}
      {...(rest as any)}
    />
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;
export function Select({ className = "", ...props }: SelectProps) {
  return <select className={`mt-1 w-full rounded-lg border px-3 py-2 ${className}`} {...props} />;
}

export function Field({ className = "", children, ...props }: DivProps) {
  return (
    <div className={`flex flex-col ${className}`} {...props}>
      {children}
    </div>
  );
}

type AlertProps = {
  variant?: "info" | "success" | "error";
  children: React.ReactNode;
} & DivProps;

export function Alert({ variant = "info", className = "", children, ...props }: AlertProps) {
  const styles: Record<NonNullable<AlertProps["variant"]>, string> = {
    info: "border-slate-200 bg-slate-50 text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    error: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-lg border p-3 text-sm ${styles[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.125em] ${className}`} />
  );
}
