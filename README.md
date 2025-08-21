# Vocal - AI-Powered Dictation App

A cross-platform dictation application that captures speech, transcribes it using AI, refines prompts, and copies them to your clipboard for seamless use with AI agents.

## Features

- **Global Hotkey**: Press `Cmd+Shift+V` (or `Ctrl+Shift+V` on Windows/Linux) to activate
- **Real-time Audio Visualization**: Visual waveform feedback while recording
- **AI-Powered Transcription**: Uses Groq's Whisper API for accurate speech-to-text
- **Prompt Refinement**: Leverages Anthropic's Claude API to improve prompt clarity
- **Automatic Clipboard**: Refined prompts are automatically copied to your clipboard
- **Transparent UI**: Clean, minimal interface that stays out of your way

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

4. **Use the App**
   - Press `Cmd+Shift+V` to activate the dictation window
   - Speak your prompt clearly
   - Click anywhere on the waveform to stop recording
   - The app will process your speech and copy the refined prompt to your clipboard

## How It Works

1. **Capture**: Global hotkey activates the transparent recording window
2. **Record**: Real-time waveform visualization provides audio feedback
3. **Transcribe**: Audio is sent to Groq API for speech-to-text conversion
4. **Refine**: Transcribed text is enhanced by Claude API to create better prompts
5. **Copy**: Final refined prompt is automatically copied to your clipboard

## Development

### Build for Production

```bash
bun run tauri build
```

### Project Structure

- `src/` - React frontend components
- `src-tauri/` - Rust backend with Tauri integration
- `src-tauri/src/lib.rs` - Main application logic and API integrations

### API Integration

- **Groq API**: Used for speech-to-text transcription with Whisper model
- **Anthropic API**: Used for prompt refinement with Claude model

## Configuration

API keys are stored in localStorage for development. For production deployment, consider implementing more secure key management.

## Requirements

- **Audio Input**: Microphone access required
- **Internet Connection**: Required for API calls
- **API Keys**: Groq and Anthropic API keys needed

## Privacy

- Audio data is sent to Groq for transcription
- Transcribed text is sent to Anthropic for refinement
- No data is stored locally beyond API keys
- Application window is hidden after successful completion

## Troubleshooting

- **No Audio**: Check microphone permissions in system settings
- **API Errors**: Verify API keys are correctly configured
- **Window Not Appearing**: Try the global hotkey `Cmd+Shift+V`
- **Clipboard Issues**: Ensure clipboard permissions are granted

## To-Do List for Future Development

1. **Multiple profiles with different hotkeys**
2. **Visual polish (general improvements)**
3. **Inline mode - Show minimal UI next to cursor/caret instead of popup window**
4. **LLM provider fallback - Automatically switch to backup provider (e.g., Groq) when primary fails**
5. **Custom vocabulary - Add custom words/terms for better speech recognition (e.g., "shadcn/ui", "Jira", programming terms)**

## Future Enhancements

- Custom hotkey configuration ✅
- Local transcription options
- Multiple AI provider support
- Prompt history and templates
- Custom refinement instructions
