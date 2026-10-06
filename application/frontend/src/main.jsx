import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/app.css";

// Apply the saved theme before the first paint (also for the status page, which has no sidebar).
try {
  const savedTheme = JSON.parse(window.localStorage.getItem("opspulse.theme"));
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
} catch {
  // No stored preference: keep the default dark theme.
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
