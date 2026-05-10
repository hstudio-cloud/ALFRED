import React from "react";
import { useNanoAssistant } from "../context/NanoAssistantContext";
import NanoBackgroundAnimation from "./NanoBackgroundAnimation";
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
    <div className="relative h-full min-h-0 overflow-hidden rounded-[34px]">
      <NanoBackgroundAnimation
        density={0.32}
        speed={0.2}
        blur
        interactive={false}
        className="absolute inset-0 h-full w-full rounded-[34px]"
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_42%,rgba(255,42,42,0.16),transparent_24%),radial-gradient(circle_at_68%_20%,rgba(140,0,0,0.14),transparent_22%),linear-gradient(180deg,rgba(4,4,5,0.78),rgba(5,5,7,0.88)_48%,rgba(3,3,4,0.96))]" />

      <div className="relative z-10 h-full min-h-0">
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
    </div>
  );
};

export default NanoAssistantPage;
