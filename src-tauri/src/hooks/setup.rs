use serde_json::{json, Value};
use std::path::PathBuf;
use std::error::Error;
use std::fs;

pub fn install_hooks() -> Result<(), Box<dyn Error>> {
    println!("🔧 Setting up Vocal hooks for Claude Code...");
    
    // Get the vocal binary path
    let vocal_path = get_vocal_binary_path()?;
    println!("📍 Using vocal binary: {}", vocal_path);
    
    // Find Claude Code settings location
    let settings_path = find_claude_settings_path()?;
    println!("📁 Claude Code settings: {}", settings_path.display());
    
    // Generate hook configuration
    let hook_config = generate_hook_config(&vocal_path)?;
    
    // Install or update settings
    install_settings(&settings_path, hook_config)?;
    
    // Create state directories
    ensure_state_directories()?;
    
    println!("✅ Vocal hooks installed successfully!");
    println!();
    println!("🎯 Next steps:");
    println!("1. Start Claude Code: `claude`");
    println!("2. Toggle hands-free mode in your Vocal app");
    println!("3. Use your hotkey to record voice commands");
    println!("4. Press Enter to submit - Claude Code will process automatically");
    println!();
    println!("🛡️  Safety features:");
    println!("• Safe operations (Read, Glob, Grep, LS) are auto-approved");
    println!("• File operations are validated for safety");
    println!("• Dangerous commands are blocked or require confirmation");
    println!();
    println!("🚨 Emergency controls:");
    println!("• Press Ctrl+Shift+Q to exit hands-free mode anytime");
    println!("• Run `touch ~/.vocal-emergency-stop` to force stop");
    println!("• Run `vocal deactivate-hands-free` to disable");
    
    Ok(())
}

fn find_claude_settings_path() -> Result<PathBuf, Box<dyn Error>> {
    // Check project-specific settings first
    let project_settings = PathBuf::from(".claude/settings.json");
    if project_settings.exists() {
        return Ok(project_settings);
    }
    
    // Check if we're in a project that might want project settings
    if PathBuf::from(".git").exists() || 
       PathBuf::from("package.json").exists() || 
       PathBuf::from("Cargo.toml").exists() ||
       PathBuf::from("requirements.txt").exists() {
        
        println!("📋 Detected project directory. Creating project-specific Claude Code settings.");
        
        // Create .claude directory
        fs::create_dir_all(".claude")?;
        return Ok(project_settings);
    }
    
    // Fall back to user settings
    let home = dirs::home_dir().ok_or("Cannot determine home directory")?;
    let user_settings = home.join(".claude/settings.json");
    
    // Create directory if it doesn't exist
    if let Some(parent) = user_settings.parent() {
        fs::create_dir_all(parent)?;
    }
    
    println!("📋 Using global Claude Code settings.");
    Ok(user_settings)
}

fn generate_hook_config(vocal_path: &str) -> Result<Value, Box<dyn Error>> {
    Ok(json!({
        "hooks": {
            "PreToolUse": [{
                "matcher": "Read|Glob|Grep|LS|Edit|Write|MultiEdit|Bash|Task|WebFetch|WebSearch",
                "hooks": [{
                    "type": "command",
                    "command": format!("{} hook pre-tool-use", vocal_path),
                    "timeout": 30000
                }]
            }],
            "PostToolUse": [{
                "matcher": "Edit|Write|MultiEdit|Bash", 
                "hooks": [{
                    "type": "command",
                    "command": format!("{} hook post-tool-use", vocal_path),
                    "timeout": 10000
                }]
            }],
            "Stop": [{
                "hooks": [{
                    "type": "command",
                    "command": format!("{} hook stop", vocal_path),
                    "timeout": 10000
                }]
            }],
            "UserPromptSubmit": [{
                "hooks": [{
                    "type": "command",
                    "command": format!("{} hook user-prompt-submit", vocal_path),
                    "timeout": 10000
                }]
            }]
        }
    }))
}

