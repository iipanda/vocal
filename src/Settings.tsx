import { useState, useEffect } from 'react';

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
    <div className="settings-overlay">
      <div className="settings-window">
        <h3>API Configuration</h3>
        <div className="settings-form">
          <div className="form-group">
            <label htmlFor="groq-key">Groq API Key:</label>
            <input
              id="groq-key"
              type="password"
              value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)}
              placeholder="Enter your Groq API key"
            />
          </div>
          <div className="form-group">
            <label htmlFor="anthropic-key">Anthropic API Key:</label>
            <input
              id="anthropic-key"
              type="password"
              value={anthropicApiKey}
              onChange={(e) => setAnthropicApiKey(e.target.value)}
              placeholder="Enter your Anthropic API key"
            />
          </div>
          <div className="form-actions">
            <button onClick={onClose} className="cancel-btn">Cancel</button>
            <button onClick={handleSave} className="save-btn">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}