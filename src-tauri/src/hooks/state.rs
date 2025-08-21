use std::path::PathBuf;
use std::fs;
use serde_json::Value;
use chrono::{DateTime, Utc};
use crate::hooks::HookContext;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct SessionInfo {
    pub session_id: String,
    pub terminal_pid: String,
    pub term_session: String,
    pub iterm_session: String,
    pub tmux: String,
    pub cwd: String,
    pub timestamp: i64,
}

pub fn hands_free_flag_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join(".vocal-hands-free-active")
}

pub fn session_registry_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join(".vocal-session-registry.json")
}

pub fn cycle_trigger_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join(".vocal-cycle-trigger")
}

pub fn emergency_stop_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join(".vocal-emergency-stop")
}

pub fn is_hands_free_active() -> bool {
    hands_free_flag_path().exists() && !emergency_stop_path().exists()
}

pub fn is_emergency_stop_active() -> bool {
    emergency_stop_path().exists()
}

pub fn save_session_info(ctx: &HookContext) -> Result<(), Box<dyn std::error::Error>> {
    let session_info = SessionInfo {
        session_id: ctx.session_id.clone(),
        terminal_pid: std::env::var("PPID").unwrap_or_default(),
        term_session: std::env::var("TERM_SESSION_ID").unwrap_or_default(),
        iterm_session: std::env::var("ITERM_SESSION_ID").unwrap_or_default(),
        tmux: std::env::var("TMUX").unwrap_or_default(),
        cwd: ctx.cwd.clone(),
        timestamp: Utc::now().timestamp(),
    };
    
    let json = serde_json::to_string_pretty(&session_info)?;
    fs::write(session_registry_path(), json)?;
    Ok(())
}

pub fn load_session_info() -> Result<SessionInfo, Box<dyn std::error::Error>> {
    let content = fs::read_to_string(session_registry_path())?;
    let session_info: SessionInfo = serde_json::from_str(&content)?;
    Ok(session_info)
}

pub fn trigger_recording_restart() -> Result<(), std::io::Error> {
    let timestamp = Utc::now().timestamp().to_string();
    fs::write(cycle_trigger_path(), timestamp)?;
    Ok(())
}

pub fn clear_cycle_trigger() -> Result<(), std::io::Error> {
    if cycle_trigger_path().exists() {
        fs::remove_file(cycle_trigger_path())?;
    }
    Ok(())
}

pub fn activate_hands_free_mode() -> Result<(), std::io::Error> {
    let timestamp = Utc::now().timestamp().to_string();
    fs::write(hands_free_flag_path(), timestamp)?;
    Ok(())
}

pub fn deactivate_hands_free_mode() -> Result<(), std::io::Error> {
    if hands_free_flag_path().exists() {
        fs::remove_file(hands_free_flag_path())?;
    }
    clear_cycle_trigger()?;
    Ok(())
}

pub fn trigger_emergency_stop() -> Result<(), std::io::Error> {
    let timestamp = Utc::now().timestamp().to_string();
    fs::write(emergency_stop_path(), timestamp)?;
    deactivate_hands_free_mode()?;
    Ok(())
}

pub fn clear_emergency_stop() -> Result<(), std::io::Error> {
    if emergency_stop_path().exists() {
        fs::remove_file(emergency_stop_path())?;
    }
    Ok(())
}