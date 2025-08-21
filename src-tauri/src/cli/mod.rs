use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "vocal")]
#[command(about = "Voice-controlled coding assistant with Claude Code integration")]
#[command(version)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Setup Claude Code hooks for hands-free mode
    #[command(name = "setup-hooks")]
    SetupHooks,
    
    /// Handle Claude Code hook events (internal use)
    Hook {
        #[command(subcommand)]
        hook_type: HookCommands,
    },
}

#[derive(Subcommand)]
pub enum HookCommands {
    /// Handle PreToolUse hook events for auto-approval
    #[command(name = "pre-tool-use")]
    PreToolUse,
    
    /// Handle PostToolUse hook events
    #[command(name = "post-tool-use")]
    PostToolUse,
    
    /// Handle Stop hook events for cycle management
    Stop,
    
    /// Handle UserPromptSubmit hook events
    #[command(name = "user-prompt-submit")]
    UserPromptSubmit,
}