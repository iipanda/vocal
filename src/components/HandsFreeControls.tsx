import { useState, useEffect } from "react";
import { useAppState } from "@/hooks/use-app-state";
import { invoke } from "@tauri-apps/api/core";

export function HandsFreeControls() {
  const appState = useAppState();
  const [terminalInfo, setTerminalInfo] = useState<string>("");
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const updateTerminalInfo = async () => {
      try {
        const info = await invoke("get_terminal_info") as string;
        setTerminalInfo(info);
      } catch (error) {
        setTerminalInfo("No terminal detected");
      }
    };

    if (appState.handsFreeMode.isActive) {
      updateTerminalInfo();
      const interval = setInterval(updateTerminalInfo, 5000);
      return () => clearInterval(interval);
    }
  }, [appState.handsFreeMode.isActive]);

  const handleToggleHandsFree = async () => {
    if (appState.handsFreeMode.isActive) {
      await appState.deactivateHandsFreeMode();
    } else {
      await appState.activateHandsFreeMode();
    }
  };

  const getStatusColor = () => {
    if (appState.handsFreeMode.emergencyStopTriggered) return "text-red-400";
    if (appState.handsFreeMode.isActive) {
      switch (appState.handsFreeMode.currentPhase) {
        case 'recording': return "text-blue-400";
        case 'processing': return "text-yellow-400";
        case 'error': return "text-red-400";
        default: return "text-green-400";
      }
    }
    return "text-gray-400";
  };

  const getStatusText = () => {
    if (appState.handsFreeMode.emergencyStopTriggered) return "Emergency Stop Active";
    if (appState.handsFreeMode.isActive) {
      switch (appState.handsFreeMode.currentPhase) {
        case 'recording': return "Recording...";
        case 'processing': return "Processing...";
        case 'error': return "Error - Check logs";
        default: return "Ready for voice input";
      }
    }
    return "Hands-free mode disabled";
  };

  return (
    <div className="bg-black/80 border border-white/20 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            appState.handsFreeMode.isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
          }`} />
          <div>
            <div className="text-sm font-medium text-white">
              Hands-Free Mode
            </div>
            <div className={`text-xs ${getStatusColor()}`}>
              {getStatusText()}
            </div>
          </div>
        </div>
        
        <button
          onClick={handleToggleHandsFree}
          disabled={appState.handsFreeMode.emergencyStopTriggered}
          className={`px-4 py-2 text-xs rounded-md font-medium transition-colors ${
            appState.handsFreeMode.isActive
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          } ${
            appState.handsFreeMode.emergencyStopTriggered
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}
        >
          {appState.handsFreeMode.isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>

      {appState.handsFreeMode.isActive && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-white/70">
            <span>Cycles completed:</span>
            <span>{appState.handsFreeMode.cycleCount}</span>
          </div>
          <div className="flex justify-between text-xs text-white/70">
            <span>Auto-approvals:</span>
            <span>{appState.handsFreeMode.autoApprovalCount}</span>
          </div>
          {appState.handsFreeMode.lastCycleTime && (
            <div className="flex justify-between text-xs text-white/70">
              <span>Last cycle:</span>
              <span>{appState.handsFreeMode.lastCycleTime.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      )}

      {appState.handsFreeMode.isActive && (
        <div className="border-t border-white/10 pt-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-white/50 hover:text-white/70 transition-colors"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
          
          {showDetails && (
            <div className="mt-2 space-y-2">
              <div className="text-xs text-white/60">
                <div className="font-medium">Target Terminal:</div>
                <div className="font-mono bg-black/40 p-2 rounded text-xs mt-1">
                  {terminalInfo}
                </div>
              </div>
              
              <div className="text-xs text-white/60">
                <div className="font-medium">Safety Status:</div>
                <div className="text-green-400">✓ Safe operations auto-approved</div>
                <div className="text-yellow-400">⚠ File operations validated</div>
                <div className="text-red-400">🚫 Dangerous commands blocked</div>
              </div>
            </div>
          )}
        </div>
      )}

      {appState.handsFreeMode.emergencyStopTriggered && (
        <div className="border-t border-red-500/20 pt-3">
          <div className="bg-red-900/20 border border-red-500/30 rounded p-3">
            <div className="text-red-400 text-sm font-medium mb-2">
              🚨 Emergency Stop Activated
            </div>
            <div className="text-red-300 text-xs mb-3">
              Hands-free mode has been disabled for safety. Check your Claude Code session for any issues.
            </div>
            <button
              onClick={async () => {
                await invoke("clear_emergency_stop");
                appState.setHandsFreeMode({ emergencyStopTriggered: false });
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
            >
              Clear Emergency Stop
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-white/10 pt-3 flex space-x-2">
        <button
          onClick={appState.triggerEmergencyStop}
          disabled={!appState.handsFreeMode.isActive}
          className={`flex-1 px-3 py-2 text-xs rounded-md font-medium transition-colors ${
            appState.handsFreeMode.isActive
              ? 'bg-red-800 hover:bg-red-900 text-red-200'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          🚨 Emergency Stop
        </button>
        
        <button
          onClick={() => {
            const shortcuts = [
              "Ctrl+Shift+Q - Emergency stop",
              "Enter - Submit recording", 
              "Escape - Cancel recording",
              "Your hotkey - Start recording"
            ];
            alert("Hands-Free Mode Shortcuts:\n\n" + shortcuts.join("\n"));
          }}
          className="px-3 py-2 text-xs rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200"
        >
          ?
        </button>
      </div>
    </div>
  );
}