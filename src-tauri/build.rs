fn main() {
    // Release runs elevated so OBS launched from it inherits admin (spec 003). Dev stays
    // unelevated: a normal terminal cannot start a requireAdministrator exe (error 740), which
    // also applies to `cargo run --release` / `cargo test --release`.
    if std::env::var("PROFILE").as_deref() == Ok("release") {
        println!("cargo:rerun-if-changed=windows-admin.manifest");
        let windows = tauri_build::WindowsAttributes::new().app_manifest(include_str!("windows-admin.manifest"));
        tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(windows))
            .expect("failed to run tauri build script");
    } else {
        tauri_build::build()
    }
}
