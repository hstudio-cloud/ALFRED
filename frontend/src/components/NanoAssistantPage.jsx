import React, { useEffect, useMemo } from "react";
import { useNanoAssistant } from "../context/NanoAssistantContext";
import NanoAIActions from "./NanoAIActions";
import NanoAIState from "./NanoAIState";
import NanoBackgroundAnimation from "./NanoBackgroundAnimation";
import NanoChatPanel from "./NanoChatPanel";
import NanoOperationalBriefing from "./NanoOperationalBriefing";
import useNanoState from "../hooks/useNanoState";
import { nanoQuickPromptMap } from "../lib/nanoTheme";

const getLatestEntry = (items, role) =>
  [...(items || [])].reverse().find((item) => item?.role === role);

const asNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const isExpenseTransaction = (transaction) => {
  const type = String(
    transaction?.type ||
      transaction?.transaction_type ||
      transaction?.entry_type ||
      "",
  ).toLowerCase();
  return ["expense", "debit", "saida", "despesa"].some((item) =>
    type.includes(item),
  );
};

const isIncomeTransaction = (transaction) => {
  const type = String(
    transaction?.type ||
      transaction?.transaction_type ||
      transaction?.entry_type ||
      "",
  ).toLowerCase();
  return ["income", "credit", "entrada", "receita"].some((item) =>
    type.includes(item),
  );
};

const resolveTransactionAmount = (transaction) =>
  asNumber(
    transaction?.amount ??
      transaction?.value ??
      transaction?.total ??
      transaction?.valor,
  );

const resolveDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveReminderDate = (item) =>
  resolveDate(
    item?.due_date ||
      item?.dueDate ||
      item?.scheduled_for ||
      item?.remind_at ||
      item?.date,
  );

const resolveItemTitle = (item, fallback) =>
  item?.title || item?.description || item?.name || fallback;

const buildBriefingData = ({ transactions = [], bills = [], reminders = [] }) => {
  const expenses = transactions.filter(isExpenseTransaction);
  const incomes = transactions.filter(isIncomeTransaction);
  const topExpense = expenses
    .map((item) => ({
      category:
        item?.category ||
        item?.category_name ||
        item?.description ||
        "Categoria não identificada",
      amount: Math.abs(resolveTransactionAmount(item)),
    }))
    .sort((left, right) => right.amount - left.amount)[0];

  const upcomingItems = [...bills, ...reminders]
    .map((item) => ({
      title: resolveItemTitle(item, "Lembrete do Nano"),
      date: resolveReminderDate(item),
      amount: Math.abs(
        asNumber(item?.amount ?? item?.value ?? item?.total ?? item?.valor),
      ),
      status: String(item?.status || "").toLowerCase(),
    }))
    .filter((item) => item.date && item.status !== "paid" && item.status !== "done")
    .sort((left, right) => left.date - right.date);

  const nextPayment = upcomingItems[0];
  const today = new Date();
  const daysUntilNext = nextPayment
    ? Math.max(
        0,
        Math.ceil((nextPayment.date.getTime() - today.getTime()) / 86400000),
      )
    : null;

  const totalIncome = incomes.reduce(
    (sum, item) => sum + Math.abs(resolveTransactionAmount(item)),
    0,
  );
  const totalExpense = expenses.reduce(
    (sum, item) => sum + Math.abs(resolveTransactionAmount(item)),
    0,
  );
  const netBalance = totalIncome - totalExpense;
  const balanceDirection = netBalance >= 0 ? "melhor" : "mais pressionado";
  const balanceBase = totalIncome || totalExpense || 1;
  const balancePercentage = `${netBalance >= 0 ? "+" : ""}${Math.round(
    (Math.abs(netBalance) / balanceBase) * 100,
  )}%`;

  const recommendations = [];
  if (upcomingItems.length > 0) {
    recommendations.push({
      type: "automation",
      text: `Priorize ${upcomingItems.length} compromisso${upcomingItems.length > 1 ? "s" : ""} próximo${upcomingItems.length > 1 ? "s" : ""}.`,
      priority: upcomingItems.length > 2 ? "high" : "medium",
    });
  }
  if (topExpense?.amount) {
    recommendations.push({
      type: "insight",
      text: `O maior gasto atual está em ${topExpense.category}. Vale revisar esse centro de custo.`,
      priority: topExpense.amount > 500 ? "high" : "medium",
    });
  }
  if (!recommendations.length) {
    recommendations.push({
      type: "insight",
      text: "Sem alertas críticos agora. O Nano está pronto para aprofundar qualquer análise.",
      priority: "medium",
    });
  }

  return {
    topExpense: {
      category: topExpense?.category || "Sem despesas recentes",
      amount: (topExpense?.amount || 0).toFixed(2).replace(".", ","),
      trend: totalExpense > totalIncome ? "up" : "stable",
    },
    upcomingBills: upcomingItems.length,
    nextPayment: {
      name: nextPayment?.title || "Nenhum compromisso próximo",
      days: daysUntilNext ?? 0,
      amount: (nextPayment?.amount || 0).toFixed(2).replace(".", ","),
    },
    balanceStatus: {
      current: balanceDirection,
      percentage: balancePercentage,
      period: "saldo operacional recente",
    },
    recommendations,
  };
};

