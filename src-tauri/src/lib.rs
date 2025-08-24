use tauri::{AppHandle, Manager, RunEvent, WindowEvent, Emitter};
use tauri::{menu::{Menu, MenuItem}, tray::TrayIconBuilder};
use serde::{Deserialize, Serialize};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use std::sync::Mutex;

mod automation;
mod commands;
mod hooks;

// Store the current shortcut to unregister it later
static CURRENT_SHORTCUT: Mutex<Option<String>> = Mutex::new(None);

#[derive(Debug, Serialize, Deserialize)]
struct TranscriptionResponse {
    text: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct RefinementResponse {
    refined_text: String,
}

#[tauri::command]
async fn show_dictation_window(app: AppHandle) -> Result<(), String> {
    println!("Showing dictation window and starting recording...");
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    window.emit("start-recording", ()).map_err(|e| e.to_string())?;
    println!("Dictation window shown and recording event emitted");
    Ok(())
}

#[tauri::command]
async fn hide_dictation_window(app: AppHandle) -> Result<(), String> {
    println!("Hiding dictation window");
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    window.hide().map_err(|e| e.to_string())?;
    println!("Dictation window hidden");
    Ok(())
}

#[tauri::command]
async fn show_settings_window(app: AppHandle) -> Result<(), String> {
    println!("Attempting to show settings window...");
    
    // The settings window should already exist from tauri.conf.json
    if let Some(window) = app.get_webview_window("settings") {
        println!("Found existing settings window, showing it...");
        window.show().map_err(|e| {
            println!("Failed to show settings window: {}", e);
            e.to_string()
        })?;
        window.set_focus().map_err(|e| {
            println!("Failed to focus settings window: {}", e);
            e.to_string()
        })?;
        println!("Settings window shown successfully");
        return Ok(());
    }
    
    // If for some reason the pre-configured window doesn't exist, create one
    println!("Settings window not found, creating new one...");
    use tauri::{WebviewWindowBuilder, WebviewUrl};
    
    let settings_window = WebviewWindowBuilder::new(
        &app,
        "settings",
        WebviewUrl::App("settings.html".into())
    )
    .title("Vocal Settings")
    .inner_size(600.0, 500.0)
    .resizable(false)
    .decorations(true)
    .transparent(false)
    .always_on_top(false)
    .skip_taskbar(true)
    .center()
    .visible(false)
    .build()
    .map_err(|e| {
        println!("Failed to create settings window: {}", e);
        format!("Failed to create settings window: {}", e)
    })?;
    
    settings_window.show().map_err(|e| {
        println!("Failed to show created settings window: {}", e);
        e.to_string()
    })?;
    settings_window.set_focus().map_err(|e| {
        println!("Failed to focus created settings window: {}", e);
        e.to_string()
    })?;
    println!("Settings window created and shown successfully");
    Ok(())
}

#[tauri::command]
async fn transcribe_audio(audio_data: Vec<u8>, api_key: String) -> Result<String, String> {
    println!("Starting transcription - audio data size: {} bytes", audio_data.len());
    let client = reqwest::Client::new();
    
    let form = reqwest::multipart::Form::new()
        .part("file", reqwest::multipart::Part::bytes(audio_data)
            .file_name("audio.webm")
            .mime_str("audio/webm").unwrap())
        .text("model", "whisper-large-v3")
        .text("response_format", "json");

    println!("Sending transcription request to Groq API...");
    let response = client
        .post("https://api.groq.com/openai/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| {
            println!("Transcription request failed: {}", e);
            format!("Request failed: {}", e)
        })?;

    let status = response.status();
    println!("Transcription response status: {}", status);
    
    if !status.is_success() {
        let error_body = response.text().await.unwrap_or_else(|_| "Unable to read error response".to_string());
        println!("Transcription API error ({}): {}", status, error_body);
        return Err(format!("Transcription failed ({}): {}", status, error_body));
    }
    
    let transcription: TranscriptionResponse = response
        .json()
        .await
        .map_err(|e| {
            println!("Failed to parse transcription response: {}", e);
            format!("Failed to parse response: {}", e)
        })?;

    println!("Raw transcription result: '{}'", transcription.text);
    Ok(transcription.text)
}

