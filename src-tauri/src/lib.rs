mod obs;

use obs::{err, tr, Instance, Store};
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::{Pid, ProcessesToUpdate, System};
use tauri::{Manager, State};

struct AppState {
    store_path: PathBuf,
    store: Mutex<Store>,
    sys: Mutex<System>,
}

#[derive(Serialize)]
struct InstanceView {
    id: String,
    name: String,
    dir: PathBuf,
    created_at: u64,
    running: bool,
}

#[derive(Serialize)]
struct StateView {
    obs_root: Option<PathBuf>,
    obs_ok: bool,
    default_dir: Option<PathBuf>,
    instances: Vec<InstanceView>,
}

type Res<T> = Result<T, String>;

impl AppState {
    fn save(&self, store: &Store) -> Res<()> {
        store.save(&self.store_path)
    }

    /// shortcut: matches by PID + process name only; a recycled PID that happens to be another
    /// obs64.exe would read as running. Upgrade to exe-path matching if that ever shows up.
    fn is_running(&self, inst: &Instance) -> bool {
        let Some(pid) = inst.pid else { return false };
        let sys = self.sys.lock().unwrap();
        sys.process(Pid::from_u32(pid))
            .is_some_and(|p| p.name().eq_ignore_ascii_case("obs64.exe"))
    }

    fn refresh(&self) {
        self.sys
            .lock()
            .unwrap()
            .refresh_processes(ProcessesToUpdate::All, true);
    }
}

#[tauri::command]
async fn get_state(state: State<'_, AppState>) -> Res<StateView> {
    state.refresh();
    let mut store = state.store.lock().unwrap();
    let mut dirty = false;
    let mut instances = Vec::with_capacity(store.instances.len());
    for i in 0..store.instances.len() {
        let running = state.is_running(&store.instances[i]);
        let inst = &mut store.instances[i];
        if !running && inst.pid.is_some() {
            inst.pid = None;
            dirty = true;
        }
        instances.push(InstanceView {
            id: inst.id.clone(),
            name: inst.name.clone(),
            dir: inst.dir.clone(),
            created_at: inst.created_at,
            running,
        });
    }
    if dirty {
        state.save(&store)?;
    }
    let obs_ok = store.obs_root.as_deref().is_some_and(|r| obs::obs_exe(r).is_file());
    Ok(StateView {
        obs_root: store.obs_root.clone(),
        obs_ok,
        // A default dir that vanished (deleted, drive unplugged) reads as unset, so the UI never
        // auto-fills under it and saving Settings is not blocked by the stale value.
        default_dir: store.default_dir.clone().filter(|d| d.is_dir()),
        instances,
    })
}

/// `default_dir: None` clears the default; `obs_root: None` keeps the current one.
#[tauri::command]
async fn save_settings(
    state: State<'_, AppState>,
    obs_root: Option<PathBuf>,
    default_dir: Option<PathBuf>,
) -> Res<()> {
    if let Some(root) = &obs_root {
        if !obs::obs_exe(root).is_file() {
            return Err(tr(
                "Không thấy bin\\64bit\\obs64.exe trong thư mục cài OBS đã chọn",
                "bin\\64bit\\obs64.exe was not found in the selected OBS folder",
            ));
        }
    }
    if let Some(dir) = &default_dir {
        if !dir.is_absolute() || !dir.is_dir() {
            return Err(tr("Thư mục lưu mặc định không tồn tại", "The default folder does not exist"));
        }
        if obs::in_sync_folder(dir, &obs::sync_roots()) {
            return Err(obs::onedrive_err());
        }
    }
    let mut store = state.store.lock().unwrap();
    if obs_root.is_some() {
        store.obs_root = obs_root;
    }
    store.default_dir = default_dir;
    state.save(&store)
}

