import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function CLISetup() {
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [installMessage, setInstallMessage] = useState<string>("");
  const [manualCommand, setManualCommand] = useState<string>("");

  useEffect(() => {
    checkInstallStatus();
    getManualCommand();
  }, []);

  const checkInstallStatus = async () => {
    try {
      const installed = await invoke("check_cli_installed") as boolean;
      setIsInstalled(installed);
    } catch (error) {
      console.error("Failed to check CLI installation:", error);
    }
  };

  const getManualCommand = async () => {
    try {
      const command = await invoke("get_cli_install_command") as string;
      setManualCommand(command);
    } catch (error) {
      console.error("Failed to get manual command:", error);
    }
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    setInstallMessage("");

    try {
      const message = await invoke("install_cli_symlink") as string;
      setInstallMessage(message);
      
      // Check if installation was successful
      setTimeout(async () => {
        await checkInstallStatus();
        setIsInstalling(false);
      }, 1000);
    } catch (error) {
      setInstallMessage(`Installation failed: ${error}`);
      setIsInstalling(false);
    }
  };

  const handleOpenTerminal = async () => {
    try {
      await invoke("open_terminal_with_command", { 
        command: "echo 'Ready to install Vocal CLI! Run the command shown above.'" 
      });
    } catch (error) {
      console.error("Failed to open terminal:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isInstalled) {
    return (
      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <div>
            <div className="text-sm font-medium text-green-400">
              CLI Installed
            </div>
            <div className="text-xs text-green-300">
              You can now run 'vocal setup-hooks' in any project
            </div>
          </div>
        </div>
        
        <div className="bg-black/40 rounded p-3 font-mono text-sm text-white/80">
          <div className="text-green-400 mb-1"># Navigate to your project directory</div>
          <div>cd /path/to/your/project</div>
          <div className="text-green-400 mt-2 mb-1"># Install Claude Code hooks</div>
          <div>vocal setup-hooks</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div>
          <div className="text-sm font-medium text-yellow-400">
            CLI Setup Required
          </div>
          <div className="text-xs text-yellow-300">
            Install the command line interface for hands-free mode
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleInstall}
          disabled={isInstalling}
          className={`w-full px-4 py-2 text-sm rounded-md font-medium transition-colors ${
            isInstalling
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isInstalling ? 'Installing...' : 'Install CLI Automatically'}
        </button>

        {installMessage && (
          <div className="bg-black/40 rounded p-3 text-sm">
            <div className="text-white/80 mb-2">Installation Result:</div>
            <div className="text-white/60">{installMessage}</div>
          </div>
        )}

        <div className="border-t border-white/10 pt-3">
          <div className="text-xs text-white/60 mb-2">
            Or install manually by running this command in your terminal:
          </div>
          
          <div className="bg-black/40 rounded p-3 font-mono text-sm text-white/80 relative">
            <div className="pr-16">{manualCommand}</div>
            <button
              onClick={() => copyToClipboard(manualCommand)}
              className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded"
            >
              Copy
            </button>
          </div>

          <button
            onClick={handleOpenTerminal}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Open Terminal
          </button>
        </div>
      </div>
    </div>
  );
}