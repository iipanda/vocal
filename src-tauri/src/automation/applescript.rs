use std::process::Command;
use std::error::Error;

pub struct AppleScriptExecutor;

impl AppleScriptExecutor {
    pub fn execute_script(script: &str) -> Result<String, Box<dyn Error>> {
        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()?;
        
        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            return Err(format!("AppleScript execution failed: {}", error_msg).into());
        }
        
        let result = String::from_utf8_lossy(&output.stdout);
        Ok(result.trim().to_string())
    }
    
    pub fn escape_string(input: &str) -> String {
        input.replace("\\", "\\\\")
             .replace("\"", "\\\"")
             .replace("\n", "\\n")
             .replace("\r", "\\r")
             .replace("\t", "\\t")
    }
    
    pub fn create_terminal_injection_script(
        prompt_text: &str,
        terminal_app: &str,
        session_info: Option<&crate::hooks::state::SessionInfo>,
    ) -> String {
        let escaped_prompt = Self::escape_string(prompt_text);
        
        match terminal_app {
            "Terminal" => Self::create_terminal_app_script(&escaped_prompt, session_info),
            "iTerm2" => Self::create_iterm2_script(&escaped_prompt, session_info),
            _ => Self::create_generic_terminal_script(&escaped_prompt),
        }
    }
    
    fn create_terminal_app_script(prompt_text: &str, session_info: Option<&crate::hooks::state::SessionInfo>) -> String {
        if let Some(session) = session_info {
            if !session.term_session.is_empty() {
                return format!(r#"
                    set promptText to "{}"
                    set termSession to "{}"
                    
                    tell application "Terminal"
                        repeat with w in windows
                            repeat with t in tabs of w
                                if (id of t) contains termSession then
                                    set selected tab of w to t
                                    set frontmost to true
                                    activate
                                    tell application "System Events"
                                        set the clipboard to promptText
                                        key code 9 using {{command down}} -- Cmd+V (paste)
                                        delay 0.1
                                        key code 36 -- Enter
                                    end tell
                                    return
                                end if
                            end repeat
                        end repeat
                    end tell
                    
                    -- Fallback to frontmost terminal
                    tell application "Terminal"
                        activate
                        tell application "System Events"
                            set the clipboard to promptText
                            key code 9 using {{command down}}
                            delay 0.1
                            key code 36
                        end tell
                    end tell
                "#, prompt_text, session.term_session);
            }
        }
        
        // Default Terminal.app script
        format!(r#"
            set promptText to "{}"
            
            tell application "Terminal"
                activate
                tell application "System Events"
                    set the clipboard to promptText
                    key code 9 using {{command down}} -- Cmd+V (paste)
                    delay 0.1
                    key code 36 -- Enter
                end tell
            end tell
        "#, prompt_text)
    }
    
    fn create_iterm2_script(prompt_text: &str, session_info: Option<&crate::hooks::state::SessionInfo>) -> String {
        if let Some(session) = session_info {
            if !session.iterm_session.is_empty() {
                return format!(r#"
                    set promptText to "{}"
                    set itermSession to "{}"
                    
                    tell application "iTerm2"
                        repeat with w in windows
                            repeat with t in tabs of w
                                repeat with s in sessions of t
                                    if (unique ID of s) contains itermSession then
                                        select w
                                        select t
                                        activate
                                        tell s to write text promptText
                                        return
                                    end if
                                end repeat
                            end repeat
                        end repeat
                    end tell
                    
                    -- Fallback to current session
                    tell application "iTerm2"
                        activate
                        tell current session of current tab of current window
                            write text promptText
                        end tell
                    end tell
                "#, prompt_text, session.iterm_session);
            }
        }
        
        // Default iTerm2 script
        format!(r#"
            set promptText to "{}"
            
            tell application "iTerm2"
                activate
                tell current session of current tab of current window
                    write text promptText
                end tell
            end tell
        "#, prompt_text)
    }
    
    fn create_generic_terminal_script(prompt_text: &str) -> String {
        format!(r#"
            set promptText to "{}"
            
            -- Get frontmost application
            tell application "System Events"
                set frontmostApp to name of first application process whose frontmost is true
                
                -- Handle known terminal applications
                if frontmostApp is "Terminal" then
                    tell application "Terminal"
                        activate
                        tell application "System Events"
                            set the clipboard to promptText
                            key code 9 using {{command down}} -- Paste
                            delay 0.1
                            key code 36 -- Enter
                        end tell
                    end tell
                    
                else if frontmostApp is "iTerm2" then
                    tell application "iTerm2"
                        activate
                        tell current session of current tab of current window
                            write text promptText
                        end tell
                    end tell
                    
                else if frontmostApp contains "Kitty" or frontmostApp contains "Alacritty" or frontmostApp contains "Hyper" or frontmostApp contains "Warp" then
                    -- Generic approach for other terminals
                    tell process frontmostApp
                        set frontmost to true
                        set the clipboard to promptText
                        key code 9 using {{command down}} -- Paste
                        delay 0.1
                        key code 36 -- Enter
                    end tell
                    
                else
                    -- Fallback: assume any app can receive text
                    set frontmost to true
                    set the clipboard to promptText
                    key code 9 using {{command down}}
                    delay 0.1
                    key code 36
                end if
            end tell
        "#, prompt_text)
    }
}