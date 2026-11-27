//! Instance store + OBS portable launcher (spec 001).
//! Each instance dir holds NTFS junctions to the OBS install's top-level folders plus its own
//! `config\`, so `obs64.exe --portable` writes config into the instance dir.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x0800_0000;
const MARKER: &str = ".multiobs";
const DEFAULT_OBS_ROOT: &str = r"C:\Program Files\obs-studio";

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Instance {
    pub id: String,
    pub name: String,
    pub dir: PathBuf,
    pub created_at: u64,
    #[serde(default)]
    pub pid: Option<u32>,
}

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct Store {
    #[serde(default)]
    pub obs_root: Option<PathBuf>,
    /// Parent folder pre-filled when creating an instance (spec 002).
    #[serde(default)]
    pub default_dir: Option<PathBuf>,
    #[serde(default)]
    pub instances: Vec<Instance>,
}

impl Store {
    /// Corrupt file is kept as `.bak` instead of being silently overwritten on next save.
    pub fn load(path: &Path) -> Store {
        let mut store = match fs::read_to_string(path) {
            Ok(text) => serde_json::from_str(&text).unwrap_or_else(|_| {
                let _ = fs::copy(path, path.with_extension("json.bak"));
                Store::default()
            }),
            Err(_) => Store::default(),
        };
        if store.obs_root.is_none() && obs_exe(Path::new(DEFAULT_OBS_ROOT)).is_file() {
            store.obs_root = Some(PathBuf::from(DEFAULT_OBS_ROOT));
        }
        store
    }

    pub fn save(&self, path: &Path) -> Result<(), String> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(err)?;
        }
        let tmp = path.with_extension("json.tmp");
        fs::write(&tmp, serde_json::to_vec_pretty(self).map_err(err)?).map_err(err)?;
        fs::rename(&tmp, path).map_err(err)
    }

    pub fn find(&self, id: &str) -> Result<usize, String> {
        self.instances
            .iter()
            .position(|i| i.id == id)
            .ok_or_else(|| "Không tìm thấy instance".to_string())
    }

    pub fn validate_name(&self, name: &str, except_id: Option<&str>) -> Result<String, String> {
        let name = name.trim();
        if name.is_empty() {
            return Err("Nhập tên instance".into());
        }
        let taken = self.instances.iter().any(|i| {
            Some(i.id.as_str()) != except_id && i.name.to_lowercase() == name.to_lowercase()
        });
        if taken {
            return Err(format!("Đã có instance tên \"{name}\""));
        }
        Ok(name.to_string())
    }
}

pub fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}

pub fn obs_exe(root: &Path) -> PathBuf {
    root.join("bin").join("64bit").join("obs64.exe")
}

fn norm(p: &Path) -> String {
    p.to_string_lossy().replace('/', "\\").trim_end_matches('\\').to_lowercase()
}

fn overlaps(a: &Path, b: &Path) -> bool {
    let (a, b) = (norm(a), norm(b));
    a == b || a.starts_with(&format!("{b}\\")) || b.starts_with(&format!("{a}\\"))
}

/// Reject drive roots, folders inside/around the OBS install, and folders nested with another
/// instance — deleting one of those with "delete files" would wipe unrelated data.
pub fn check_location<'a>(dir: &Path, obs_root: &Path, others: impl Iterator<Item = &'a Path>) -> Result<(), String> {
    if dir.parent().is_none() || dir.parent().is_some_and(|p| p.as_os_str().is_empty()) {
        return Err("Không dùng gốc ổ đĩa. Chọn hoặc tạo một thư mục con".into());
    }
    if overlaps(dir, obs_root) {
        return Err("Không đặt instance trong (hoặc chứa) thư mục cài OBS".into());
    }
    for other in others {
        if overlaps(dir, other) {
            return Err("Thư mục này trùng hoặc lồng với thư mục của instance khác".into());
        }
    }
    Ok(())
}

/// Undo a failed create: drop only what we added when the folder already existed.
pub fn rollback(dir: &Path, existed: bool) {
    let _ = unlink_obs(dir);
    if existed {
        let _ = fs::remove_file(dir.join(MARKER));
        let _ = fs::remove_dir(dir.join("config"));
    } else {
        let _ = fs::remove_dir_all(dir);
    }
}

/// New instance dir must be missing or empty, so we never mix with (or later delete) user files.
/// Returns whether the folder already existed.
pub fn prepare_dir(dir: &Path) -> Result<bool, String> {
    if !dir.is_absolute() {
        return Err("Chọn một thư mục đầy đủ đường dẫn".into());
    }
    if dir.join(MARKER).exists() {
        return Err("Thư mục này đã thuộc một instance khác".into());
    }
    if dir.exists() {
        let mut entries = fs::read_dir(dir).map_err(err)?;
        if entries.next().is_some() {
            return Err("Thư mục phải trống. Chọn hoặc tạo một thư mục mới".into());
        }
        Ok(true)
    } else {
        fs::create_dir_all(dir).map_err(err)?;
        Ok(false)
    }
}

pub fn write_marker(dir: &Path, id: &str) -> Result<(), String> {
    fs::create_dir_all(dir.join("config")).map_err(err)?;
    fs::write(dir.join(MARKER), id).map_err(err)
}

