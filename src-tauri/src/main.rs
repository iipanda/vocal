// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cli;
mod hooks;
mod automation;

use clap::Parser;
use std::env;

fn main() {
    // Check if we have CLI arguments
    let args: Vec<String> = env::args().collect();
    
    // If no arguments or only the binary name, run the GUI app
    if args.len() <= 1 {
        vocal_lib::run();
        return;
    }
    
    // Parse CLI arguments
    let cli = cli::Cli::parse();
    
    // Handle CLI commands
    if let Err(e) = handle_cli_command(cli) {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}

fn handle_cli_command(cli: cli::Cli) -> Result<(), Box<dyn std::error::Error>> {
    match cli.command {
        cli::Commands::SetupHooks => {
            hooks::install_hooks()?;
        }
        cli::Commands::Hook { hook_type } => {
            let ctx = hooks::HookContext::from_stdin()?;
            
            match hook_type {
                cli::HookCommands::PreToolUse => hooks::handle_pre_tool_use(&ctx)?,
                cli::HookCommands::PostToolUse => hooks::handle_post_tool_use(&ctx)?,
                cli::HookCommands::Stop => hooks::handle_stop(&ctx)?,
                cli::HookCommands::UserPromptSubmit => hooks::handle_user_prompt_submit(&ctx)?,
            }
        }
    }
    
    Ok(())
}