#[tauri::command]
async fn refine_prompt(text: String, api_key: String, system_prompt: Option<String>) -> Result<String, String> {
    println!("Starting prompt refinement for text: '{}'", text);
    let client = reqwest::Client::new();
    let system_text = system_prompt.unwrap();
    println!("Using system prompt length: {} chars", system_text.len());
    
    let request_body = serde_json::json!({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 64000,
        "system": system_text,
        "messages": [
            {
                "role": "user",
                "content": text
            }
        ]
    });

    println!("Sending refinement request to Claude API...");
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            println!("Claude request failed: {}", e);
            format!("Request failed: {}", e)
        })?;

    let status = response.status();
    println!("Claude response status: {}", status);
    
    if !status.is_success() {
        let error_body = response.text().await.unwrap_or_else(|_| "Unable to read error response".to_string());
        println!("Claude API error ({}): {}", status, error_body);
        return Err(format!("Claude request failed ({}): {}", status, error_body));
    }
    
    let response_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| {
            println!("Failed to parse Claude response: {}", e);
            format!("Failed to parse response: {}", e)
        })?;

    let refined_text = response_json["content"][0]["text"]
        .as_str()
        .ok_or_else(|| {
            println!("No content found in Claude response: {:?}", response_json);
            "No content found in response".to_string()
        })?;

    println!("Refined prompt result: '{}'", refined_text);
    Ok(refined_text.to_string())
}

#[tauri::command]
async fn copy_to_clipboard(text: String, app: AppHandle) -> Result<(), String> {
    println!("Copying to clipboard: '{}' ({} chars)", text, text.len());
    app.clipboard()
        .write_text(text)
        .map_err(|e| {
            println!("Failed to copy to clipboard: {}", e);
            format!("Failed to copy to clipboard: {}", e)
        })?;
    println!("Successfully copied to clipboard");
    Ok(())
}

#[tauri::command]
async fn update_global_shortcut(shortcut: String, app: AppHandle) -> Result<(), String> {
    println!("Updating global shortcut to: {}", shortcut);
    
    // Unregister the current shortcut
    let global_shortcut = app.global_shortcut();
    if let Ok(mut current) = CURRENT_SHORTCUT.lock() {
        if let Some(old_shortcut) = current.as_ref() {
            if let Err(e) = global_shortcut.unregister(old_shortcut.as_str()) {
                println!("Warning: Failed to unregister old shortcut '{}': {}", old_shortcut, e);
            }
        }
        *current = Some(shortcut.clone());
    }
    
    // Register the new shortcut
    let app_handle = app.clone();
    global_shortcut.on_shortcut(shortcut.as_str(), move |_app, _event, _shortcut| {
        let app_handle = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(e) = show_dictation_window(app_handle).await {
                eprintln!("Failed to show dictation window: {}", e);
            }
        });
    }).map_err(|e| {
        println!("Failed to register new shortcut '{}': {}", shortcut, e);
        format!("Failed to register shortcut: {}", e)
    })?;
    
    println!("Successfully updated global shortcut to: {}", shortcut);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // Hide dock icon on macOS
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }
            
            // Create tray menu
            let quit_item = MenuItem::with_id(app, "quit", "Quit Vocal", true, None::<&str>)?;
            let show_item = MenuItem::with_id(app, "show", "Show Dictation Window", true, None::<&str>)?;
            let settings_item = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &settings_item, &quit_item])?;
            
            // Create tray icon
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "show" => {
                            let app_handle = app.app_handle().clone();
                            tauri::async_runtime::spawn(async move {
                                if let Err(e) = show_dictation_window(app_handle).await {
                                    eprintln!("Failed to show dictation window: {}", e);
                                }
                            });
                        }
                        "settings" => {
                            let app_handle = app.app_handle().clone();
                            tauri::async_runtime::spawn(async move {
                                if let Err(e) = show_settings_window(app_handle).await {
                                    eprintln!("Failed to show settings window: {}", e);
                                }
                            });
                        }
                        _ => {}
                    }
                })
                .build(app)?;
            
            // Register global shortcut with default value
            let default_shortcut = "CommandOrControl+Shift+V";
            
            // Store the initial shortcut
            if let Ok(mut current) = CURRENT_SHORTCUT.lock() {
                *current = Some(default_shortcut.to_string());
            }
            
            app.global_shortcut().on_shortcut(default_shortcut, move |_app, _event, _shortcut| {
                let app_handle = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = show_dictation_window(app_handle).await {
                        eprintln!("Failed to show dictation window: {}", e);
                    }
                });
            }).unwrap();
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            show_dictation_window,
            hide_dictation_window,
            show_settings_window,
            transcribe_audio,
            refine_prompt,
            copy_to_clipboard,
            update_global_shortcut,
            commands::inject_prompt_to_claude_session,
            commands::activate_hands_free_mode,
            commands::deactivate_hands_free_mode,
            commands::get_hands_free_status,
            commands::trigger_emergency_stop,
            commands::get_terminal_info,
            commands::is_terminal_active,
            commands::check_cycle_trigger,
            commands::install_cli_symlink,
            commands::check_cli_installed,
            commands::get_cli_install_command,
            commands::open_terminal_with_command
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::WindowEvent { label, event: WindowEvent::Focused(focused), .. } = &event {
                if label == "main" && !focused {
                    // Hide window when it loses focus
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.hide();
                    }
                }
            }
        });
}
