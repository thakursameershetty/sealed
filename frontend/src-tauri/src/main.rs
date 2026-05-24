// Prevents additional console window on Windows in release, DO NOT REMOVE
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_shell::ShellExt;
use tauri::AppHandle;

#[tauri::command]
async fn download_media(app: AppHandle, url: String, format: String) -> Result<String, String> {
    // 1. Fetch title using the sidecar
    let title_sidecar = app.shell().sidecar("yt-dlp")
        .map_err(|e| format!("Failed to load sidecar: {}", e))?;
    
    let title_output = title_sidecar.args(["--print", "title", &url]).output()
        .map_err(|e| format!("Failed to get title: {}", e))?;
        
    let video_title = String::from_utf8_lossy(&title_output.stdout).trim().to_string();
    let final_title = if video_title.is_empty() { String::from("Downloaded Media") } else { video_title };

    // 2. Setup download path
    let download_path = dirs::download_dir()
        .ok_or("Could not find Downloads directory")?
        .to_string_lossy()
        .into_owned();
    let output_template = format!("{}/%(title)s.%(ext)s", download_path);

    let mut args = vec![];
    
    if format == "audio" {
        args.extend(vec![
            "-x", "--audio-format", "mp3", "--audio-quality", "0",
            "-o", &output_template,
            &url
        ]);
    } else {
        args.extend(vec![
            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best",
            "--merge-output-format", "mp4",
            "-o", &output_template,
            &url
        ]);
    }

    // 3. Execute main download using the sidecar
    let dl_sidecar = app.shell().sidecar("yt-dlp")
        .map_err(|e| format!("Failed to load sidecar: {}", e))?;

    let output = dl_sidecar.args(args).output()
        .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;

    if output.status.success() {
        Ok(final_title)
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        Err(format!("Download failed: {}", error_msg))
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init()) // Add this line!
        .invoke_handler(tauri::generate_handler![download_media])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}