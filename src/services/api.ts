import { invoke } from "@tauri-apps/api/core";
import { APP_CONFIG } from "@/lib/constants";

export interface TranscriptionOptions {
  audioData: Uint8Array;
  apiKey: string;
  model?: string;
}

export interface RefinementOptions {
  text: string;
  apiKey: string;
  systemPrompt?: string;
  model?: string;
}

export interface ApiCosts {
  transcription: number;
  refinement: number;
  total: number;
}

export class ApiService {
  private static instance: ApiService;
  private costs: ApiCosts = {
    transcription: 0,
    refinement: 0,
    total: 0
  };

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  async transcribeAudio(options: TranscriptionOptions): Promise<string> {
    try {
      const startTime = Date.now();
      const result = await invoke<string>("transcribe_audio", {
        audioData: Array.from(options.audioData),
        apiKey: options.apiKey,
      });
      
      const duration = Date.now() - startTime;
      const estimatedCost = this.calculateTranscriptionCost(options.audioData.length, duration);
      this.costs.transcription += estimatedCost;
      this.costs.total += estimatedCost;
      
      return result;
    } catch (error) {
      throw new Error(`Transcription failed: ${error}`);
    }
  }

  async refinePrompt(options: RefinementOptions): Promise<string> {
    try {
      const startTime = Date.now();
      const result = await invoke<string>("refine_prompt", {
        text: options.text,
        apiKey: options.apiKey,
        systemPrompt: options.systemPrompt,
      });
      
      const duration = Date.now() - startTime;
      const estimatedCost = this.calculateRefinementCost(options.text.length, result.length);
      this.costs.refinement += estimatedCost;
      this.costs.total += estimatedCost;
      
      return result;
    } catch (error) {
      throw new Error(`Prompt refinement failed: ${error}`);
    }
  }

  private calculateTranscriptionCost(audioSize: number, duration: number): number {
    // Estimate audio duration from size (rough approximation)
    const estimatedMinutes = audioSize / (1024 * 1024 * 0.5); // ~0.5MB per minute estimate
    return estimatedMinutes * APP_CONFIG.COSTS.GROQ_PER_MINUTE;
  }

  private calculateRefinementCost(inputTokens: number, outputTokens: number): number {
    // Rough token estimation
    const inputCost = (inputTokens / APP_CONFIG.COSTS.CHARS_PER_TOKEN / 1000) * APP_CONFIG.COSTS.CLAUDE_INPUT_PER_1K_TOKENS;
    const outputCost = (outputTokens / APP_CONFIG.COSTS.CHARS_PER_TOKEN / 1000) * APP_CONFIG.COSTS.CLAUDE_OUTPUT_PER_1K_TOKENS;
    return inputCost + outputCost;
  }

  getCosts(): ApiCosts {
    return { ...this.costs };
  }

  resetCosts(): void {
    this.costs = {
      transcription: 0,
      refinement: 0,
      total: 0
    };
  }
}

export const apiService = ApiService.getInstance();