pub mod state;
pub mod handlers;
pub mod setup;
pub mod safety;

use serde_json::Value;
use std::io::{self, Read};
use std::error::Error;

#[derive(Debug)]
pub struct HookContext {
    pub session_id: String,
    pub transcript_path: String,
    pub cwd: String,
    pub hook_event_name: String,
    pub data: Value,
}

impl HookContext {
    pub fn from_stdin() -> Result<Self, Box<dyn Error>> {
        let mut buffer = String::new();
        io::stdin().read_to_string(&mut buffer)?;
        
        let data: Value = serde_json::from_str(&buffer)?;
        
        Ok(HookContext {
            session_id: data["session_id"].as_str().unwrap_or("").to_string(),
            transcript_path: data["transcript_path"].as_str().unwrap_or("").to_string(),
            cwd: data["cwd"].as_str().unwrap_or("").to_string(),
            hook_event_name: data["hook_event_name"].as_str().unwrap_or("").to_string(),
            data,
        })
    }
}

pub use handlers::*;
pub use setup::*;
pub use state::*;
pub use safety::*;