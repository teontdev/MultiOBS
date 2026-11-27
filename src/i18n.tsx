// Từ điển giao diện (spec 005). `vi` là chuẩn; `en: Dict` để TypeScript báo thiếu key.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";

const vi = {
  appTitle: "Instance OBS",
  settings: "Cài đặt",
  addInstance: "Thêm instance",
  switchLang: "Switch to English",
  langButton: "EN",
  obsMissing: "Chưa tìm thấy OBS Studio. Chọn thư mục cài OBS để tạo và mở instance.",
  pickObsDir: "Chọn thư mục OBS",
  running: "Đang chạy",
  open: "Mở",
  stop: "Dừng",
  rename: "Đổi tên",
  duplicate: "Nhân bản",
  openFolder: "Mở thư mục",
  delete: "Xoá",
  stopBeforeDelete: "Dừng OBS trước khi xoá",
  stopBeforeDuplicate: "Dừng OBS trước khi nhân bản",
  rowActions: (n: string) => `Thao tác cho ${n}`,
  launchFailed: (n: string) => `Không mở được "${n}"`,
  stopFailed: (n: string) => `Không dừng được "${n}"`,
  stopSent: "Đã gửi lệnh đóng. Nếu OBS đang mở hộp thoại, đóng hộp thoại đó trước",
  openFolderFailed: "Không mở được thư mục",
  loadFailed: "Không đọc được danh sách instance",
  unknownError: "Có lỗi không xác định",
  emptyTitle: "Chưa có instance nào",
  emptyBody: "Mỗi instance là một OBS riêng cho một account, chạy song song với các instance khác.",
  close: "Đóng",
  closeToast: "Đóng thông báo",
  cancel: "Huỷ",
  save: "Lưu",
  clear: "Bỏ",
  name: "Tên",
  noFolder: "Chưa chọn thư mục",
  chooseFolder: "Chọn thư mục",
  created: (n: string) => `Đã tạo instance "${n}"`,
  duplicateTitle: "Nhân bản instance",
  duplicateDesc: "Instance mới chép toàn bộ cấu hình (profile, scene, cài đặt) từ ",
  createDesc: "Mỗi instance là một OBS riêng, có profile, scene và stream key riêng.",
  createButton: "Tạo instance",
  streamKeyWarn: "Stream key cũng được chép. Đổi stream key trong OBS mới, nếu không hai OBS sẽ phát vào cùng một kênh.",
  saveDir: "Thư mục lưu",
  willCreate: "Sẽ tạo: ",
  typeNameHint: "Nhập tên để tự đặt thư mục trong thư mục mặc định.",
  saveDirHint: "OBS sẽ lưu toàn bộ cấu hình của instance trong thư mục này. Thư mục phải trống.",
  pickInstanceDir: "Chọn thư mục lưu dữ liệu instance",
  renameTitle: "Đổi tên instance",
  renamed: "Đã đổi tên instance",
  obsDir: "Thư mục cài OBS",
  obsDirHint: (exe: ReactNode) => <>Thư mục chứa {exe}, thường là C:\Program Files\obs-studio.</>,
  pickObsInstall: "Chọn thư mục cài OBS Studio",
  defaultDir: "Thư mục lưu instance mặc định",
  defaultDirHint: "Khi thêm instance, thư mục lưu tự đặt là <thư mục này>\\<tên instance>. Bỏ trống để luôn chọn tay.",
  pickDefaultDir: "Chọn thư mục lưu instance mặc định",
  settingsSaved: "Đã lưu cài đặt",
  deleteTitle: "Xoá instance?",
  deleteRemoved: " sẽ bị gỡ khỏi danh sách. ",
  deleteFilesToo: "Thư mục dữ liệu cũng bị xoá, không khôi phục được.",
  deleteKeepFiles: "Thư mục dữ liệu vẫn giữ nguyên.",
  deleteButton: "Xoá instance",
  deleteFilesLabel: "Xoá cả thư mục dữ liệu",
  deleted: (n: string) => `Đã xoá instance "${n}"`,
};

