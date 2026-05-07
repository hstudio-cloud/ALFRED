import React, { createContext, useContext, useEffect, useMemo } from "react";

import { useWorkspace } from "./WorkspaceContext";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";

const NanoAssistantContext = createContext(null);

export const useNanoAssistant = () => {
  const context = useContext(NanoAssistantContext);
  if (!context) {
    throw new Error("useNanoAssistant must be used within NanoAssistantProvider");
  }
  return context;
};

export const NanoAssistantProvider = ({ children }) => {
  const { currentWorkspace } = useWorkspace();
  const workspaceVoiceEnabled =
    currentWorkspace?.settings?.features?.assistant_voice ?? true;

  const assistant = useVoiceAssistant({
    autoStart: workspaceVoiceEnabled,
  });
  const { isWakeArmed, stopListening } = assistant;

  useEffect(() => {
    if (!workspaceVoiceEnabled && isWakeArmed) {
      stopListening();
    }
  }, [isWakeArmed, stopListening, workspaceVoiceEnabled]);

  const value = useMemo(
    () => ({
      ...assistant,
      workspaceVoiceEnabled,
    }),
    [assistant, workspaceVoiceEnabled],
  );

  return (
    <NanoAssistantContext.Provider value={value}>
      {children}
    </NanoAssistantContext.Provider>
  );
};
