import { invoke } from "@tauri-apps/api/core";

export type Instance = {
  id: string;
  name: string;
  dir: string;
  created_at: number;
  running: boolean;
};

export type AppState = {
  obs_root: string | null;
  obs_ok: boolean;
  default_dir: string | null;
  instances: Instance[];
};

export const api = {
  getState: () => invoke<AppState>("get_state"),
  /** obsRoot null = giữ nguyên; defaultDir null = bỏ thư mục mặc định. */
  saveSettings: (obsRoot: string | null, defaultDir: string | null) =>
    invoke<void>("save_settings", { obsRoot, defaultDir }),
  createInstance: (name: string, dir: string) => invoke<void>("create_instance", { name, dir }),
  renameInstance: (id: string, name: string) => invoke<void>("rename_instance", { id, name }),
  deleteInstance: (id: string, deleteFiles: boolean) =>
    invoke<void>("delete_instance", { id, deleteFiles }),
  launchInstance: (id: string) => invoke<void>("launch_instance", { id }),
  stopInstance: (id: string) => invoke<void>("stop_instance", { id }),
  openDir: (id: string) => invoke<void>("open_dir", { id }),
};

export function errorText(e: unknown): string {
  return typeof e === "string" ? e : e instanceof Error ? e.message : "Có lỗi không xác định";
}
