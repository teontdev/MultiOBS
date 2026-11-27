import { open as openPicker } from "@tauri-apps/plugin-dialog";
import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorText, type Instance } from "../api";
import { useT } from "../i18n";
import { Button, Field, Modal, TextInput, cn, inputClasses } from "./ui";

async function pickFolder(title: string) {
  const picked = await openPicker({ directory: true, multiple: false, title });
  return typeof picked === "string" ? picked : null;
}

function ErrorLine({ text }: { text: string | null }) {
  return (
    <p role="alert" className="min-h-4 text-xs text-red-600">
      {text}
    </p>
  );
}

/** Ô chỉ đọc + nút chọn thư mục. Bấm vào ô cũng mở hộp chọn. */
function FolderInput({ id, value, onPick, title }: { id: string; value: string; onPick: (v: string) => void; title: string }) {
  const { t } = useT();
  const [picking, setPicking] = useState(false);
  const choose = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const v = await pickFolder(title);
      if (v) onPick(v);
    } catch {
      // Hộp chọn thư mục lỗi hoặc bị huỷ: giữ nguyên giá trị cũ.
    } finally {
      setPicking(false);
    }
  };
  return (
    <div className="flex gap-2">
      <input
        id={id}
        readOnly
        value={value}
        title={value}
        placeholder={t.noFolder}
        onClick={choose}
        className={cn(inputClasses, "min-w-0 flex-1 cursor-pointer truncate")}
      />
      <Button onClick={choose} className="min-h-11 shrink-0 md:min-h-10">
        {t.chooseFolder}
      </Button>
    </div>
  );
}

function useFormState(open: boolean) {
  const { t } = useT();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setError(null);
      setBusy(false);
    }
  }, [open]);
  const run = async (fn: () => Promise<void>, onDone: () => void) => {
    if (busy) return; // Enter lần 2 khi lệnh đang chạy
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone();
    } catch (e) {
      setError(errorText(e) ?? t.unknownError);
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, run };
}

type Done = (message: string) => void;

/** Tên instance thành tên thư mục Windows hợp lệ: thay ký tự cấm, bỏ dấu chấm/khoảng trắng cuối. */
export function folderName(name: string) {
  // eslint-disable-next-line no-control-regex
  return name.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, "-").replace(/[. ]+$/, "")
    .replace(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i, "_$&"); // tên thiết bị Windows
}

/** Thêm instance mới; có `source` thì là nhân bản (spec 004): tên để trống, chép config của nguồn. */
export function CreateDialog({
  open,
  source: sourceProp,
  defaultDir,
  onClose,
  onDone,
}: {
  open: boolean;
  source?: Instance | null;
  defaultDir: string | null;
  onClose: () => void;
  onDone: Done;
}) {
  // Giữ nguồn cuối khi đang đóng để tiêu đề không nháy về "Thêm instance" lúc chạy hiệu ứng ra.
  const last = useRef(sourceProp);
  if (sourceProp) last.current = sourceProp;
  const source = sourceProp === undefined ? null : last.current;
  const { t } = useT();
  const [name, setName] = useState("");
  // Thư mục chọn tay; null = tự điền <thư mục mặc định>\<tên>.
  const [picked, setPicked] = useState<string | null>(null);
  const { error, busy, run } = useFormState(open);
  useEffect(() => {
    if (open) {
      setName("");
      setPicked(null);
    }
  }, [open]);
  const auto = defaultDir && folderName(name) ? `${defaultDir.replace(/\\+$/, "")}\\${folderName(name)}` : "";
  const dir = picked ?? auto;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const fn = source ? () => api.duplicateInstance(source.id, name, dir) : () => api.createInstance(name, dir);
    run(fn, () => onDone(t.created(name.trim())));
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title={source ? t.duplicateTitle : t.addInstance}
      description={
        source ? (
          <>
            {t.duplicateDesc}<span className="font-medium text-foreground">{source.name}</span>.
          </>
        ) : (
          t.createDesc
        )
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy} className="min-h-11 md:min-h-10">
            {t.cancel}
          </Button>
          <Button variant="primary" type="submit" form="create-form" isLoading={busy} disabled={!name.trim() || !dir} className="min-h-11 md:min-h-10">
            {source ? t.duplicate : t.createButton}
          </Button>
        </>
      }
    >
      <form id="create-form" onSubmit={submit} className="space-y-4">
        {source ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-pretty text-amber-700">
            {t.streamKeyWarn}
          </p>
        ) : null}
        <Field label={t.name}>{(id) => <TextInput id={id} autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />}</Field>
        <Field
          label={t.saveDir}
          hint={
            defaultDir && picked === null ? (
              auto ? (
                <>
                  {t.willCreate}<span className="font-mono break-all">{auto}</span>
                </>
              ) : (
                t.typeNameHint
              )
            ) : (
              t.saveDirHint
            )
          }
        >
          {(id) => <FolderInput id={id} value={dir} onPick={setPicked} title={t.pickInstanceDir} />}
        </Field>
        <ErrorLine text={error} />
      </form>
    </Modal>
  );
}

