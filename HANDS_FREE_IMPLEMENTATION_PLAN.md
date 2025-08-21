# Hands-Free Claude Code Experience - Implementation Plan

## Overview

This document outlines the complete implementation plan for adding hands-free voice interaction with Claude Code. The feature enables automatic cycling between voice recording, transcription, Claude Code execution with auto-approvals, and recording restart.

## Implementation Phases

### Phase 1: CLI Infrastructure
**Goal**: Set up the core CLI structure for hook handling

**Tasks**:
1. Add `clap` dependency for CLI parsing
2. Create CLI module with hook subcommands
3. Implement basic hook command routing
4. Add hook context parsing from stdin
5. Create hands-free state management utilities

**Files to Create/Modify**:
- `src-tauri/Cargo.toml` - Add clap dependency
- `src-tauri/src/cli/mod.rs` - CLI structure
- `src-tauri/src/hooks/mod.rs` - Hook handlers
- `src-tauri/src/hooks/state.rs` - State management
- `src-tauri/src/main.rs` - CLI entry point

### Phase 2: Hook Implementation
**Goal**: Implement the core hook handlers for auto-approval and cycling

**Tasks**:
1. Implement PreToolUse handler for auto-approvals
2. Create safety rules for different tool types
3. Implement Stop hook for session detection and cycle triggering
4. Add session registry management
5. Create setup-hooks command for Claude Code configuration

**Files to Create/Modify**:
- `src-tauri/src/hooks/handlers.rs` - Hook implementation
- `src-tauri/src/hooks/setup.rs` - Settings installation
- `src-tauri/src/hooks/safety.rs` - Safety rules

### Phase 3: Tauri App Integration
**Goal**: Modify the Tauri app to support hands-free mode

**Tasks**:
1. Add hands-free state to app state
2. Create terminal text injection command
3. Modify transcription workflow for Claude Code injection
4. Add file system watchers for cycle triggers
5. Implement AppleScript-based text injection

**Files to Create/Modify**:
- `src/hooks/use-app-state.ts` - Add hands-free state
- `src/components/DictationWindow.tsx` - Modify workflow
- `src-tauri/src/commands/mod.rs` - Add injection command
- `src-tauri/src/automation/mod.rs` - AppleScript automation

### Phase 4: Frontend Updates
**Goal**: Add hands-free mode UI and controls

**Tasks**:
1. Add hands-free toggle to UI
2. Implement visual feedback for hands-free state
3. Add emergency stop controls
4. Create activity log for auto-approvals
5. Add file system watchers for cycle triggers

**Files to Create/Modify**:
- `src/components/HandsFreeControls.tsx` - New component
- `src/hooks/use-hands-free.ts` - Hands-free hook
- `src/hooks/use-recording.ts` - Modified recording logic
- `src/utils/file-watchers.ts` - File system watchers

### Phase 5: Testing & Documentation
**Goal**: Ensure reliability and provide user documentation

**Tasks**:
1. Test hook installation and configuration
2. Test auto-approval safety rules
3. Test terminal injection across different terminals
4. Verify cycle prevention and emergency stops
5. Create comprehensive user documentation

## Technical Architecture

### CLI Structure
```
vocal
├── setup-hooks          # Install Claude Code hooks
└── hook
    ├── pre-tool-use     # Handle tool auto-approvals
    ├── post-tool-use    # Handle post-tool actions
    ├── stop             # Handle session cycling
    └── user-prompt-submit # Handle prompt submissions
```

### State Management
- `~/.vocal-hands-free-active` - Flag file for hands-free mode
- `~/.vocal-session-registry.json` - Terminal session information
- `~/.vocal-cycle-trigger` - Trigger file for recording restart
- `~/.vocal-emergency-stop` - Emergency stop flag

### Hook Flow
```
1. User toggles hands-free mode in Vocal app
2. PreToolUse hook auto-approves safe operations
3. Stop hook detects Claude completion
4. Stop hook saves session info and triggers cycle
5. Vocal app detects trigger and restarts recording
6. Cycle continues until user exits hands-free mode
```