fn install_settings(path: &PathBuf, hook_config: Value) -> Result<(), Box<dyn Error>> {
    let mut settings = if path.exists() {
        println!("📝 Updating existing Claude Code settings...");
        let content = fs::read_to_string(path)?;
        serde_json::from_str::<Value>(&content).unwrap_or(json!({}))
    } else {
        println!("📝 Creating new Claude Code settings...");
        json!({})
    };
    
    // Merge hook configuration
    if let Some(existing_hooks) = settings.get_mut("hooks") {
        // Update existing hooks
        if let Value::Object(ref mut existing_map) = existing_hooks {
            if let Value::Object(new_hooks) = hook_config["hooks"].clone() {
                for (key, value) in new_hooks {
                    existing_map.insert(key, value);
                }
            }
        }
    } else {
        // Add hooks section
        settings["hooks"] = hook_config["hooks"].clone();
    }
    
    // Write back to file with pretty formatting
    let formatted = serde_json::to_string_pretty(&settings)?;
    fs::write(path, formatted)?;
    
    println!("💾 Updated Claude Code settings successfully");
    Ok(())
}

fn get_vocal_binary_path() -> Result<String, Box<dyn Error>> {
    // Try to find vocal in PATH first
    if let Ok(output) = std::process::Command::new("which")
        .arg("vocal")
        .output() 
    {
        if output.status.success() {
            let path_str = String::from_utf8(output.stdout)?;
            let path = path_str.trim();
            if !path.is_empty() {
                return Ok(path.to_string());
            }
        }
    }
    
    // Try whereis as backup
    if let Ok(output) = std::process::Command::new("whereis")
        .arg("vocal")
        .output()
    {
        if output.status.success() {
            let output_str = String::from_utf8(output.stdout)?;
            if let Some(path) = output_str.split_whitespace().nth(1) {
                return Ok(path.to_string());
            }
        }
    }
    
    // Fall back to current executable path
    let current_exe = std::env::current_exe()?;
    Ok(current_exe.to_string_lossy().to_string())
}

fn ensure_state_directories() -> Result<(), Box<dyn Error>> {
    // Ensure the home directory is accessible for state files
    if let Some(home) = dirs::home_dir() {
        // Create a .vocal directory if it doesn't exist (for future organization)
        let vocal_dir = home.join(".vocal");
        if !vocal_dir.exists() {
            fs::create_dir_all(&vocal_dir)?;
        }
    }
    
    Ok(())
}

pub fn uninstall_hooks() -> Result<(), Box<dyn Error>> {
    println!("🔧 Removing Vocal hooks from Claude Code...");
    
    let settings_path = find_claude_settings_path()?;
    
    if !settings_path.exists() {
        println!("❌ No Claude Code settings found");
        return Ok(());
    }
    
    let content = fs::read_to_string(&settings_path)?;
    let mut settings: Value = serde_json::from_str(&content)?;
    
    // Remove hooks section
    if let Some(hooks) = settings.get_mut("hooks") {
        if let Value::Object(ref mut hooks_map) = hooks {
            let vocal_hooks = ["PreToolUse", "PostToolUse", "Stop", "UserPromptSubmit"];
            
            for hook_name in &vocal_hooks {
                hooks_map.remove(*hook_name);
            }
            
            // If hooks object is now empty, remove it entirely
            if hooks_map.is_empty() {
                settings.as_object_mut().unwrap().remove("hooks");
            }
        }
    }
    
    // Write back to file
    let formatted = serde_json::to_string_pretty(&settings)?;
    fs::write(&settings_path, formatted)?;
    
    println!("✅ Vocal hooks removed successfully");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    
    #[test]
    fn test_generate_hook_config() {
        let config = generate_hook_config("vocal").unwrap();
        
        assert!(config["hooks"]["PreToolUse"].is_array());
        assert!(config["hooks"]["Stop"].is_array());
        
        let pre_tool_use = &config["hooks"]["PreToolUse"][0];
        assert_eq!(pre_tool_use["hooks"][0]["command"], "vocal hook pre-tool-use");
    }
    
    #[test]
    fn test_settings_path_detection() {
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path();
        
        // Change to temp directory
        let original_dir = std::env::current_dir().unwrap();
        std::env::set_current_dir(&temp_path).unwrap();
        
        // Test without project markers
        let path = find_claude_settings_path().unwrap();
        assert!(path.to_string_lossy().contains(".claude/settings.json"));
        
        // Restore original directory
        std::env::set_current_dir(original_dir).unwrap();
    }
}