type Dict = typeof vi;

const en: Dict = {
  appTitle: "OBS instances",
  settings: "Settings",
  addInstance: "Add instance",
  switchLang: "Chuyển sang tiếng Việt",
  langButton: "VI",
  obsMissing: "OBS Studio not found. Choose the OBS install folder to create and open instances.",
  pickObsDir: "Choose OBS folder",
  running: "Running",
  open: "Open",
  stop: "Stop",
  rename: "Rename",
  duplicate: "Duplicate",
  openFolder: "Open folder",
  delete: "Delete",
  stopBeforeDelete: "Stop OBS before deleting",
  stopBeforeDuplicate: "Stop OBS before duplicating",
  rowActions: (n) => `Actions for ${n}`,
  launchFailed: (n) => `Could not open "${n}"`,
  stopFailed: (n) => `Could not stop "${n}"`,
  stopSent: "Close request sent. If OBS is showing a dialog, close that dialog first",
  openFolderFailed: "Could not open the folder",
  loadFailed: "Could not read the instance list",
  unknownError: "Unknown error",
  emptyTitle: "No instances yet",
  emptyBody: "Each instance is a separate OBS for one account, running side by side with the others.",
  close: "Close",
  closeToast: "Dismiss notification",
  cancel: "Cancel",
  save: "Save",
  clear: "Clear",
  name: "Name",
  noFolder: "No folder selected",
  chooseFolder: "Choose folder",
  created: (n) => `Created instance "${n}"`,
  duplicateTitle: "Duplicate instance",
  duplicateDesc: "The new instance copies the full configuration (profiles, scenes, settings) from ",
  createDesc: "Each instance is a separate OBS with its own profiles, scenes and stream key.",
  createButton: "Create instance",
  streamKeyWarn: "The stream key is copied too. Change it in the new OBS, or both will stream to the same channel.",
  saveDir: "Data folder",
  willCreate: "Will create: ",
  typeNameHint: "Type a name to place the folder inside the default folder.",
  saveDirHint: "OBS stores all of this instance's settings in this folder. The folder must be empty.",
  pickInstanceDir: "Choose the instance data folder",
  renameTitle: "Rename instance",
  renamed: "Instance renamed",
  obsDir: "OBS install folder",
  obsDirHint: (exe) => <>The folder containing {exe}, usually C:\Program Files\obs-studio.</>,
  pickObsInstall: "Choose the OBS Studio install folder",
  defaultDir: "Default instance folder",
  defaultDirHint: "New instances are placed in <this folder>\\<instance name>. Leave empty to always choose manually.",
  pickDefaultDir: "Choose the default instance folder",
  settingsSaved: "Settings saved",
  deleteTitle: "Delete instance?",
  deleteRemoved: " will be removed from the list. ",
  deleteFilesToo: "Its data folder is deleted too and cannot be recovered.",
  deleteKeepFiles: "Its data folder is kept.",
  deleteButton: "Delete instance",
  deleteFilesLabel: "Also delete the data folder",
  deleted: (n) => `Deleted instance "${n}"`,
};

export type Lang = "vi" | "en";
const dicts: Record<Lang, Dict> = { vi, en };

function initialLang(): Lang {
  const saved = localStorage.getItem("lang");
  if (saved === "vi" || saved === "en") return saved;
  return navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en";
}

const Ctx = createContext<{ t: Dict; lang: Lang; setLang: (l: Lang) => void } | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  useEffect(() => {
    localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
    api.setLanguage(lang === "en").catch(() => {}); // lỗi backend vẫn hiện, chỉ sai ngôn ngữ
  }, [lang]);
  return <Ctx.Provider value={{ t: dicts[lang], lang, setLang }}>{children}</Ctx.Provider>;
}

export function useT() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useT outside LangProvider");
  return c;
}