### Safety Rules
- **Auto-Approve**: Read, Glob, Grep, LS operations
- **Validate**: Edit/Write operations on project files
- **Block**: System operations, destructive commands
- **Never**: rm -rf, sudo, chmod +x, external network calls

### Terminal Integration
- **Detection**: Use environment variables and session IDs
- **Injection**: AppleScript for macOS terminal automation
- **Targeting**: Specific window/session targeting by ID
- **Fallback**: Generic automation for unknown terminals

## File Structure

```
src-tauri/
├── src/
│   ├── cli/
│   │   └── mod.rs              # CLI parsing and routing
│   ├── hooks/
│   │   ├── mod.rs              # Hook exports
│   │   ├── handlers.rs         # Hook implementations
│   │   ├── setup.rs            # Settings installation  
│   │   ├── state.rs            # State management
│   │   └── safety.rs           # Safety rules
│   ├── automation/
│   │   ├── mod.rs              # Automation exports
│   │   ├── applescript.rs      # AppleScript execution
│   │   └── terminal.rs         # Terminal detection
│   ├── commands/
│   │   ├── mod.rs              # Tauri commands
│   │   └── hands_free.rs       # Hands-free commands
│   └── main.rs                 # Entry point
└── Cargo.toml                  # Dependencies

src/
├── components/
│   ├── HandsFreeControls.tsx   # Hands-free UI controls
│   └── DictationWindow.tsx     # Modified workflow
├── hooks/
│   ├── use-hands-free.ts       # Hands-free state hook
│   ├── use-app-state.ts        # Extended app state
│   └── use-recording.ts        # Modified recording
└── utils/
    └── file-watchers.ts        # File system watchers
```

## Dependencies

### Rust Dependencies
- `clap` - CLI parsing
- `serde_json` - JSON handling
- `dirs` - Directory utilities
- `chrono` - Timestamp handling
- `tokio` - Async runtime
- `notify` - File system watching

### Frontend Dependencies
- No new dependencies required
- Uses existing Tauri, React, TypeScript stack

## Security Considerations

1. **Input Validation**: All AppleScript input is sanitized
2. **Path Validation**: Hooks validate file paths and operations
3. **Command Whitelisting**: Only safe commands are auto-approved
4. **Session Isolation**: Hooks only target specific Claude sessions
5. **Emergency Stops**: Multiple mechanisms to exit hands-free mode
6. **Audit Logging**: All auto-approved actions are logged

## Error Handling

1. **Hook Failures**: Graceful fallback to manual approval
2. **Terminal Detection**: Fallback to generic automation
3. **File System Errors**: Continue operation with warnings
4. **AppleScript Errors**: Retry with fallback methods
5. **Session Loss**: Detect and re-establish session tracking

## Testing Strategy

1. **Unit Tests**: Individual hook handlers and safety rules
2. **Integration Tests**: Full hands-free cycle testing
3. **Terminal Tests**: Multiple terminal applications
4. **Safety Tests**: Verify dangerous operations are blocked
5. **Performance Tests**: Hook execution speed and resource usage

## Rollout Plan

1. **Development**: Implement in feature branch
2. **Internal Testing**: Test with various Claude Code projects
3. **Beta Release**: Release to limited users for feedback
4. **Documentation**: Complete user and developer docs
5. **General Release**: Release to all users with comprehensive docs

## Success Metrics

1. **Setup Success Rate**: % of users who successfully install hooks
2. **Auto-Approval Accuracy**: % of safe operations correctly approved
3. **False Positive Rate**: % of dangerous operations incorrectly approved
4. **Cycle Reliability**: % of successful recording restart cycles
5. **User Satisfaction**: Feedback on hands-free experience quality

## Risk Mitigation

1. **Data Loss Prevention**: Multiple confirmations for destructive operations
2. **Infinite Loop Prevention**: Cycle counting and timeouts
3. **Resource Usage**: Hook execution monitoring and limits
4. **Compatibility Issues**: Extensive terminal and OS testing
5. **Security Vulnerabilities**: Code review and security auditing

This implementation plan provides a comprehensive roadmap for developing the hands-free Claude Code experience while maintaining safety, reliability, and user control.