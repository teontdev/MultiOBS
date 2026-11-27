mod obs;

use obs::{err, Instance, Store};
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
    Ok(StateView { obs_root: store.obs_root.clone(), obs_ok, instances })
}

#[tauri::command]
async fn set_obs_root(state: State<'_, AppState>, path: PathBuf) -> Res<()> {
    if !obs::obs_exe(&path).is_file() {
        return Err("Không thấy bin\\64bit\\obs64.exe trong thư mục này".into());
    }
    let mut store = state.store.lock().unwrap();
    store.obs_root = Some(path);
    state.save(&store)
}

#[tauri::command]
async fn create_instance(state: State<'_, AppState>, name: String, dir: PathBuf) -> Res<()> {
    let mut store = state.store.lock().unwrap();
    let name = store.validate_name(&name, None)?;
    let root = store.obs_root.clone().ok_or("Chưa chọn thư mục cài OBS")?;
    obs::check_location(&dir, &root, store.instances.iter().map(|i| i.dir.as_path()))?;
    let existed = obs::prepare_dir(&dir)?;
    let id = uuid::Uuid::new_v4().to_string();
    let setup = obs::write_marker(&dir, &id).and_then(|_| obs::link_obs(&dir, &root));
    if let Err(e) = setup {
        obs::rollback(&dir, existed);
        return Err(e);
    }
    let created_at = SystemTime::now().duration_since(UNIX_EPOCH).map_err(err)?.as_secs();
    store.instances.push(Instance { id, name, dir, created_at, pid: None });
    state.save(&store)
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
        return Err("Dừng OBS của instance này trước khi xoá".into());
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
        return Err("OBS của instance này đang chạy".into());
    }
    let root = store
        .obs_root
        .clone()
        .filter(|r| obs::obs_exe(r).is_file())
        .ok_or("Chưa chọn thư mục cài OBS hợp lệ (mở Cài đặt)")?;
    let dir = store.instances[idx].dir.clone();
    if !dir.is_dir() {
        return Err(format!("Không thấy thư mục {}", dir.display()));
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
            set_obs_root,
            create_instance,
            rename_instance,
            delete_instance,
            launch_instance,
            stop_instance,
            open_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
