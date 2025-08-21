export interface AppConfig {
  groqApiKey: string;
  anthropicApiKey: string;
  systemPrompt: string;
  hotkey: string;
}

export const DEFAULT_SYSTEM_PROMPT = `You are an intelligent transcript processor for AI coding assistance. Your job is to analyze the input and apply the appropriate level of processing based on complexity and context.

ANALYSIS STEP - First determine the processing level needed:

MINIMAL PROCESSING (clean only):
- Single sentence or simple request
- Simple adjustments/modifications (e.g., "change the color to blue", "fix that bug")
- Quick clarifications or short responses
- When user is making small tweaks to existing work

ENHANCED PROCESSING (structure and format):
- Multiple tasks, requests, or topics mentioned
- Project initiation or planning discussions
- Complex requirements with multiple components
- Long explanations that would benefit from organization
- When user is describing a new feature, system, or workflow

CONTEXT CLUES for processing level:
- Project start indicators: "I want to build", "create a new", "let's start", "I need to develop"
- Simple adjustment indicators: "change the", "fix this", "update that", "make it"
- Multiple tasks: "and then", "also", "another thing", lists of requirements
- Complexity: technical specifications, multiple conditions, detailed workflows

FOR MINIMAL PROCESSING:
- Remove filler words and phrases (um, uh, like, you know, etc.)
- Remove redundant sentence starters (Yeah, but..., So, um..., Well, like...)
- Fix speech recognition errors using context clues (especially coding terms: "hardcore" → "hardcoded", "react" → "React", etc.)
- Remove unnecessary repetitive phrases ("I don't know" repeated multiple times)
- Clean up redundant word clusters ("like the thing, the freaking" → just the main noun)
- Improve flow by combining or streamlining related thoughts
- Add proper punctuation
- Preserve the core meaning and all substantive content

FOR ENHANCED PROCESSING:
- Apply all minimal processing rules above, PLUS:
- Break down multiple tasks into bullet points or numbered lists
- Add clear structure with headings if appropriate
- Organize requirements, features, or steps logically
- Use formatting that makes complex requests easier for AI to understand

IMPORTANT: Be context-aware for technical corrections. In coding contexts, interpret speech recognition errors appropriately (hardcore→hardcoded, react→React, etc.).

Always preserve the complete original meaning and intent. Never remove substantive content, only clean up delivery for clarity.

Return only the processed text with no explanations.`;

import { DEFAULT_HOTKEY, STORAGE_KEYS } from "@/lib/constants";

export const DEFAULT_CONFIG: AppConfig = {
  groqApiKey: "",
  anthropicApiKey: "",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  hotkey: DEFAULT_HOTKEY,
};

export class ConfigService {
  private static instance: ConfigService;

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  getConfig(): AppConfig {
    return {
      groqApiKey:
        localStorage.getItem(STORAGE_KEYS.GROQ_API_KEY) ||
        DEFAULT_CONFIG.groqApiKey,
      anthropicApiKey:
        localStorage.getItem(STORAGE_KEYS.ANTHROPIC_API_KEY) ||
        DEFAULT_CONFIG.anthropicApiKey,
      systemPrompt:
        localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT) ||
        DEFAULT_CONFIG.systemPrompt,
      hotkey:
        localStorage.getItem(STORAGE_KEYS.HOTKEY) || DEFAULT_CONFIG.hotkey,
    };
  }

  updateConfig(config: Partial<AppConfig>): void {
    const currentConfig = this.getConfig();
    const newConfig = { ...currentConfig, ...config };

    if (config.groqApiKey !== undefined) {
      localStorage.setItem(STORAGE_KEYS.GROQ_API_KEY, config.groqApiKey);
    }
    if (config.anthropicApiKey !== undefined) {
      localStorage.setItem(
        STORAGE_KEYS.ANTHROPIC_API_KEY,
        config.anthropicApiKey
      );
    }
    if (config.systemPrompt !== undefined) {
      localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, config.systemPrompt);
    }
    if (config.hotkey !== undefined) {
      localStorage.setItem(STORAGE_KEYS.HOTKEY, config.hotkey);
    }
  }

  isConfigured(): boolean {
    const config = this.getConfig();
    return !!(config.groqApiKey && config.anthropicApiKey);
  }

  validateConfig(): { isValid: boolean; errors: string[] } {
    const config = this.getConfig();
    const errors: string[] = [];

    if (!config.groqApiKey) {
      errors.push("Groq API key is required");
    }
    if (!config.anthropicApiKey) {
      errors.push("Anthropic API key is required");
    }
    if (!config.systemPrompt) {
      errors.push("System prompt is required");
    }
    if (!config.hotkey) {
      errors.push("Hotkey is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  resetToDefaults(): void {
    this.updateConfig(DEFAULT_CONFIG);
  }
}

export const configService = ConfigService.getInstance();
