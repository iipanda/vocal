export const APP_CONFIG = {
  RECORDING: {
    DELAY_BEFORE_START: 100,
    DELAY_BEFORE_VISUALIZER: 50,
  },
  WINDOW: {
    HIDE_DELAY: 2000,
  },
  COSTS: {
    GROQ_PER_MINUTE: 0.0002,
    CLAUDE_INPUT_PER_1K_TOKENS: 0.003,
    CLAUDE_OUTPUT_PER_1K_TOKENS: 0.015,
    CHARS_PER_TOKEN: 4,
  },
} as const;

export const STORAGE_KEYS = {
  GROQ_API_KEY: "groq_api_key",
  ANTHROPIC_API_KEY: "anthropic_api_key",
  SYSTEM_PROMPT: "system_prompt",
  HOTKEY: "hotkey",
} as const;

export const DEFAULT_HOTKEY = "CommandOrControl+Shift+V";

export const API_MODELS = {
  GROQ_WHISPER: "whisper-large-v3",
  CLAUDE_SONNET: "claude-sonnet-4-20250514",
} as const;