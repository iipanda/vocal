use std::process::Command;
use std::path::Path;

#[tauri::command]
pub async fn install_cli_symlink() -> Result<String, String> {
    let app_path = get_app_binary_path()?;
    let symlink_path = "/usr/local/bin/vocal";
    
    // Check if app binary exists
    if !Path::new(&app_path).exists() {
        return Err("App binary not found".to_string());
    }
    
    // Create /usr/local/bin if it doesn't exist
    let _ = std::fs::create_dir_all("/usr/local/bin");
    
    // Remove existing symlink if it exists
    if Path::new(symlink_path).exists() {
        let _ = std::fs::remove_file(symlink_path);
    }
    
    // Try to create symlink
    match std::os::unix::fs::symlink(&app_path, symlink_path) {
        Ok(_) => Ok("CLI installed successfully! You can now run 'vocal setup-hooks' in your terminal.".to_string()),
        Err(_) => {
            // Fallback: provide manual instructions
            Ok(format!(
                "Automatic installation failed. Please run this command in your terminal:\n\nsudo ln -s '{}' '{}'", 
                app_path, symlink_path
            ))
        }
    }
}

#[tauri::command]
pub async fn check_cli_installed() -> Result<bool, String> {
    let symlink_path = "/usr/local/bin/vocal";
    Ok(Path::new(symlink_path).exists())
}

#[tauri::command]
pub async fn get_cli_install_command() -> Result<String, String> {
    let app_path = get_app_binary_path()?;
    let symlink_path = "/usr/local/bin/vocal";
    
    Ok(format!("sudo ln -s '{}' '{}'", app_path, symlink_path))
}

fn get_app_binary_path() -> Result<String, String> {
    // Get the current executable path (inside the app bundle)
    match std::env::current_exe() {
        Ok(exe_path) => Ok(exe_path.to_string_lossy().to_string()),
        Err(_) => {
            // Fallback to typical app installation path
            Ok("/Applications/Vocal.app/Contents/MacOS/vocal".to_string())
        }
    }
}

#[tauri::command]  
pub async fn open_terminal_with_command(command: String) -> Result<(), String> {
    // Open Terminal and run a command
    let applescript = format!(r#"
        tell application "Terminal"
            activate
            do script "{}"
        end tell
    "#, command.replace("\"", "\\\""));
    
    Command::new("osascript")
        .arg("-e")
        .arg(applescript)
        .output()
        .map_err(|e| format!("Failed to open terminal: {}", e))?;
    
    Ok(())
}