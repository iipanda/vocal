# Vocal - AI-Powered Voice Coding Assistant

A powerful voice-controlled coding assistant that seamlessly integrates with Claude Code for hands-free development. Captures speech, transcribes it using AI, refines prompts, and injects them directly into your Claude Code sessions.

## Features

### Core Dictation
- **Global Hotkey**: Press `Cmd+Shift+V` (configurable) to activate voice recording
- **Real-time Audio Visualization**: Visual waveform feedback while recording
- **AI-Powered Transcription**: Uses Groq's Whisper API for accurate speech-to-text
- **Prompt Refinement**: Leverages Anthropic's Claude API to improve prompt clarity
- **Automatic Clipboard**: Refined prompts are automatically copied to your clipboard

### 🎯 Hands-Free Claude Code Integration
- **Seamless Terminal Injection**: Automatically injects prompts into active Claude Code sessions
- **Auto-Approval System**: Safe operations (Read, Glob, Grep, LS) are automatically approved
- **Cycle Management**: Automatically restarts voice recording after Claude Code completes
- **Session Detection**: Intelligently targets the correct terminal window/tab
- **Emergency Controls**: Multiple safety mechanisms to exit hands-free mode instantly
- **Visual Feedback**: Clear status indicators for recording, processing, and error states

## Quick Start

1. **Install Dependencies**
   ```bash
   bun install
   ```

