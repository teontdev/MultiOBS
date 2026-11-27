import { FolderOpen, MonitorPlay, MoreHorizontal, Pencil, Play, Plus, Settings, Square, Trash2, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorText, type AppState, type Instance } from "./api";
import { CreateDialog, DeleteDialog, RenameDialog, SettingsDialog } from "./components/Dialogs";
import { ToastRegion, useToasts } from "./components/Toasts";
import { Button, IconButton, cn, usePresence } from "./components/ui";

const POLL_MS = 2000;

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renaming, setRenaming] = useState<Instance | null>(null);
  const [deleting, setDeleting] = useState<Instance | null>(null);
  const { toasts, push, dismiss } = useToasts();

  const seq = useRef(0);
  const failed = useRef(false);
  const reload = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const s = await api.getState();
      failed.current = false;
      if (mine === seq.current) setState(s); // bỏ kết quả poll cũ về muộn
    } catch (e) {
      // Poll 2s/lần: chỉ báo lần lỗi đầu, không đè toast lỗi của thao tác khác.
      if (!failed.current) push({ kind: "error", title: "Không đọc được danh sách instance", detail: errorText(e) });
      failed.current = true;
    }
  }, [push]);

  // OBS có thể bị đóng ngoài app, nên làm mới trạng thái chạy định kỳ.
  useEffect(() => {
    reload();
    const t = setInterval(reload, POLL_MS);
    return () => clearInterval(t);
  }, [reload]);

  const done = (message: string) => {
    setCreating(false);
    setSettingsOpen(false);
    setRenaming(null);
    setDeleting(null);
    push({ kind: "success", title: message });
    reload();
  };

  const act = async (inst: Instance, fn: () => Promise<void>, failTitle: string, okTitle?: string) => {
    setBusyIds((b) => new Set(b).add(inst.id));
    try {
      await fn();
      if (okTitle) push({ kind: "success", title: okTitle });
      await reload();
    } catch (e) {
      push({ kind: "error", title: failTitle, detail: errorText(e) });
    } finally {
      setBusyIds((b) => {
        const next = new Set(b);
        next.delete(inst.id);
        return next;
      });
    }
  };

  const instances = state?.instances ?? [];

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-surface px-6">
        <h1 className="text-base font-semibold">Instance OBS</h1>
        <div className="ml-auto flex items-center gap-2">
          <IconButton icon={Settings} label="Cài đặt" onClick={() => setSettingsOpen(true)} />
          {instances.length > 0 ? (
            <Button variant="primary" icon={Plus} onClick={() => setCreating(true)} disabled={!state?.obs_ok}>
              Thêm instance
            </Button>
          ) : null}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {state && !state.obs_ok ? (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <TriangleAlert className="size-5 shrink-0 text-amber-700" aria-hidden />
              <p className="min-w-0 flex-1 text-sm text-pretty text-amber-700">
                Chưa tìm thấy OBS Studio. Chọn thư mục cài OBS để tạo và mở instance.
              </p>
              <Button onClick={() => setSettingsOpen(true)} className="shrink-0">
                Chọn thư mục OBS
              </Button>
            </div>
          ) : null}

          {state === null ? (
            <ListSkeleton />
          ) : instances.length === 0 ? (
            <EmptyState disabled={!state.obs_ok} onCreate={() => setCreating(true)} />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
              {instances.map((inst) => (
                <InstanceRow
                  key={inst.id}
                  inst={inst}
                  busy={busyIds.has(inst.id)}
                  canLaunch={!!state.obs_ok}
                  onLaunch={() => act(inst, () => api.launchInstance(inst.id), `Không mở được "${inst.name}"`)}
                  onStop={() => act(inst, () => api.stopInstance(inst.id), `Không dừng được "${inst.name}"`, "Đã gửi lệnh đóng. Nếu OBS đang mở hộp thoại, đóng hộp thoại đó trước")}
                  onRename={() => setRenaming(inst)}
                  onOpenDir={() => api.openDir(inst.id).catch((e) => push({ kind: "error", title: "Không mở được thư mục", detail: errorText(e) }))}
                  onDelete={() => setDeleting(inst)}
                />
              ))}
            </ul>
          )}
        </div>
      </main>

      <CreateDialog open={creating} defaultDir={state?.default_dir ?? null} onClose={() => setCreating(false)} onDone={done} />
      <RenameDialog instance={renaming} onClose={() => setRenaming(null)} onDone={done} />
      <SettingsDialog
        open={settingsOpen}
        current={state?.obs_root ?? null}
        currentDefaultDir={state?.default_dir ?? null}
        onClose={() => setSettingsOpen(false)} onDone={done} />
      <DeleteDialog instance={deleting} onClose={() => setDeleting(null)} onDone={done} />
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function InstanceRow(props: {
  inst: Instance;
  busy: boolean;
  canLaunch: boolean;
  onLaunch: () => void;
  onStop: () => void;
  onRename: () => void;
  onOpenDir: () => void;
  onDelete: () => void;
}) {
  const { inst, busy } = props;
  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate text-sm font-medium" title={inst.name}>
            {inst.name}
          </p>
          {inst.running ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
              Đang chạy
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate font-mono text-xs text-muted" title={inst.dir}>
          {inst.dir}
        </p>
      </div>
      {inst.running ? (
        <Button variant="danger" icon={Square} isLoading={busy} onClick={props.onStop} className="shrink-0">
          Dừng
        </Button>
      ) : (
        <Button icon={Play} isLoading={busy} disabled={!props.canLaunch} onClick={props.onLaunch} className="shrink-0">
          Mở
        </Button>
      )}
      <RowMenu
        label={`Thao tác cho ${inst.name}`}
        items={[
          { label: "Đổi tên", icon: Pencil, onSelect: props.onRename },
          { label: "Mở thư mục", icon: FolderOpen, onSelect: props.onOpenDir },
          { label: "Xoá", icon: Trash2, onSelect: props.onDelete, danger: true, disabled: inst.running, hint: inst.running ? "Dừng OBS trước khi xoá" : undefined },
        ]}
      />
    </li>
  );
}

