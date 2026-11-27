// Toast theo overlay.md: đáy phải, xong việc tự tắt 4s không nút đóng; lỗi có nút đóng, không tự tắt.
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { cn } from "./ui";

export type Toast = { id: number; kind: "success" | "error"; title: string; detail?: string };

export function useToasts() {
  const [toasts, setToasts] = useState<(Toast & { leaving?: boolean })[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 200);
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++seq.current;
      setToasts((ts) => [...ts, { ...t, id }].slice(-3));
      if (t.kind === "success") setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  return { toasts, push, dismiss };
}

function ToastItem({ toast, onDismiss }: { toast: Toast & { leaving?: boolean }; onDismiss: () => void }) {
  const { t } = useT();
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    return () => cancelAnimationFrame(raf);
  }, []);
  const visible = entered && !toast.leaving;
  const isError = toast.kind === "error";
  const Icon = isError ? CircleAlert : CircleCheck;
  return (
    <div
      role={isError ? "alert" : undefined}
      className={cn(
        "flex w-auto max-w-md min-w-72 items-center gap-3 rounded-2xl border border-border bg-surface-overlay py-3 pr-3 pl-4 shadow-popover",
        "transition-[opacity,translate] motion-reduce:transition-opacity",
        visible ? "translate-y-0 opacity-100 duration-300 ease-out" : "translate-y-full opacity-0 duration-200 ease-in motion-reduce:translate-y-0",
      )}
    >
      <Icon className={cn("size-5 shrink-0", isError ? "text-red-600" : "text-emerald-600")} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm text-pretty", toast.detail && "font-medium")}>{toast.title}</p>
        {toast.detail ? <p className="text-sm text-pretty text-muted [overflow-wrap:anywhere]">{toast.detail}</p> : null}
      </div>
      {isError ? (
        <button
          type="button"
          aria-label={t.closeToast}
          onClick={onDismiss}
          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted outline-hidden hover:bg-item-hover hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export function ToastRegion({ toasts, onDismiss }: { toasts: (Toast & { leaving?: boolean })[]; onDismiss: (id: number) => void }) {
  return (
    <section aria-live="polite" className="pointer-events-none fixed right-6 bottom-6 z-50 flex flex-col items-end gap-2 [&>*]:pointer-events-auto">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </section>
  );
}
