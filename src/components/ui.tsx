// Primitives theo skill ui-ux: button.md (I1, I4), input.md (I13), overlay.md (modal, chuyển động).
import { LoaderCircle, X, type LucideIcon } from "lucide-react";
import { useT } from "../i18n";
import {
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "outline" | "primary" | "secondary" | "ghost" | "danger";

function variantClasses(variant: Variant) {
  return cn(
    variant === "outline" && "border border-border-strong bg-surface text-foreground hover:bg-button-hover",
    variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary-hover",
    variant === "secondary" && "bg-secondary text-foreground hover:bg-secondary-hover",
    variant === "ghost" && "bg-transparent text-muted hover:bg-foreground/5 hover:text-foreground",
    // Nút nguy hiểm: nền rose mờ, chữ rose-700, luôn hiện (locked rule 2).
    variant === "danger" && "bg-rose-500/10 text-rose-700 hover:bg-rose-500/15",
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: LucideIcon;
  isLoading?: boolean;
};

export function Button({ variant = "outline", icon: Icon, isLoading, className, children, onClick, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      aria-disabled={isLoading || undefined}
      aria-busy={isLoading || undefined}
      onClick={(e) => (isLoading ? e.preventDefault() : onClick?.(e))}
      className={cn(
        "relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl",
        "min-h-10 px-4 py-2 text-sm font-medium transition-colors",
        "max-w-full text-center leading-tight [overflow-wrap:anywhere] outline-hidden",
        "disabled:cursor-not-allowed disabled:not-aria-busy:opacity-50 aria-busy:cursor-progress",
        variantClasses(variant),
        className,
      )}
    >
      {Icon ? (
        isLoading ? (
          <LoaderCircle className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
        ) : (
          <Icon className="size-4 shrink-0" aria-hidden />
        )
      ) : null}
      {/* Nút chỉ chữ: spinner đè giữa, chữ invisible để giữ bề rộng */}
      {!Icon && isLoading ? (
        <>
          <span className="invisible">{children}</span>
          <LoaderCircle className="absolute inset-0 m-auto size-4 animate-spin motion-reduce:animate-none" aria-hidden />
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cn(
        "inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border-strong bg-surface text-muted outline-hidden transition-colors hover:bg-button-hover hover:text-foreground aria-expanded:bg-button-hover",
        className,
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

export const inputClasses =
  "h-11 w-full rounded-xl border border-border-strong bg-surface px-4 text-base text-foreground outline-hidden transition-colors placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus md:h-10 md:text-sm";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block w-fit cursor-pointer text-sm font-medium">
        {label}
      </label>
      {children(id)}
      {hint ? <p className="text-xs text-muted text-pretty">{hint}</p> : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClasses, props.className)} />;
}

/** Giữ phần tử trong DOM thêm `exitMs` sau khi đóng để chạy chuyển động ra. */
export function usePresence(open: boolean, exitMs = 100) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs]);
  return { mounted, shown };
}

/** Modal có form: bấm ra ngoài không đóng (I20); Esc, ✕, Huỷ đóng. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  role = "dialog",
  hideClose,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer: ReactNode;
  role?: "dialog" | "alertdialog";
  hideClose?: boolean;
  /** Đang chạy lệnh: chặn Esc/✕ để lỗi không bị mất khi dialog đã đóng. */
  busy?: boolean;
}) {
  const { t } = useT();
  const { mounted, shown } = usePresence(open);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, busy]);
  if (!mounted) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-black/30 transition-opacity",
          shown ? "opacity-100 duration-150 ease-out" : "opacity-0 duration-100 ease-in",
        )}
      />
      <div
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-modal",
          "transition-[opacity,scale] motion-reduce:transition-opacity",
          shown ? "scale-100 opacity-100 duration-150 ease-out" : "scale-95 opacity-0 duration-100 ease-in motion-reduce:scale-100",
        )}
      >
        <div className={cn(!hideClose && "pr-10")}>
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description ? <p className="mt-2 text-sm/6 text-pretty text-muted">{description}</p> : null}
        </div>
        {!hideClose ? (
          <button
            type="button"
            aria-label={t.close}
            disabled={busy}
            onClick={onClose}
            className="absolute top-5 right-5 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted outline-hidden hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
        {children ? <div className="mt-6 space-y-4">{children}</div> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
      </div>
    </div>
  );
}
