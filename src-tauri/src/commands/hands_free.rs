use tauri::{AppHandle, Emitter};
use crate::automation::terminal::TerminalInjector;
use crate::hooks::state;

#[tauri::command]
pub async fn inject_prompt_to_claude_session(prompt: String) -> Result<(), String> {
    println!("Injecting prompt to Claude Code session: {} chars", prompt.len());
    
    // Check if hands-free mode is active
    if !state::is_hands_free_active() {
        return Err("Hands-free mode is not active".to_string());
    }
    
    // Inject the prompt into the terminal
    TerminalInjector::inject_text_to_claude_session(&prompt)
        .map_err(|e| format!("Failed to inject prompt: {}", e))?;
    
    println!("Successfully injected prompt to Claude Code session");
    Ok(())
}

#[tauri::command]
pub async fn activate_hands_free_mode() -> Result<(), String> {
    println!("Activating hands-free mode...");
    
    state::activate_hands_free_mode()
        .map_err(|e| format!("Failed to activate hands-free mode: {}", e))?;
    
    println!("Hands-free mode activated");
    Ok(())
}

#[tauri::command]
pub async fn deactivate_hands_free_mode() -> Result<(), String> {
    println!("Deactivating hands-free mode...");
    
    state::deactivate_hands_free_mode()
        .map_err(|e| format!("Failed to deactivate hands-free mode: {}", e))?;
    
    println!("Hands-free mode deactivated");
    Ok(())
}

#[tauri::command]
pub async fn get_hands_free_status() -> Result<bool, String> {
    Ok(state::is_hands_free_active())
}

#[tauri::command]
pub async fn trigger_emergency_stop() -> Result<(), String> {
    println!("Triggering emergency stop for hands-free mode...");
    
    state::trigger_emergency_stop()
        .map_err(|e| format!("Failed to trigger emergency stop: {}", e))?;
    
    println!("Emergency stop triggered - hands-free mode disabled");
    Ok(())
}

#[tauri::command]
pub async fn get_terminal_info() -> Result<String, String> {
    match TerminalInjector::get_active_terminal_info() {
        Some(info) => Ok(info),
        None => Err("Could not detect terminal information".to_string()),
    }
}

#[tauri::command]
pub async fn is_terminal_active() -> Result<bool, String> {
    Ok(TerminalInjector::is_terminal_application_active())
}

#[tauri::command]
pub async fn check_cycle_trigger(app: AppHandle) -> Result<bool, String> {
    let trigger_path = state::cycle_trigger_path();
    
    if trigger_path.exists() {
        println!("Cycle trigger detected - restarting recording");
        
        // Clear the trigger file
        state::clear_cycle_trigger()
            .map_err(|e| format!("Failed to clear cycle trigger: {}", e))?;
        
        // Emit event to restart recording
        app.emit("restart-recording", ())
            .map_err(|e| format!("Failed to emit restart-recording event: {}", e))?;
        
        Ok(true)
    } else {
        Ok(false)
    }
}