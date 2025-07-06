import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const [groqApiKey, setGroqApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setGroqApiKey(localStorage.getItem('groq_api_key') || '');
      setAnthropicApiKey(localStorage.getItem('anthropic_api_key') || '');
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('groq_api_key', groqApiKey);
    localStorage.setItem('anthropic_api_key', anthropicApiKey);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold">API Configuration</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label 
              htmlFor="groq-key" 
              className="text-sm font-medium text-foreground"
            >
              Groq API Key
            </label>
            <input
              id="groq-key"
              type="password"
              value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)}
              placeholder="Enter your Groq API key"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          
          <div className="space-y-2">
            <label 
              htmlFor="anthropic-key" 
              className="text-sm font-medium text-foreground"
            >
              Anthropic API Key
            </label>
            <input
              id="anthropic-key"
              type="password"
              value={anthropicApiKey}
              onChange={(e) => setAnthropicApiKey(e.target.value)}
              placeholder="Enter your Anthropic API key"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}