// King Karl Launcher - Rust backend
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};

// ---------- Config ----------

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct LauncherConfig {
    project_root: String,
    web_url: String,
    last_deploy_iso: Option<String>,
    presets: Vec<String>,
}

fn config_path() -> PathBuf {
    let mut p = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push(".kk-launcher");
    std::fs::create_dir_all(&p).ok();
    p.push("config.json");
    p
}

#[tauri::command]
fn get_config() -> LauncherConfig {
    let p = config_path();
    if !p.exists() {
        return LauncherConfig {
            project_root: String::new(),
            web_url: "http://localhost:5173".into(),
            last_deploy_iso: None,
            presets: vec![],
        };
    }
    let txt = std::fs::read_to_string(&p).unwrap_or_default();
    serde_json::from_str(&txt).unwrap_or_default()
}

#[tauri::command]
fn save_config(cfg: LauncherConfig) -> Result<(), String> {
    let p = config_path();
    let txt = serde_json::to_string_pretty(&cfg).map_err(|e| e.to_string())?;
    std::fs::write(&p, txt).map_err(|e| e.to_string())?;
    Ok(())
}

// ---------- Process state ----------

struct ProcRegistry {
    next_id: AtomicU32,
    children: Mutex<Vec<(u32, Child)>>,
}

impl ProcRegistry {
    fn new() -> Self {
        Self {
            next_id: AtomicU32::new(1),
            children: Mutex::new(Vec::new()),
        }
    }
}

// ---------- Shell streaming ----------

#[derive(Serialize, Clone)]
struct ShellEvent {
    run_id: u32,
    stream: String, // "stdout" | "stderr" | "exit"
    line: String,
    code: Option<i32>,
}

#[tauri::command]
async fn stream_shell(
    app: AppHandle,
    reg: State<'_, ProcRegistry>,
    cwd: String,
    cmd: String,
) -> Result<u32, String> {
    let run_id = reg.next_id.fetch_add(1, Ordering::SeqCst);

    // Windows: route through cmd /c so .bat/npm/git resolve
    let mut command = Command::new("cmd");
    command
        .arg("/c")
        .arg(&cmd)
        .current_dir(&cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW = 0x08000000
        command.creation_flags(0x08000000);
    }

    let mut child = command.spawn().map_err(|e| e.to_string())?;
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;

    let app_out = app.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_out.emit(
                "shell-event",
                ShellEvent {
                    run_id,
                    stream: "stdout".into(),
                    line,
                    code: None,
                },
            );
        }
    });

    let app_err = app.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_err.emit(
                "shell-event",
                ShellEvent {
                    run_id,
                    stream: "stderr".into(),
                    line,
                    code: None,
                },
            );
        }
    });

    // Wait for exit in separate task
    let app_exit = app.clone();
    tokio::spawn(async move {
        let status = child.wait().await;
        let code = status.ok().and_then(|s| s.code());
        let _ = app_exit.emit(
            "shell-event",
            ShellEvent {
                run_id,
                stream: "exit".into(),
                line: String::new(),
                code,
            },
        );
    });

    Ok(run_id)
}

// ---------- Quick helpers ----------

#[derive(Serialize)]
struct GitStatus {
    branch: String,
    ahead: u32,
    behind: u32,
    dirty: bool,
}

fn run_capture(cwd: &str, args: &[&str]) -> Result<String, String> {
    let out = std::process::Command::new("cmd")
        .arg("/c")
        .arg(args.join(" "))
        .current_dir(cwd)
        .output()
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

#[tauri::command]
fn get_git_status(cwd: String) -> Result<GitStatus, String> {
    if cwd.is_empty() {
        return Err("project_root not set".into());
    }
    let branch = run_capture(&cwd, &["git", "rev-parse", "--abbrev-ref", "HEAD"])?;
    let ahead_behind = run_capture(
        &cwd,
        &["git", "rev-list", "--left-right", "--count", "origin/main...HEAD"],
    )
    .unwrap_or_default();
    let mut parts = ahead_behind.split_whitespace();
    let behind: u32 = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0);
    let ahead: u32 = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0);
    let dirty_raw = run_capture(&cwd, &["git", "status", "--porcelain"]).unwrap_or_default();
    Ok(GitStatus {
        branch,
        ahead,
        behind,
        dirty: !dirty_raw.is_empty(),
    })
}

#[tauri::command]
fn check_port(port: u16) -> bool {
    std::net::TcpStream::connect(("127.0.0.1", port)).is_ok()
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    // Windows: start "" <url> opens in default browser
    std::process::Command::new("cmd")
        .args(["/c", "start", "", &url])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------- Entry ----------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ProcRegistry::new())
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            stream_shell,
            get_git_status,
            check_port,
            open_url,
        ])
        .setup(|app| {
            let _ = app.handle();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