/// Shared by create and duplicate: validate, make the folder, then roll back on any failure.
/// `source_id` = instance whose `config\` is copied (spec 004). It must be stopped, checked under
/// the same lock so it cannot be launched mid-copy (OBS rewrites its ini/scene files while running).
fn add_instance(state: &AppState, name: &str, dir: PathBuf, source_id: Option<&str>) -> Res<()> {
    if source_id.is_some() {
        state.refresh();
    }
    let mut store = state.store.lock().unwrap();
    let copy_from = match source_id {
        Some(id) => {
            let src = &store.instances[store.find(id)?];
            if state.is_running(src) {
                return Err(tr("Dừng OBS của instance nguồn trước khi nhân bản", "Stop the source instance's OBS before duplicating"));
            }
            Some(src.dir.clone())
        }
        None => None,
    };
    let name = store.validate_name(name, None)?;
    let root = store.obs_root.clone().ok_or_else(|| tr("Chưa chọn thư mục cài OBS", "The OBS install folder is not set"))?;
    obs::check_location(&dir, &root, store.instances.iter().map(|i| i.dir.as_path()))?;
    let existed = obs::prepare_dir(&dir)?;
    let id = uuid::Uuid::new_v4().to_string();
    let setup = obs::write_marker(&dir, &id)
        .and_then(|_| copy_from.map_or(Ok(()), |src| obs::copy_config(&src, &dir)))
        .and_then(|_| obs::link_obs(&dir, &root));
    if let Err(e) = setup {
        obs::rollback(&dir, existed);
        return Err(e);
    }
    let created_at = SystemTime::now().duration_since(UNIX_EPOCH).map_err(err)?.as_secs();
    store.instances.push(Instance { id, name, dir, created_at, pid: None });
    state.save(&store)
}

#[tauri::command]
fn set_language(en: bool) {
    obs::set_en(en);
}

#[tauri::command]
async fn create_instance(state: State<'_, AppState>, name: String, dir: PathBuf) -> Res<()> {
    add_instance(&state, &name, dir, None)
}

#[tauri::command]
async fn duplicate_instance(state: State<'_, AppState>, source_id: String, name: String, dir: PathBuf) -> Res<()> {
    add_instance(&state, &name, dir, Some(&source_id))
}

#[tauri::command]
async fn rename_instance(state: State<'_, AppState>, id: String, name: String) -> Res<()> {
    let mut store = state.store.lock().unwrap();
    let name = store.validate_name(&name, Some(&id))?;
    let idx = store.find(&id)?;
    store.instances[idx].name = name;
    state.save(&store)
}

#[tauri::command]
async fn delete_instance(state: State<'_, AppState>, id: String, delete_files: bool) -> Res<()> {
    state.refresh();
    let mut store = state.store.lock().unwrap();
    let idx = store.find(&id)?;
    if state.is_running(&store.instances[idx]) {
        return Err(tr("Dừng OBS của instance này trước khi xoá", "Stop this instance's OBS before deleting"));
    }
    let dir = store.instances[idx].dir.clone();
    if delete_files {
        obs::delete_dir(&dir, &id)?;
    } else {
        obs::unlink_obs(&dir)?;
    }
    store.instances.remove(idx);
    state.save(&store)
}

#[tauri::command]
async fn launch_instance(state: State<'_, AppState>, id: String) -> Res<()> {
    state.refresh();
    let mut store = state.store.lock().unwrap();
    let idx = store.find(&id)?;
    if state.is_running(&store.instances[idx]) {
        return Err(tr("OBS của instance này đang chạy", "This instance's OBS is already running"));
    }
    let root = store
        .obs_root
        .clone()
        .filter(|r| obs::obs_exe(r).is_file())
        .ok_or_else(|| tr("Chưa chọn thư mục cài OBS hợp lệ (mở Cài đặt)", "No valid OBS install folder (open Settings)"))?;
    let dir = store.instances[idx].dir.clone();
    if !dir.is_dir() {
        let d = dir.display();
        return Err(tr(&format!("Không thấy thư mục {d}"), &format!("Folder not found: {d}")));
    }
    // Relink from scratch: junctions may still point at an old OBS root after Settings changed it.
    obs::unlink_obs(&dir)?;
    obs::link_obs(&dir, &root)?;
    store.instances[idx].pid = Some(obs::launch(&dir)?);
    state.save(&store)
}

#[tauri::command]
async fn stop_instance(state: State<'_, AppState>, id: String) -> Res<()> {
    state.refresh();
    let store = state.store.lock().unwrap();
    let inst = &store.instances[store.find(&id)?];
    match inst.pid {
        Some(pid) if state.is_running(inst) => obs::stop(pid),
        _ => Ok(()),
    }
}

#[tauri::command]
async fn open_dir(state: State<'_, AppState>, id: String) -> Res<()> {
    let store = state.store.lock().unwrap();
    let dir = store.instances[store.find(&id)?].dir.clone();
    std::process::Command::new("explorer").arg(dir).spawn().map_err(err)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let store_path = app.path().app_data_dir()?.join("instances.json");
            let store = Store::load(&store_path);
            app.manage(AppState {
                store_path,
                store: Mutex::new(store),
                sys: Mutex::new(System::new()?),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_state,
            set_language,
            save_settings,
            create_instance,
            duplicate_instance,
            rename_instance,
            delete_instance,
            launch_instance,
            stop_instance,
            open_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
