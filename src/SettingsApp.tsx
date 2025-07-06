import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { invoke } from "@tauri-apps/api/core";

const DEFAULT_SYSTEM_PROMPT = `You are tasked with minimally cleaning up a spoken transcript. Your goal is to make the text more readable while changing as little as possible. Follow these specific guidelines:

WHAT TO CHANGE:
- Fix only obvious speech recognition errors (e.g., "there" when context clearly means "their")
- Remove only excessive filler words (um, uh, like, you know) - but keep some if they seem intentional or add emphasis
- Fix only clear grammatical errors that impede understanding
- Add minimal punctuation for readability

WHAT NOT TO CHANGE:
- Do not shorten, summarize, or condense any content
- Do not rephrase or reword the speaker's language choices
- Do not change the speaker's tone, style, or personality
- Do not remove repetition if it seems intentional for emphasis
- Do not "improve" or "enhance" the language - keep it authentic to the speaker
- Do not change technical terms, names, or specific words even if they seem incorrect

CRITICAL CONSTRAINTS:
- Every substantive point, detail, and idea from the original must remain
- The word count should be nearly identical (within 5-10% of original)
- If you're unsure whether something is an error or intentional speech, leave it unchanged
- Maintain all examples, stories, and explanations in full

Return only the cleaned text with no explanations, quotation marks or comments.`;

function SettingsApp() {
  const [groqApiKey, setGroqApiKey] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [hotkey, setHotkey] = useState("CommandOrControl+Shift+V");
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);

  useEffect(() => {
    setGroqApiKey(localStorage.getItem("groq_api_key") || "");
    setAnthropicApiKey(localStorage.getItem("anthropic_api_key") || "");
    setSystemPrompt(
      localStorage.getItem("system_prompt") || DEFAULT_SYSTEM_PROMPT
    );
    setHotkey(localStorage.getItem("hotkey") || "CommandOrControl+Shift+V");

    document.body.classList.add("dark");
    return () => document.body.classList.remove("dark");
  }, []);

  const handleSave = async () => {
    localStorage.setItem("groq_api_key", groqApiKey);
    localStorage.setItem("anthropic_api_key", anthropicApiKey);
    localStorage.setItem("system_prompt", systemPrompt);
    localStorage.setItem("hotkey", hotkey);

    // Update the global shortcut in the backend
    try {
      await invoke("update_global_shortcut", { shortcut: hotkey });
    } catch (error) {
      console.error("Failed to update global shortcut:", error);
    }

    window.close();
  };

  const handleReset = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
  };

  const startRecordingHotkey = () => {
    setIsRecordingHotkey(true);
    setHotkey("Press keys...");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isRecordingHotkey) return;
    
    e.preventDefault();
    
    const modifiers = [];
    if (e.ctrlKey || e.metaKey) modifiers.push("CommandOrControl");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.altKey) modifiers.push("Alt");
    
    let key = e.key;
    if (key === "Control" || key === "Meta" || key === "Shift" || key === "Alt") {
      return; // Don't record modifier-only presses
    }
    
    // Convert common keys to proper format
    if (key === " ") key = "Space";
    else if (key.length === 1) key = key.toUpperCase();
    
    const newHotkey = [...modifiers, key].join("+");
    setHotkey(newHotkey);
    setIsRecordingHotkey(false);
  };

  const resetHotkey = () => {
    setHotkey("CommandOrControl+Shift+V");
    setIsRecordingHotkey(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Vocal Settings</h1>
          <p className="text-muted-foreground">
            Configure your AI dictation preferences
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Configure your API keys for speech-to-text and prompt refinement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groq-api-key">Groq API Key</Label>
              <Input
                id="groq-api-key"
                type="password"
                placeholder="Enter your Groq API key"
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anthropic-api-key">Anthropic API Key</Label>
              <Input
                id="anthropic-api-key"
                type="password"
                placeholder="Enter your Anthropic API key"
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Global Hotkey</CardTitle>
            <CardDescription>
              Set a custom keyboard shortcut to start recording
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hotkey">Recording Hotkey</Label>
              <div className="flex space-x-2">
                <Input
                  id="hotkey"
                  value={hotkey}
                  readOnly
                  onKeyDown={handleKeyDown}
                  className={`flex-1 ${isRecordingHotkey ? 'ring-2 ring-blue-500' : ''}`}
                  placeholder="Click 'Record' to set hotkey"
                />
                <Button 
                  variant="outline" 
                  onClick={startRecordingHotkey}
                  disabled={isRecordingHotkey}
                >
                  {isRecordingHotkey ? "Recording..." : "Record"}
                </Button>
                <Button variant="outline" onClick={resetHotkey}>
                  Reset
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {isRecordingHotkey 
                  ? "Press your desired key combination..." 
                  : "Current hotkey: " + hotkey
                }
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Prompt</CardTitle>
            <CardDescription>
              Customize how Claude refines your spoken prompts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system-prompt">Custom System Prompt</Label>
              <Textarea
                id="system-prompt"
                placeholder="Enter your custom system prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={6}
                className="min-h-[120px]"
              />
            </div>
            <Button variant="outline" onClick={handleReset} className="w-full">
              Reset to Default
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={() => window.close()}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}

export default SettingsApp;
