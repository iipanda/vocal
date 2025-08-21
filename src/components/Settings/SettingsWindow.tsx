import { useState } from "react";
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

import { useConfig } from "@/hooks/use-config";
import { apiService } from "@/services/api";

export function SettingsWindow() {
  const { config, updateConfig, resetConfig, isLoading } = useConfig();
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const [tempHotkey, setTempHotkey] = useState(config.hotkey);

  const costs = apiService.getCosts();

  const handleSave = async () => {
    await updateConfig({
      groqApiKey: config.groqApiKey,
      anthropicApiKey: config.anthropicApiKey,
      systemPrompt: config.systemPrompt,
      hotkey: tempHotkey,
    });
    window.close();
  };

  const handleResetPrompt = () => {
    resetConfig();
  };

  const startRecordingHotkey = () => {
    setIsRecordingHotkey(true);
    setTempHotkey("Press keys...");
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
    setTempHotkey(newHotkey);
    setIsRecordingHotkey(false);
  };

  const resetHotkey = () => {
    setTempHotkey("CommandOrControl+Shift+V");
    setIsRecordingHotkey(false);
  };

  const resetCosts = () => {
    apiService.resetCosts();
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
                value={config.groqApiKey}
                onChange={(e) => updateConfig({ groqApiKey: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anthropic-api-key">Anthropic API Key</Label>
              <Input
                id="anthropic-api-key"
                type="password"
                placeholder="Enter your Anthropic API key"
                value={config.anthropicApiKey}
                onChange={(e) => updateConfig({ anthropicApiKey: e.target.value })}
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
                  value={tempHotkey}
                  readOnly
                  onKeyDown={handleKeyDown}
                  className={`flex-1 ${
                    isRecordingHotkey ? "ring-2 ring-blue-500" : ""
                  }`}
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
                  : "Current hotkey: " + tempHotkey}
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
                value={config.systemPrompt}
                onChange={(e) => updateConfig({ systemPrompt: e.target.value })}
                rows={6}
                className="min-h-[120px]"
              />
            </div>
            <Button variant="outline" onClick={handleResetPrompt} className="w-full">
              Reset to Default
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Usage & Costs</CardTitle>
            <CardDescription>
              Track your API usage and estimated costs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Transcription</p>
                <p className="text-lg font-semibold">${costs.transcription.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Refinement</p>
                <p className="text-lg font-semibold">${costs.refinement.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">${costs.total.toFixed(4)}</p>
              </div>
            </div>
            <Button variant="outline" onClick={resetCosts} className="w-full">
              Reset Costs
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={() => window.close()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}