// Prevents additional console window on Windows in release, DO NOT REMOVE
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;

#[tauri::command]
fn download_media(url: String, format: String) -> Result<String, String> {
    // 1. Fetch the exact YouTube title first
    let title_cmd = Command::new("yt-dlp")
        .args(["--print", "title", &url])
        .output()
        .map_err(|e| format!("Failed to get title: {}", e))?;
        
    let video_title = String::from_utf8_lossy(&title_cmd.stdout).trim().to_string();
    let final_title = if video_title.is_empty() { String::from("Downloaded Media") } else { video_title };

    // 2. Setup the download directory
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

    // 3. Execute the download
    let output = Command::new("yt-dlp")
        .args(args)
        .output()
        .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;

    if output.status.success() {
        // Return the actual title to the React frontend!
        Ok(final_title) 
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        Err(format!("Download failed: {}", error_msg))
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![download_media])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}