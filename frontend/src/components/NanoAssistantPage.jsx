import React from "react";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";
import NanoChatPanel from "./NanoChatPanel";
import { nanoQuickPromptMap } from "../lib/nanoTheme";

const NanoAssistantPage = ({
  financialView = "general",
  onAfterMessage,
  userName = "Heitor",
}) => {
  const {
    chatHistory,
    message,
    setMessage,
    partialTranscript,
    finalTranscript,
    isListening,
    isProcessing,
    isSpeaking,
    currentLevel,
    voiceState,
    voiceStatus,
    voiceProviderType,
    assistantRuntime,
    voiceSupported,
    isWakeArmed,
    error,
    startListening,
    stopListening,
    interruptSpeaking,
    sendMessage,
  } = useVoiceAssistant({ onAfterMessage });

  const handleQuickPrompt = (prompt) => {
    setMessage(nanoQuickPromptMap[prompt] || prompt);
  };

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <NanoChatPanel
        chatHistory={chatHistory}
        message={message}
        setMessage={setMessage}
        onSend={() => sendMessage()}
        onQuickPrompt={handleQuickPrompt}
        isListening={isListening}
        isProcessing={isProcessing}
        isSpeaking={isSpeaking}
        partialTranscript={partialTranscript}
        finalTranscript={finalTranscript}
        currentLevel={currentLevel}
        voiceState={voiceState}
        voiceStatus={voiceStatus}
        voiceProviderType={voiceProviderType}
        assistantRuntime={assistantRuntime}
        isWakeArmed={isWakeArmed}
        voiceSupported={voiceSupported}
        error={error}
        onStartVoice={startListening}
        onStopVoice={stopListening}
        onInterrupt={interruptSpeaking}
      />
    </div>
  );
};

export default NanoAssistantPage;
