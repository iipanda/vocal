use std::process::Command;
use std::path::Path;
use std::fs;

#[tauri::command]
pub async fn install_cli_symlink() -> Result<String, String> {
    println!("Starting CLI symlink installation...");
    
    let app_path = get_app_binary_path()?;
    let symlink_path = "/usr/local/bin/vocal";
    
    println!("App path: {}", app_path);
    println!("Symlink path: {}", symlink_path);
    
    // Check if app binary exists
    if !Path::new(&app_path).exists() {
        let error_msg = format!("App binary not found at path: {}\n\nThis usually happens when:\n• The app is not installed in /Applications/\n• The app bundle structure is different than expected\n• You're running from development mode", app_path);
        println!("ERROR: {}", error_msg);
        return Err(error_msg);
    }
    
    println!("App binary found, checking permissions...");
    
    // Check if /usr/local/bin exists and is writable
    let usr_local_bin = Path::new("/usr/local/bin");
    if !usr_local_bin.exists() {
        println!("Creating /usr/local/bin directory...");
        if let Err(e) = fs::create_dir_all("/usr/local/bin") {
            let error_msg = format!("Failed to create /usr/local/bin directory: {}\n\nThis usually requires administrator privileges. Please run:\n\nsudo mkdir -p /usr/local/bin\nsudo ln -s '{}' '{}'", e, app_path, symlink_path);
            println!("ERROR: {}", error_msg);
            return Err(error_msg);
        }
    }
    
    // Check if we can write to /usr/local/bin
    let test_file = "/usr/local/bin/.vocal_test_write";
    match fs::write(test_file, "test") {
        Ok(_) => {
            let _ = fs::remove_file(test_file);
            println!("Write permissions confirmed for /usr/local/bin");
        }
        Err(e) => {
            let error_msg = format!(
                "Cannot write to /usr/local/bin: {}\n\n🔧 SOLUTION: Run this command in your terminal:\n\nsudo ln -s '{}' '{}'\n\n💡 Why this happens:\n• /usr/local/bin requires admin privileges to modify\n• This is a security feature of macOS\n• The manual command will prompt for your password", 
                e, app_path, symlink_path
            );
            println!("ERROR: {}", error_msg);
            return Ok(error_msg);
        }
    }
    
    // Remove existing symlink if it exists
    if Path::new(symlink_path).exists() {
        println!("Removing existing symlink...");
        if let Err(e) = fs::remove_file(symlink_path) {
            let error_msg = format!("Failed to remove existing symlink: {}\n\nPlease run:\n\nsudo rm '{}'\nsudo ln -s '{}' '{}'", e, symlink_path, app_path, symlink_path);
            println!("ERROR: {}", error_msg);
            return Err(error_msg);
        }
    }
    
    // Try to create symlink
    println!("Creating symlink...");
    match std::os::unix::fs::symlink(&app_path, symlink_path) {
        Ok(_) => {
            let success_msg = "✅ CLI installed successfully!\n\nYou can now run 'vocal setup-hooks' in any terminal.\n\nTo test: Open Terminal and run 'vocal --help'";
            println!("SUCCESS: {}", success_msg);
            Ok(success_msg.to_string())
        }
        Err(e) => {
            let error_msg = format!(
                "❌ Automatic installation failed: {}\n\n🔧 MANUAL SOLUTION:\nRun this command in Terminal (it will ask for your password):\n\nsudo ln -s '{}' '{}'\n\n💡 After running the command:\n• Open a new Terminal window\n• Run 'vocal --help' to verify installation\n• Run 'vocal setup-hooks' in your project directory\n\n🔍 TROUBLESHOOTING:\n• Make sure the app is installed in /Applications/\n• Ensure you have administrator privileges\n• Check that /usr/local/bin is in your PATH", 
                e, app_path, symlink_path
            );
            println!("ERROR: {}", error_msg);
            Ok(error_msg)
        }
    }
}

#[tauri::command]
pub async fn check_cli_installed() -> Result<bool, String> {
    let symlink_path = "/usr/local/bin/vocal";
    let exists = Path::new(symlink_path).exists();
    
    if exists {
        // Verify the symlink is valid
        match fs::read_link(symlink_path) {
            Ok(target) => {
                if target.exists() {
                    println!("CLI symlink verified: {} -> {}", symlink_path, target.display());
                } else {
                    println!("WARNING: CLI symlink exists but target is missing: {} -> {}", symlink_path, target.display());
                }
            }
            Err(e) => {
                println!("WARNING: Failed to read symlink target: {}", e);
            }
        }
    } else {
        println!("CLI symlink not found at {}", symlink_path);
    }
    
    Ok(exists)
}

#[tauri::command]
pub async fn get_cli_install_command() -> Result<String, String> {
    let app_path = get_app_binary_path()?;
    let symlink_path = "/usr/local/bin/vocal";
    
    Ok(format!("sudo ln -s '{}' '{}'", app_path, symlink_path))
}

#[tauri::command]
pub async fn get_detailed_cli_status() -> Result<String, String> {
    let app_path = get_app_binary_path()?;
    let symlink_path = "/usr/local/bin/vocal";
    
    let mut status = String::new();
    
    // Check app binary
    status.push_str(&format!("📱 App Binary Path: {}\n", app_path));
    if Path::new(&app_path).exists() {
        status.push_str("   ✅ App binary exists\n");
    } else {
        status.push_str("   ❌ App binary NOT FOUND\n");
    }
    
    // Check symlink
    status.push_str(&format!("\n🔗 CLI Symlink Path: {}\n", symlink_path));
    if Path::new(symlink_path).exists() {
        match fs::read_link(symlink_path) {
            Ok(target) => {
                status.push_str(&format!("   ✅ Symlink exists: -> {}\n", target.display()));
                if target.exists() {
                    status.push_str("   ✅ Target is valid\n");
                } else {
                    status.push_str("   ⚠️  Target is missing (broken symlink)\n");
                }
            }
            Err(e) => {
                status.push_str(&format!("   ❌ Failed to read symlink: {}\n", e));
            }
        }
    } else {
        status.push_str("   ❌ Symlink does not exist\n");
    }
    
    // Check /usr/local/bin directory
    status.push_str("\n📁 /usr/local/bin Directory:\n");
    let usr_local_bin = Path::new("/usr/local/bin");
    if usr_local_bin.exists() {
        status.push_str("   ✅ Directory exists\n");
        
        // Check write permissions
        let test_file = "/usr/local/bin/.vocal_test_write";
        match fs::write(test_file, "test") {
            Ok(_) => {
                let _ = fs::remove_file(test_file);
                status.push_str("   ✅ Write permissions OK\n");
            }
            Err(_) => {
                status.push_str("   ⚠️  No write permissions (requires sudo)\n");
            }
        }
    } else {
        status.push_str("   ❌ Directory does not exist\n");
    }
    
    // Check PATH
    status.push_str("\n🛤️  PATH Environment:\n");
    if let Ok(path_var) = std::env::var("PATH") {
        if path_var.contains("/usr/local/bin") {
            status.push_str("   ✅ /usr/local/bin is in PATH\n");
        } else {
            status.push_str("   ⚠️  /usr/local/bin not found in PATH\n");
        }
    } else {
        status.push_str("   ❌ Could not read PATH variable\n");
    }
    
    Ok(status)
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