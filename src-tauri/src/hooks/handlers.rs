use crate::hooks::{HookContext, safety::SafetyRules, safety::PermissionLevel, state};
use serde_json::{json, Value};
use std::error::Error;

pub fn handle_pre_tool_use(ctx: &HookContext) -> Result<(), Box<dyn Error>> {
    // Only process if hands-free mode is active
    if !state::is_hands_free_active() {
        return Ok(());
    }
    
    let tool_name = ctx.data["tool_name"].as_str().unwrap_or("");
    let tool_input = &ctx.data["tool_input"];
    
    // Evaluate safety level
    let permission = SafetyRules::evaluate_tool_use(tool_name, tool_input);
    
    match permission {
        PermissionLevel::Allow => {
            let response = json!({
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "allow",
                    "permissionDecisionReason": format!("Hands-free mode: {} operation auto-approved", tool_name)
                },
                "suppressOutput": SafetyRules::should_suppress_output(tool_name, permission)
            });
            
            println!("{}", response);
        },
        PermissionLevel::Validate => {
            // Let normal confirmation flow proceed, but log the validation
            eprintln!("Hands-free mode: {} operation requires user validation", tool_name);
        },
        PermissionLevel::Block => {
            let response = json!({
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse", 
                    "permissionDecision": "block",
                    "permissionDecisionReason": format!("Hands-free mode: {} operation blocked for safety", tool_name)
                }
            });
            
            println!("{}", response);
        }
    }
    
    Ok(())
}

pub fn handle_post_tool_use(ctx: &HookContext) -> Result<(), Box<dyn Error>> {
    // Only process if hands-free mode is active
    if !state::is_hands_free_active() {
        return Ok(());
    }
    
    let tool_name = ctx.data["tool_name"].as_str().unwrap_or("");
    
    // Log successful operations for audit trail
    eprintln!("Hands-free mode: {} operation completed", tool_name);
    
    Ok(())
}

pub fn handle_stop(ctx: &HookContext) -> Result<(), Box<dyn Error>> {
    // Only process if hands-free mode is active
    if !state::is_hands_free_active() {
        return Ok(());
    }
    
    // Prevent infinite loops by checking if we're already in a hook cycle
    if ctx.data.get("stop_hook_active").and_then(|v| v.as_bool()).unwrap_or(false) {
        return Ok(());
    }
    
    // Save session information for terminal targeting
    if let Err(e) = state::save_session_info(ctx) {
        eprintln!("Warning: Failed to save session info: {}", e);
    }
    
    // Trigger recording restart
    if let Err(e) = state::trigger_recording_restart() {
        eprintln!("Warning: Failed to trigger recording restart: {}", e);
    } else {
        eprintln!("Hands-free mode: Triggered recording restart for next cycle");
    }
    
    Ok(())
}

pub fn handle_user_prompt_submit(ctx: &HookContext) -> Result<(), Box<dyn Error>> {
    // Only process if hands-free mode is active
    if !state::is_hands_free_active() {
        return Ok(());
    }
    
    eprintln!("Hands-free mode: User prompt submitted, preparing for Claude Code processing");
    
    Ok(())
}

pub fn get_cycle_count() -> Result<u32, Box<dyn Error>> {
    let trigger_path = state::cycle_trigger_path();
    
    if !trigger_path.exists() {
        return Ok(0);
    }
    
    let content = std::fs::read_to_string(&trigger_path)?;
    let timestamp: i64 = content.trim().parse().unwrap_or(0);
    
    // Simple cycle counting based on recent activity
    let now = chrono::Utc::now().timestamp();
    let elapsed = now - timestamp;
    
    // Reset count if more than 5 minutes have passed
    if elapsed > 300 {
        return Ok(0);
    }
    
    // For now, return a simple count (could be enhanced with actual cycle tracking)
    Ok(1)
}

pub fn is_cycle_limit_exceeded() -> bool {
    const MAX_CYCLES: u32 = 10;
    
    match get_cycle_count() {
        Ok(count) => count >= MAX_CYCLES,
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    
    #[test]
    fn test_cycle_limit_checking() {
        // This is a basic test - in production you'd want more sophisticated cycle tracking
        assert!(!is_cycle_limit_exceeded());
    }
    
    #[test] 
    fn test_hook_context_creation() {
        let test_data = json!({
            "session_id": "test-session",
            "transcript_path": "/tmp/test",
            "cwd": "/home/user/project",
            "hook_event_name": "PreToolUse",
            "tool_name": "Read",
            "tool_input": {"file_path": "./test.txt"}
        });
        
        // This would normally come from stdin, but we can test the structure
        let ctx = HookContext {
            session_id: "test-session".to_string(),
            transcript_path: "/tmp/test".to_string(), 
            cwd: "/home/user/project".to_string(),
            hook_event_name: "PreToolUse".to_string(),
            data: test_data,
        };
        
        assert_eq!(ctx.session_id, "test-session");
        assert_eq!(ctx.cwd, "/home/user/project");
    }
}