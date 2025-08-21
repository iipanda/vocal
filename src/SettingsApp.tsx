import { useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SettingsWindow } from "@/components/Settings/SettingsWindow";

function SettingsApp() {
  useEffect(() => {
    document.body.classList.add("dark");
    return () => document.body.classList.remove("dark");
  }, []);

  return (
    <ErrorBoundary>
      <SettingsWindow />
    </ErrorBoundary>
  );
}

export default SettingsApp;