type MenuItem = { label: string; icon: typeof Pencil; onSelect: () => void; danger?: boolean; disabled?: boolean; hint?: string };

/** Dropdown theo overlay.md: mọc từ nút (origin-top-right), 150ms vào / 100ms ra; mục xoá trung tính, rê mới đỏ. */
function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const { mounted, shown } = usePresence(open);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <IconButton icon={MoreHorizontal} label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} />
      {mounted ? (
        <div
          role="menu"
          className={cn(
            "absolute top-full right-0 z-30 mt-1 w-52 origin-top-right rounded-xl border border-border bg-surface-overlay p-1 shadow-popover",
            "transition-[opacity,scale,translate] motion-reduce:transition-opacity",
            shown ? "translate-y-0 scale-100 opacity-100 duration-150 ease-out" : "-translate-y-1 scale-95 opacity-0 duration-100 ease-in motion-reduce:translate-y-0 motion-reduce:scale-100",
          )}
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              title={it.hint}
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
              className={cn(
                "flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left text-sm outline-hidden transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-50",
                it.danger ? "enabled:hover:bg-rose-500/10 enabled:hover:text-rose-700" : "hover:bg-item-hover",
              )}
            >
              <it.icon className="size-4 shrink-0" aria-hidden />
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ onCreate, disabled }: { onCreate: () => void; disabled: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-background">
        <MonitorPlay className="size-6 text-muted" aria-hidden />
      </div>
      <p className="mt-4 text-base font-semibold">Chưa có instance nào</p>
      <p className="mt-1 max-w-[46ch] text-sm text-pretty text-muted">
        Mỗi instance là một OBS riêng cho một account, chạy song song với các instance khác.
      </p>
      <Button variant="primary" icon={Plus} onClick={onCreate} disabled={disabled} className="mt-6">
        Thêm instance
      </Button>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul aria-hidden className="divide-y divide-border rounded-xl border border-border bg-surface">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-background" />
            <div className="h-3 w-64 animate-pulse rounded bg-background" />
          </div>
          <div className="h-10 w-20 animate-pulse rounded-xl bg-background" />
          <div className="size-10 animate-pulse rounded-xl bg-background" />
        </li>
      ))}
    </ul>
  );
}
