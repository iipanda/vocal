import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DEFAULT_SYSTEM_PROMPT = "Refine the following spoken text into a clear, concise AI prompt. Remove filler words, improve grammar, and make it more suitable for AI interaction while preserving the original intent. Return ONLY the refined prompt text with no additional explanation, formatting, or quotation marks:";

function SettingsApp() {
  const [groqApiKey, setGroqApiKey] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);

  useEffect(() => {
    // Load existing settings
    setGroqApiKey(localStorage.getItem('groq_api_key') || '');
    setAnthropicApiKey(localStorage.getItem('anthropic_api_key') || '');
    setSystemPrompt(localStorage.getItem('system_prompt') || DEFAULT_SYSTEM_PROMPT);

    // Add dark class to body
    document.body.classList.add('dark');
    return () => document.body.classList.remove('dark');
  }, []);

  const handleSave = () => {
    localStorage.setItem('groq_api_key', groqApiKey);
    localStorage.setItem('anthropic_api_key', anthropicApiKey);
    localStorage.setItem('system_prompt', systemPrompt);
    
    // Close settings window
    window.close();
  };

  const handleReset = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Vocal Settings</h1>
          <p className="text-muted-foreground">Configure your AI dictation preferences</p>
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
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SettingsApp;