import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import "./index.css";
import { GameStateProvider } from "./context/GameStateContext.tsx";
import { PlayerControlsProvider } from "./context/PlayerControlsContext.tsx";

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <GameStateProvider>
        <PlayerControlsProvider>
          <App />
        </PlayerControlsProvider>
      </GameStateProvider>
    </React.StrictMode>
  );
}