import { useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DictationWindow } from "@/components/DictationWindow";

function App() {
  useEffect(() => {
    document.body.classList.add("dark", "main-window");
    return () => {
      document.body.classList.remove("dark", "main-window");
    };
  }, []);

  return (
    <ErrorBoundary>
      <DictationWindow />
    </ErrorBoundary>
  );
}

export default App;