export function RenameDialog({ instance, onClose, onDone }: { instance: Instance | null; onClose: () => void; onDone: Done }) {
  const [name, setName] = useState("");
  const { t } = useT();
  const { error, busy, run } = useFormState(!!instance);
  useEffect(() => {
    if (instance) setName(instance.name);
  }, [instance]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!instance) return;
    run(() => api.renameInstance(instance.id, name), () => onDone(t.renamed));
  };
  return (
    <Modal
      open={!!instance}
      onClose={onClose}
      busy={busy}
      title={t.renameTitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy} className="min-h-11 md:min-h-10">
            {t.cancel}
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="rename-form"
            isLoading={busy}
            disabled={!name.trim() || name.trim() === instance?.name}
            className="min-h-11 md:min-h-10"
          >
            {t.save}
          </Button>
        </>
      }
    >
      <form id="rename-form" onSubmit={submit} className="space-y-4">
        <Field label={t.name}>{(id) => <TextInput id={id} autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />}</Field>
        <ErrorLine text={error} />
      </form>
    </Modal>
  );
}

export function SettingsDialog({
  open,
  current,
  currentDefaultDir,
  onClose,
  onDone,
}: {
  open: boolean;
  current: string | null;
  currentDefaultDir: string | null;
  onClose: () => void;
  onDone: Done;
}) {
  const [root, setRoot] = useState("");
  const { t } = useT();
  const [defDir, setDefDir] = useState("");
  const { error, busy, run } = useFormState(open);
  useEffect(() => {
    if (open) {
      setRoot(current ?? "");
      setDefDir(currentDefaultDir ?? "");
    }
  }, [open, current, currentDefaultDir]);
  const unchanged = root === (current ?? "") && defDir === (currentDefaultDir ?? "");
  const save = () =>
    run(() => api.saveSettings(root && root !== current ? root : null, defDir || null), () => onDone(t.settingsSaved));
  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title={t.settings}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy} className="min-h-11 md:min-h-10">
            {t.cancel}
          </Button>
          <Button variant="primary" isLoading={busy} disabled={unchanged} onClick={save} className="min-h-11 md:min-h-10">
            {t.save}
          </Button>
        </>
      }
    >
      <Field label={t.obsDir} hint={t.obsDirHint(<span className="font-mono">bin\64bit\obs64.exe</span>)}>
        {(id) => <FolderInput id={id} value={root} onPick={setRoot} title={t.pickObsInstall} />}
      </Field>
      <Field label={t.defaultDir} hint={t.defaultDirHint}>
        {(id) => (
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <FolderInput id={id} value={defDir} onPick={setDefDir} title={t.pickDefaultDir} />
            </div>
            {defDir ? (
              <Button variant="ghost" onClick={() => setDefDir("")} className="min-h-11 shrink-0 md:min-h-10">
                {t.clear}
              </Button>
            ) : null}
          </div>
        )}
      </Field>
      <ErrorLine text={error} />
    </Modal>
  );
}

export function DeleteDialog({ instance, onClose, onDone }: { instance: Instance | null; onClose: () => void; onDone: Done }) {
  const { t } = useT();
  const [deleteFiles, setDeleteFiles] = useState(false);
  const { error, busy, run } = useFormState(!!instance);
  useEffect(() => {
    if (instance) setDeleteFiles(false);
  }, [instance]);
  return (
    <Modal
      open={!!instance}
      onClose={onClose}
      busy={busy}
      role="alertdialog"
      hideClose
      title={
        <span className="flex items-center gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
            <Trash2 className="size-5 text-rose-700" aria-hidden />
          </span>
          {t.deleteTitle}
        </span>
      }
      description={
        <span className="block pl-14">
          <span className="font-medium text-foreground">{instance?.name}</span>
          {t.deleteRemoved}
          {deleteFiles ? t.deleteFilesToo : t.deleteKeepFiles}
        </span>
      }
      footer={
        <>
          <Button variant="secondary" autoFocus onClick={onClose} disabled={busy} className="min-h-11 md:min-h-10">
            {t.cancel}
          </Button>
          <Button
            variant="danger"
            isLoading={busy}
            onClick={() => instance && run(() => api.deleteInstance(instance.id, deleteFiles), () => onDone(t.deleted(instance.name)))}
            className="min-h-11 md:min-h-10"
          >
            {t.deleteButton}
          </Button>
        </>
      }
    >
      <div className="pl-14">
        <label className="flex w-fit cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" checked={deleteFiles} onChange={(e) => setDeleteFiles(e.target.checked)} className="mt-0.5 size-4 cursor-pointer accent-rose-600" />
          <span>
            {t.deleteFilesLabel}
            <span className="mt-0.5 block font-mono text-xs break-all text-muted">{instance?.dir}</span>
          </span>
        </label>
        <ErrorLine text={error} />
      </div>
    </Modal>
  );
}
