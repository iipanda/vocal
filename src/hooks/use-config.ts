import { useState, useEffect } from "react";
import { configService, AppConfig } from "@/services/config";
import { invoke } from "@tauri-apps/api/core";

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(configService.getConfig());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateConfig = async (newConfig: Partial<AppConfig>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      configService.updateConfig(newConfig);
      const updatedConfig = configService.getConfig();
      setConfig(updatedConfig);

      // Update global shortcut if hotkey changed
      if (newConfig.hotkey) {
        await invoke("update_global_shortcut", { shortcut: newConfig.hotkey });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const resetConfig = () => {
    configService.resetToDefaults();
    setConfig(configService.getConfig());
  };

  const validateConfig = () => {
    return configService.validateConfig();
  };

  const isConfigured = () => {
    return configService.isConfigured();
  };

  useEffect(() => {
    // Load config on mount
    setConfig(configService.getConfig());
  }, []);

  return {
    config,
    updateConfig,
    resetConfig,
    validateConfig,
    isConfigured,
    isLoading,
    error,
  };
}