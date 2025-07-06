import React from "react";
import ReactDOM from "react-dom/client";
import SettingsApp from "./SettingsApp";
import "./index.css";

ReactDOM.createRoot(
  document.getElementById("settings-root") as HTMLElement
).render(
  <React.StrictMode>
    <SettingsApp />
  </React.StrictMode>
);