/// Create missing junctions for every top-level folder of the OBS install. Idempotent, so it
/// also repairs an instance after OBS is reinstalled.
pub fn link_obs(dir: &Path, root: &Path) -> Result<(), String> {
    for entry in fs::read_dir(root).map_err(err)? {
        let entry = entry.map_err(err)?;
        let name = entry.file_name();
        if !entry.file_type().map_err(err)?.is_dir() || name == "config" {
            continue;
        }
        let link = dir.join(&name);
        if fs::symlink_metadata(&link).is_ok() {
            continue;
        }
        let status = Command::new("cmd")
            .args(["/C", "mklink", "/J"])
            .arg(&link)
            .arg(entry.path())
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(err)?;
        if !status.status.success() {
            return Err(format!(
                "Không tạo được liên kết tới {}: {}",
                entry.path().display(),
                String::from_utf8_lossy(&status.stderr).trim()
            ));
        }
    }
    Ok(())
}

/// Remove only the junctions (std `remove_dir` on a junction drops the link, never the target).
pub fn unlink_obs(dir: &Path) -> Result<(), String> {
    let Ok(entries) = fs::read_dir(dir) else {
        return Ok(());
    };
    for entry in entries {
        let path = entry.map_err(err)?.path();
        if fs::symlink_metadata(&path).map_err(err)?.file_type().is_symlink() {
            fs::remove_dir(&path).map_err(err)?;
        }
    }
    Ok(())
}

/// Junctions first, then the folder — only if its marker carries this instance's id.
pub fn delete_dir(dir: &Path, id: &str) -> Result<(), String> {
    let marker = fs::read_to_string(dir.join(MARKER)).unwrap_or_default();
    if marker.trim() != id {
        return Err("Thư mục không mang dấu của instance này nên không xoá. Bỏ chọn \"Xoá cả thư mục\" để chỉ gỡ khỏi danh sách".into());
    }
    unlink_obs(dir)?;
    fs::remove_dir_all(dir).map_err(err)
}

pub fn launch(dir: &Path) -> Result<u32, String> {
    let exe = obs_exe(dir);
    let cwd = exe.parent().ok_or("Đường dẫn OBS không hợp lệ")?;
    let child = Command::new(&exe)
        .args(["--multi", "--portable"])
        .current_dir(cwd)
        .spawn()
        .map_err(|e| format!("Không mở được OBS: {e}"))?;
    Ok(child.id())
}

/// No `/F`: OBS gets a normal close request and asks itself if it is still streaming.
pub fn stop(pid: u32) -> Result<(), String> {
    Command::new("taskkill")
        .args(["/PID", &pid.to_string()])
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map_err(err)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(name: &str) -> PathBuf {
        let p = std::env::temp_dir().join(format!("multiobs-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&p);
        p
    }

    #[test]
    fn name_must_be_unique_case_insensitive() {
        let mut s = Store::default();
        s.instances.push(Instance {
            id: "a".into(),
            name: "Kênh A".into(),
            dir: PathBuf::from(r"C:\x"),
            created_at: 0,
            pid: None,
        });
        assert!(s.validate_name("  kênh a ", None).is_err());
        assert!(s.validate_name("Kênh A", Some("a")).is_ok());
        assert!(s.validate_name("   ", None).is_err());
        assert_eq!(s.validate_name(" Kênh B ", None).unwrap(), "Kênh B");
    }

    #[test]
    fn prepare_dir_rejects_non_empty() {
        let d = temp("nonempty");
        fs::create_dir_all(&d).unwrap();
        fs::write(d.join("x.txt"), "x").unwrap();
        assert!(prepare_dir(&d).is_err());
        let fresh = temp("fresh");
        assert!(prepare_dir(&fresh).is_ok());
        assert!(fresh.is_dir());
        let _ = fs::remove_dir_all(&d);
        let _ = fs::remove_dir_all(&fresh);
    }

    #[test]
    fn delete_never_touches_obs_install() {
        let root = temp("root");
        fs::create_dir_all(root.join("bin").join("64bit")).unwrap();
        fs::write(obs_exe(&root), "exe").unwrap();
        fs::create_dir_all(root.join("data")).unwrap();
        let inst = temp("inst");
        prepare_dir(&inst).unwrap();
        write_marker(&inst, "id1").unwrap();
        link_obs(&inst, &root).unwrap();
        assert!(obs_exe(&inst).is_file(), "junction should expose obs64.exe");
        link_obs(&inst, &root).unwrap(); // idempotent
        assert!(delete_dir(&inst, "other-id").is_err(), "wrong marker id must refuse");
        assert!(inst.exists());
        delete_dir(&inst, "id1").unwrap();
        assert!(!inst.exists());
        assert!(obs_exe(&root).is_file(), "OBS install must survive delete");
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn location_rules() {
        let root = Path::new(r"C:\Program Files\obs-studio");
        let a = PathBuf::from(r"D:\OBS\a");
        let others = || [a.as_path()].into_iter();
        assert!(check_location(Path::new(r"E:\"), root, others()).is_err());
        assert!(check_location(Path::new(r"c:\program files\OBS-Studio\data\x"), root, others()).is_err());
        assert!(check_location(Path::new(r"C:\Program Files"), root, others()).is_err());
        assert!(check_location(Path::new(r"d:\obs\A\"), root, others()).is_err());
        assert!(check_location(Path::new(r"D:\OBS\a\sub"), root, others()).is_err());
        assert!(check_location(Path::new(r"D:\OBS"), root, others()).is_err());
        assert!(check_location(Path::new(r"D:\OBS\ab"), root, others()).is_ok());
    }
}