2. **Configure API Keys**
   - Get a Groq API key from [groq.com](https://groq.com)
   - Get an Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
   - Run the app and click the settings gear icon to configure your API keys

3. **Run the Application**
   ```bash
   bun run tauri dev
   ```

4. **Setup Hands-Free Mode (Optional)**
   ```bash
   # From your project directory where you want to use Claude Code
   ./path/to/vocal setup-hooks
   ```

## Usage

### Standard Mode
- Press your hotkey (default: `Cmd+Shift+V`) to activate voice recording
- Speak your prompt clearly
- Press Enter to stop recording and process
- Refined prompt is copied to your clipboard

### 🚀 Hands-Free Mode
1. **Setup**: Run `vocal setup-hooks` in your project directory
2. **Activate**: Start Claude Code with `claude` in your terminal
3. **Toggle**: Enable hands-free mode in the Vocal app
4. **Use**: Press your hotkey, speak, press Enter - Claude Code processes automatically
5. **Continue**: Recording automatically restarts after Claude Code completes

#### Hands-Free Workflow
```
[Voice Input] → [Transcribe] → [Refine] → [Inject to Claude] → [Auto-restart] → [Loop]
```

## How It Works

### Standard Mode
1. **Capture**: Global hotkey activates the transparent recording window
2. **Record**: Real-time waveform visualization provides audio feedback
3. **Transcribe**: Audio is sent to Groq API for speech-to-text conversion
4. **Refine**: Transcribed text is enhanced by Claude API to create better prompts
5. **Copy**: Final refined prompt is automatically copied to your clipboard

### Hands-Free Mode
1. **Hook Installation**: `vocal setup-hooks` configures Claude Code to use Vocal for automation
2. **Session Detection**: Vocal tracks your active Claude Code terminal session
3. **Auto-Approval**: Safe operations like file reading are automatically approved
4. **Terminal Injection**: Prompts are injected directly into Claude Code using AppleScript
5. **Cycle Management**: Recording automatically restarts when Claude Code finishes responding

## Safety Features

### Auto-Approval Rules
- ✅ **Always Safe**: `Read`, `Glob`, `Grep`, `LS` - Information gathering operations
- ⚠️ **Validated**: `Edit`, `Write` on project files, moderate-sized operations
- 🚫 **Blocked**: System files, dangerous commands (`rm -rf`, `sudo`, `curl`), large operations

### Emergency Controls
- **Global Hotkey**: `Ctrl+Shift+Q` - Instant exit from hands-free mode
- **Emergency Stop Button**: In-app red button to immediately disable hands-free mode
- **File-based Kill Switch**: `touch ~/.vocal-emergency-stop` to force stop
- **Cycle Limits**: Automatic timeout after 10 cycles or 30 minutes
- **Session Isolation**: Only targets specific Claude Code sessions

## Supported Terminals

### macOS (Primary Support)
- **Terminal.app** - Full session targeting support
- **iTerm2** - Full session targeting support  
- **Kitty** - Generic AppleScript support
- **Alacritty** - Generic AppleScript support
- **Hyper** - Generic AppleScript support
- **Warp** - Generic AppleScript support
- **WezTerm** - Generic AppleScript support

### Future Platform Support
- Windows (PowerShell automation) - Planned
- Linux (xdotool automation) - Planned

## CLI Commands

### Hook Management
```bash
# Install Claude Code hooks for hands-free mode
vocal setup-hooks

# Hook handlers (used internally by Claude Code)
vocal hook pre-tool-use
vocal hook post-tool-use  
vocal hook stop
vocal hook user-prompt-submit
```

### State Management
```bash
# Check hands-free status
vocal status

# Emergency controls (future)
vocal emergency-stop
vocal deactivate-hands-free
```

## Development

### Build for Production
```bash
bun run tauri build
```

### Project Structure
```
src/                          # React frontend
├── components/
│   ├── DictationWindow.tsx   # Main voice recording interface
│   ├── HandsFreeControls.tsx # Hands-free mode controls
│   └── ui/                   # UI components
├── hooks/
│   ├── use-app-state.ts      # Global app state with hands-free support
│   ├── use-recording.ts      # Voice recording logic
│   └── use-config.ts         # Configuration management
└── services/
    ├── api.ts                # Groq/Anthropic API integration
    └── config.ts             # Settings management

src-tauri/                    # Rust backend
├── src/
│   ├── lib.rs                # Main Tauri application
│   ├── cli/                  # CLI command parsing
│   ├── hooks/                # Claude Code hook handlers
│   │   ├── handlers.rs       # Hook event processing
│   │   ├── safety.rs         # Auto-approval safety rules
│   │   ├── setup.rs          # Hook installation
│   │   └── state.rs          # Hands-free state management
│   ├── automation/           # Terminal automation
│   │   ├── applescript.rs    # AppleScript execution
│   │   └── terminal.rs       # Terminal detection & injection
│   └── commands/             # Tauri commands
│       └── hands_free.rs     # Hands-free mode commands
```

### API Integration
- **Groq API**: Whisper model for speech-to-text transcription
- **Anthropic API**: Claude model for prompt refinement
- **Claude Code Hooks**: Integration points for automation

## Configuration

API keys are stored in localStorage for development. For production deployment, consider implementing more secure key management.

## Requirements

### System Requirements
- **macOS 10.15+** (Primary support - Windows/Linux coming soon)
- **Microphone Access**: Required for voice recording
- **Internet Connection**: Required for AI API calls
- **Terminal Application**: For Claude Code integration

### API Requirements
- **Groq API Key**: For speech-to-text transcription
- **Anthropic API Key**: For prompt refinement and Claude Code integration

### Hands-Free Mode Requirements
- **Claude Code v0.2.111+**: Latest version with security fixes
- **Terminal with AppleScript Support**: Terminal.app, iTerm2, or compatible
- **Accessibility Permissions**: For terminal automation (macOS will prompt)

## Configuration

### API Keys
API keys are stored in localStorage for development. Configure via Settings UI.

### Claude Code Settings
Generated automatically by `vocal setup-hooks`:
```json
{
  "hooks": {
    "PreToolUse": [{"hooks": [{"command": "vocal hook pre-tool-use"}]}],
    "Stop": [{"hooks": [{"command": "vocal hook stop"}]}]
  }
}
```

### Hands-Free State Files
- `~/.vocal-hands-free-active` - Hands-free mode flag
- `~/.vocal-session-registry.json` - Terminal session info
- `~/.vocal-cycle-trigger` - Recording restart trigger
- `~/.vocal-emergency-stop` - Emergency stop flag

## Privacy & Security

### Data Handling
- **Audio**: Sent to Groq API for transcription (not stored)
- **Text**: Sent to Anthropic API for refinement (not stored)
- **Sessions**: Local terminal session tracking only
- **No Persistent Storage**: Beyond API keys and temporary state files

### Security Features
- **Input Validation**: All AppleScript input is escaped and validated
- **Path Validation**: File operations restricted to safe directories
- **Command Filtering**: Dangerous commands are blocked or require confirmation
- **Session Isolation**: Only targets specific Claude Code sessions
- **Emergency Controls**: Multiple ways to immediately exit hands-free mode

## Troubleshooting

### General Issues
- **No Audio**: Check microphone permissions in System Preferences > Security & Privacy
- **API Errors**: Verify API keys in Settings, check network connection
- **Window Not Appearing**: Try the global hotkey (default: `Cmd+Shift+V`)
- **Clipboard Issues**: Ensure clipboard permissions are granted to Vocal

### Hands-Free Mode Issues
- **Hooks Not Working**: Re-run `vocal setup-hooks` in your project directory
- **Terminal Not Detected**: Ensure you're using a supported terminal application
- **Claude Code Not Responding**: Check that you're running Claude Code v0.2.111+
- **Permission Errors**: Grant Accessibility permissions to Vocal in System Preferences
- **Stuck in Loop**: Use emergency stop (`Ctrl+Shift+Q`) or create `~/.vocal-emergency-stop`
- **Wrong Terminal Targeted**: Close other terminal windows or restart Claude Code

### Debug Commands
```bash
# Check if hands-free mode is active
ls -la ~/.vocal-hands-free-active

# View session registry
cat ~/.vocal-session-registry.json

# Force emergency stop
touch ~/.vocal-emergency-stop

# Clean up state files
rm ~/.vocal-*
```

## Future Enhancements

### Completed ✅
- Custom hotkey configuration
- Hands-free Claude Code integration
- Auto-approval safety system
- Terminal session detection
- Emergency controls

### Planned 🎯
- **Cross-Platform Support**: Windows (PowerShell) and Linux (xdotool) automation
- **Multiple Profiles**: Different configurations for different projects
- **Voice Commands**: "Stop hands-free mode", "Approve this", "Skip this operation"  
- **Smart Session Management**: AI-powered detection of active Claude Code sessions
- **Enhanced Safety**: Real-time code analysis before auto-approval
- **Local Transcription**: Offline speech recognition options
- **Provider Fallbacks**: Automatic switching between AI providers
- **Custom Vocabulary**: Programming-specific terms and project names
- **Inline Mode**: Minimal UI next to cursor instead of popup window
- **Prompt History**: Save and replay previous voice commands

### Experimental 🧪
- **Learning System**: Adapt auto-approval rules based on user patterns
- **Integration Modes**: Support for other AI coding tools beyond Claude Code
- **Performance Optimization**: Parallel hook execution, caching improvements
- **Advanced Automation**: Batch operations, complex workflow support
