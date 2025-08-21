use serde_json::Value;

#[derive(Debug, PartialEq)]
pub enum PermissionLevel {
    Allow,
    Validate,
    Block,
}

pub struct SafetyRules;

impl SafetyRules {
    pub fn evaluate_tool_use(tool_name: &str, tool_input: &Value) -> PermissionLevel {
        match tool_name {
            // Always safe - information gathering
            "Read" | "Glob" | "Grep" | "LS" => PermissionLevel::Allow,
            
            // Requires validation - file modifications  
            "Edit" | "Write" | "MultiEdit" | "NotebookEdit" => {
                Self::evaluate_file_operation(tool_input)
            },
            
            // Potentially dangerous - command execution
            "Bash" => Self::evaluate_bash_command(tool_input),
            
            // Generally safe but validate
            "Task" | "WebFetch" | "WebSearch" => PermissionLevel::Validate,
            
            // Block unknown tools
            _ => PermissionLevel::Block,
        }
    }
    
    fn evaluate_file_operation(tool_input: &Value) -> PermissionLevel {
        if let Some(file_path) = tool_input.get("file_path").and_then(|v| v.as_str()) {
            // Block system files and directories
            if file_path.starts_with("/System/") ||
               file_path.starts_with("/usr/") ||
               file_path.starts_with("/etc/") ||
               file_path.starts_with("/bin/") ||
               file_path.starts_with("/sbin/") ||
               file_path.contains("/.ssh/") ||
               file_path.contains("/keychain/") {
                return PermissionLevel::Block;
            }
            
            // Block hidden system files
            if file_path.contains("/.") && (
                file_path.contains("bashrc") ||
                file_path.contains("zshrc") ||
                file_path.contains("profile") ||
                file_path.contains("ssh/config")
            ) {
                return PermissionLevel::Block;
            }
            
            // Allow project files (relative paths or in reasonable directories)
            if file_path.starts_with("./") ||
               file_path.starts_with("../") ||
               file_path.starts_with("/Users/") ||
               file_path.starts_with("/home/") {
                
                // Check file size if available
                if let Some(content) = tool_input.get("content").and_then(|v| v.as_str()) {
                    if content.len() > 1_000_000 { // 1MB limit
                        return PermissionLevel::Validate;
                    }
                }
                
                return PermissionLevel::Allow;
            }
        }
        
        PermissionLevel::Validate
    }
    
    fn evaluate_bash_command(tool_input: &Value) -> PermissionLevel {
        if let Some(command) = tool_input.get("command").and_then(|v| v.as_str()) {
            let cmd_lower = command.to_lowercase();
            
            // Block dangerous commands
            let dangerous_patterns = [
                "rm -rf",
                "sudo",
                "chmod +x",
                "curl",
                "wget",
                "dd if=",
                "mkfs",
                "fdisk",
                "format",
                "> /dev/",
                "shutdown",
                "reboot",
                "killall",
                "kill -9",
            ];
            
            for pattern in &dangerous_patterns {
                if cmd_lower.contains(pattern) {
                    return PermissionLevel::Block;
                }
            }
            
            // Allow safe commands
            let safe_commands = [
                "ls", "pwd", "echo", "cat", "head", "tail",
                "grep", "find", "which", "whereis",
                "git status", "git log", "git diff",
                "npm list", "yarn list",
                "cargo check", "cargo build",
                "python --version", "node --version",
            ];
            
            for safe_cmd in &safe_commands {
                if cmd_lower.starts_with(safe_cmd) {
                    return PermissionLevel::Allow;
                }
            }
            
            // Default to validation for other commands
            PermissionLevel::Validate
        } else {
            PermissionLevel::Block
        }
    }
    
    pub fn should_suppress_output(tool_name: &str, permission: PermissionLevel) -> bool {
        // Suppress output for auto-approved safe operations
        matches!(permission, PermissionLevel::Allow) && 
        matches!(tool_name, "Read" | "Glob" | "Grep" | "LS")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    
    #[test]
    fn test_safe_tools() {
        assert_eq!(SafetyRules::evaluate_tool_use("Read", &json!({})), PermissionLevel::Allow);
        assert_eq!(SafetyRules::evaluate_tool_use("Glob", &json!({})), PermissionLevel::Allow);
        assert_eq!(SafetyRules::evaluate_tool_use("Grep", &json!({})), PermissionLevel::Allow);
        assert_eq!(SafetyRules::evaluate_tool_use("LS", &json!({})), PermissionLevel::Allow);
    }
    
    #[test]
    fn test_file_operations() {
        let safe_file = json!({"file_path": "./src/main.rs"});
        assert_eq!(SafetyRules::evaluate_tool_use("Edit", &safe_file), PermissionLevel::Allow);
        
        let system_file = json!({"file_path": "/etc/passwd"});
        assert_eq!(SafetyRules::evaluate_tool_use("Edit", &system_file), PermissionLevel::Block);
    }
    
    #[test]
    fn test_bash_commands() {
        let safe_cmd = json!({"command": "git status"});
        assert_eq!(SafetyRules::evaluate_tool_use("Bash", &safe_cmd), PermissionLevel::Allow);
        
        let dangerous_cmd = json!({"command": "rm -rf /"});
        assert_eq!(SafetyRules::evaluate_tool_use("Bash", &dangerous_cmd), PermissionLevel::Block);
        
        let unknown_cmd = json!({"command": "custom-script.sh"});
        assert_eq!(SafetyRules::evaluate_tool_use("Bash", &unknown_cmd), PermissionLevel::Validate);
    }
}