const buildActionsFeed = ({ chatHistory = [], state, voiceStatus }) => {
  const latestAssistant = getLatestEntry(chatHistory, "assistant");
  const latestUser = getLatestEntry(chatHistory, "user");
  const executedActions = latestAssistant?.metadata?.executed_actions || [];

  if (executedActions.length) {
    return executedActions.slice(0, 4).map((item, index) => ({
      id: `${item.type || "action"}-${index}`,
      label:
        item.message ||
        item.payload?.description ||
        item.payload?.title ||
        item.type?.replace(/_/g, " ") ||
        "Ação operacional",
    }));
  }

  const fallbackLabel = latestUser?.content?.slice(0, 56) || voiceStatus || "Pedido recebido";

  return [
    { id: "request", label: fallbackLabel },
    { id: "context", label: "Analisando contexto financeiro" },
    { id: "data", label: "Cruzando histórico e sinais do workspace" },
    { id: "response", label: state === "speaking" ? "Consolidando resposta do Nano" : "Preparando resposta final" },
  ];
};

const resolveAssistantVisualState = ({
  isListening,
  isProcessing,
  isSpeaking,
  voiceState,
}) => {
  if (voiceState === "speaking" || isSpeaking) return "speaking";
  if (voiceState === "processing" || isProcessing) return "executing";
  if (isListening) return "listening";
  return "idle";
};

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
  const {
    state: nanoExperienceState,
    stateLabel,
    transitionTo,
    updateAudioAmplitude,
  } = useNanoState();

  const handleQuickPrompt = (prompt) => {
    setMessage(nanoQuickPromptMap[prompt] || prompt);
  };

  const visualState = useMemo(
    () =>
      resolveAssistantVisualState({
        isListening,
        isProcessing,
        isSpeaking,
        voiceState,
      }),
    [isListening, isProcessing, isSpeaking, voiceState],
  );

  const briefingData = useMemo(
    () => buildBriefingData({ transactions, bills, reminders }),
    [transactions, bills, reminders],
  );

  const actionsFeed = useMemo(
    () =>
      buildActionsFeed({
        chatHistory,
        state: visualState,
        voiceStatus,
      }),
    [chatHistory, visualState, voiceStatus],
  );

  const actionProgress = useMemo(() => {
    if (visualState === "speaking") return 100;
    if (visualState === "executing") return 82;
    if (visualState === "listening") return 36;
    return chatHistory.length ? 18 : 0;
  }, [chatHistory.length, visualState]);

  useEffect(() => {
    transitionTo(visualState);
  }, [transitionTo, visualState]);

  useEffect(() => {
    updateAudioAmplitude(currentLevel || 0);
  }, [currentLevel, updateAudioAmplitude]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-[32px]">
      <NanoBackgroundAnimation
        density={0.35}
        speed={0.22}
        blur
        interactive={false}
        className="absolute inset-0 h-full w-full rounded-[32px]"
      />

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-5">
        <div className="min-h-0">
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

        <aside className="hidden min-h-0 flex-col gap-4 xl:flex">
          <div className="dashboard-panel-secondary overflow-hidden px-5 py-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                  Estado operacional
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  {stateLabel}
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {voiceStatus || "Nano monitorando seu contexto em tempo real."}
                </p>
              </div>
              <div className="rounded-full border border-red-500/15 bg-red-500/8 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-red-200">
                {nanoExperienceState}
              </div>
            </div>

            <NanoAIState state={nanoExperienceState} size={188} interactive={false} />
          </div>

          <div className="dashboard-panel-secondary px-5 py-5">
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                Ações em curso
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                Linha tática do Nano
              </h3>
            </div>
            <NanoAIActions
              actions={actionsFeed}
              isActive={visualState !== "idle"}
              progress={actionProgress}
              size="normal"
            />
          </div>

          <div className="dashboard-panel-secondary flex-1 overflow-y-auto px-5 py-5">
            <NanoOperationalBriefing data={briefingData} />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default NanoAssistantPage;
