import React from "react";
import { useNanoAssistant } from "../context/NanoAssistantContext";
import NanoChatPanel from "./NanoChatPanel";
import { nanoQuickPromptMap } from "../lib/nanoTheme";

const NanoAssistantPage = ({
  userName = "Heitor",
  transactions = [],
  reminders = [],
  bills = [],
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
    isAwaitingVoiceCommand,
    error,
    chatError,
    startListening,
    stopListening,
    cancelVoiceCommand,
    interruptSpeaking,
    sendMessage,
  } = useNanoAssistant();

  const handleQuickPrompt = (prompt) => {
    setMessage(nanoQuickPromptMap[prompt] || prompt);
  };

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <NanoChatPanel
        chatHistory={chatHistory}
        message={message}
        setMessage={setMessage}
        userName={userName}
        transactions={transactions}
        reminders={reminders}
        bills={bills}
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
        isAwaitingVoiceCommand={isAwaitingVoiceCommand}
        voiceSupported={voiceSupported}
        error={error}
        chatError={chatError}
        onStartVoice={startListening}
        onStopVoice={stopListening}
        onCancelVoiceCommand={cancelVoiceCommand}
        onInterrupt={interruptSpeaking}
      />
    </div>
  );
};

export default NanoAssistantPage;
