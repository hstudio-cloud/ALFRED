import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import AIVoiceVisualizer from "./components/AIVoiceVisualizer";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AIVoiceVisualizer />
    <App />
  </React.StrictMode>,
);
