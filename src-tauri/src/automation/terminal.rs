use std::error::Error;
use crate::hooks::state::{SessionInfo, load_session_info};
use crate::automation::applescript::AppleScriptExecutor;

pub struct TerminalInjector;

impl TerminalInjector {
    pub fn inject_text_to_claude_session(text: &str) -> Result<(), Box<dyn Error>> {
        // Load session information
        let session_info = match load_session_info() {
            Ok(info) => Some(info),
            Err(e) => {
                eprintln!("Warning: Could not load session info, using fallback: {}", e);
                None
            }
        };
        
        // Detect the terminal application
        let terminal_app = Self::detect_terminal_application()?;
        
        // Create appropriate AppleScript
        let script = AppleScriptExecutor::create_terminal_injection_script(
            text,
            &terminal_app,
            session_info.as_ref(),
        );
        
        // Execute the script
        match AppleScriptExecutor::execute_script(&script) {
            Ok(_) => {
                println!("Successfully injected text into {} session", terminal_app);
                Ok(())
            }
            Err(e) => {
                eprintln!("Failed to inject text: {}", e);
                
                // Try fallback approach
                Self::fallback_text_injection(text)?;
                Ok(())
            }
        }
    }
    
    fn detect_terminal_application() -> Result<String, Box<dyn Error>> {
        let script = r#"
            tell application "System Events"
                set frontmostApp to name of first application process whose frontmost is true
            end tell
            return frontmostApp
        "#;
        
        let result = AppleScriptExecutor::execute_script(script)?;
        
        // Map common terminal applications
        match result.as_str() {
            "Terminal" => Ok("Terminal".to_string()),
            "iTerm2" => Ok("iTerm2".to_string()),
            app if app.contains("iTerm") => Ok("iTerm2".to_string()),
            app if app.contains("Terminal") => Ok("Terminal".to_string()),
            app => {
                // Check if it's a known terminal application
                let known_terminals = ["Kitty", "Alacritty", "Hyper", "Warp", "WezTerm", "Ghostty"];
                for terminal in &known_terminals {
                    if app.contains(terminal) {
                        return Ok("generic".to_string());
                    }
                }
                
                // Default to generic if we can't identify
                Ok("generic".to_string())
            }
        }
    }
    
    fn fallback_text_injection(text: &str) -> Result<(), Box<dyn Error>> {
        eprintln!("Attempting fallback text injection method...");
        
        let script = format!(r#"
            set promptText to "{}"
            
            -- Simple clipboard and paste approach
            tell application "System Events"
                set the clipboard to promptText
                delay 0.2
                key code 9 using {{command down}} -- Cmd+V
                delay 0.1  
                key code 36 -- Enter
            end tell
        "#, AppleScriptExecutor::escape_string(text));
        
        AppleScriptExecutor::execute_script(&script)?;
        println!("Fallback text injection completed");
        Ok(())
    }
    
    pub fn is_terminal_application_active() -> bool {
        let script = r#"
            tell application "System Events"
                set frontmostApp to name of first application process whose frontmost is true
            end tell
            return frontmostApp
        "#;
        
        if let Ok(app_name) = AppleScriptExecutor::execute_script(script) {
            let terminal_apps = [
                "Terminal", "iTerm2", "iTerm", "Kitty", "Alacritty", 
                "Hyper", "Warp", "WezTerm", "Ghostty", "Tabby"
            ];
            
            return terminal_apps.iter().any(|&terminal| app_name.contains(terminal));
        }
        
        false
    }
    
    pub fn get_active_terminal_info() -> Option<String> {
        let script = r#"
            tell application "System Events"
                set frontmostApp to name of first application process whose frontmost is true
                set frontmostWindow to name of front window of first application process whose frontmost is true
            end tell
            return frontmostApp & " - " & frontmostWindow
        "#;
        
        AppleScriptExecutor::execute_script(script).ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_terminal_detection() {
        // This test would require a running terminal to work properly
        // In a real environment, you'd mock the AppleScript execution
        assert!(TerminalInjector::detect_terminal_application().is_ok());
    }
    
    #[test]
    fn test_applescript_string_escaping() {
        let input = r#"Hello "world" with\nbackslashes"#;
        let escaped = AppleScriptExecutor::escape_string(input);
        assert!(escaped.contains("\\\""));
        assert!(escaped.contains("\\n"));
    }
}