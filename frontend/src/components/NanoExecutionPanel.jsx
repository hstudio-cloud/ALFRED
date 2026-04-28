import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  LoaderCircle,
  Waves,
} from "lucide-react";
import { Progress } from "./ui/progress";

const formatTime = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const actionLabel = (actionType) => {
  if (!actionType) return "acao";
  return actionType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const buildSimulatedSteps = (nanoState, latestUser, latestAssistant) => {
  const baseLabel = latestUser?.content
    ? latestUser.content.slice(0, 68)
    : "Solicitacao recebida";

  const isActive = nanoState === "thinking" || nanoState === "executing";
  const isSpeaking = nanoState === "speaking";

  return [
    {
      key: "request",
      title: "Solicitacao recebida",
      description: baseLabel,
      status: "done",
      timestamp: latestUser?.created_at,
    },
    {
      key: "context",
      title: "Analisando contexto",
      description: "Lendo historico e entendendo o objetivo financeiro.",
      status: isActive || isSpeaking ? "done" : "idle",
    },
    {
      key: "data",
      title: "Buscando dados",
      description: "Reunindo informacoes do workspace e sinais do Nano.",
      status:
        nanoState === "executing" || isSpeaking
          ? "done"
          : nanoState === "thinking"
            ? "active"
            : "idle",
    },
    {
      key: "action",
      title: "Executando acao",
      description:
        latestAssistant?.metadata?.executed_actions?.length
          ? `${latestAssistant.metadata.executed_actions.length} acao(oes) operacional(is) preparada(s).`
          : "Simulando o fluxo visual ate a resposta voltar.",
      status:
        nanoState === "executing"
          ? "active"
          : isSpeaking
            ? "done"
            : "idle",
    },
    {
      key: "response",
      title: "Finalizando resposta",
      description:
        nanoState === "speaking"
          ? "Nano esta respondendo e confirmando o que foi feito."
          : "Aguardando a resposta final do assistente.",
      status: nanoState === "speaking" ? "active" : "idle",
      timestamp: latestAssistant?.created_at,
    },
  ];
};

const buildRealSteps = (latestAssistant, latestUser, nanoState) => {
  const declaredActions = latestAssistant?.metadata?.actions || [];
  const executedActions = latestAssistant?.metadata?.executed_actions || [];
  const allActions = executedActions.length ? executedActions : declaredActions;

  if (!allActions.length) {
    return buildSimulatedSteps(nanoState, latestUser, latestAssistant);
  }

  const steps = [
    {
      key: "request",
      title: "Solicitacao recebida",
      description: latestUser?.content?.slice(0, 72) || "Pedido registrado.",
      status: "done",
      timestamp: latestUser?.created_at,
    },
    {
      key: "context",
      title: "Analisando contexto",
      description: "Interpretando o pedido e mapeando as ferramentas necessarias.",
      status: "done",
    },
  ];

  allActions.slice(0, 4).forEach((action, index) => {
    steps.push({
      key: `${action.type || "action"}-${index}`,
      title: actionLabel(action.type),
      description:
        action.message ||
        action.payload?.description ||
        action.payload?.title ||
        "Acao operacional processada pelo Nano.",
      status: executedActions.length ? "done" : index === 0 && nanoState !== "idle" ? "active" : "idle",
    });
  });

  steps.push({
    key: "response",
    title: "Resposta consolidada",
    description:
      latestAssistant?.content?.slice(0, 96) || "Resumo final pronto para entrega.",
    status: nanoState === "speaking" ? "active" : "done",
    timestamp: latestAssistant?.created_at,
  });

  return steps;
};

const resolveProgress = (steps) => {
  if (!steps.length) return 0;
  const completed = steps.filter((step) => step.status === "done").length;
  const active = steps.some((step) => step.status === "active") ? 0.5 : 0;
  return Math.round(((completed + active) / steps.length) * 100);
};

const StepIcon = ({ status }) => {
  if (status === "done") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  }
  if (status === "active") {
    return <LoaderCircle className="h-4 w-4 animate-spin text-red-300" />;
  }
  return <div className="h-2.5 w-2.5 rounded-full border border-white/16 bg-white/6" />;
};

const NanoExecutionPanel = ({
  chatHistory = [],
  nanoState = "idle",
  voiceStatus = "",
  className = "",
}) => {
  const latestUser = useMemo(
    () => [...chatHistory].reverse().find((item) => item.role === "user"),
    [chatHistory],
  );
  const latestAssistant = useMemo(
    () => [...chatHistory].reverse().find((item) => item.role === "assistant"),
    [chatHistory],
  );

  const steps = useMemo(
    () => buildRealSteps(latestAssistant, latestUser, nanoState),
    [latestAssistant, latestUser, nanoState],
  );
  const progressValue = useMemo(() => resolveProgress(steps), [steps]);
  const executedActions = latestAssistant?.metadata?.executed_actions || [];
  const toolResults = latestAssistant?.metadata?.tool_results || {};
  const usedToolCount = Object.keys(toolResults).length;
  const [displayProgress, setDisplayProgress] = useState(progressValue);

  useEffect(() => {
    setDisplayProgress(progressValue);
  }, [progressValue]);

  const panelStatus =
    nanoState === "thinking"
      ? "Processando contexto"
      : nanoState === "executing"
        ? "Executando sua solicitacao"
        : nanoState === "speaking"
          ? "Respondendo com confirmacao"
          : "Assistente ativo";

  return (
    <aside
      className={`flex flex-col rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,10,12,0.96),rgba(13,8,10,0.92))] shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl ${className}`}
    >
      <div className="border-b border-white/6 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/[0.08] shadow-[0_0_32px_rgba(255,42,42,0.12)]">
            <Waves className="h-4 w-4 text-red-200" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{panelStatus}</p>
            <p className="text-xs text-zinc-500">
              {voiceStatus || "Timeline visual da operacao do Nano."}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-zinc-500">
            <span>Progresso operacional</span>
            <span>{displayProgress}%</span>
          </div>
          <Progress
            value={displayProgress}
            className="h-2 bg-white/6 [&>div]:bg-[linear-gradient(90deg,#ff2a2a,#ff6b6b)]"
          />
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.key} className="relative flex gap-4">
              {index < steps.length - 1 && (
                <div className="absolute left-[9px] top-6 h-[calc(100%+0.5rem)] w-px bg-gradient-to-b from-red-400/50 via-red-500/18 to-transparent" />
              )}
              <div className="relative z-10 mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                <StepIcon status={step.status} />
              </div>
              <div className="min-w-0 pb-2">
                <p className="text-sm font-medium text-zinc-100">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  {step.description}
                </p>
                {step.timestamp ? (
                  <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-zinc-600">
                    {formatTime(step.timestamp)}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${nanoState}-${executedActions.length}-${usedToolCount}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[24px] border border-white/6 bg-white/[0.025] p-4"
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
              Resumo da operacao
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">Estado</span>
                <span className="font-medium text-zinc-100">{panelStatus}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">Acoes executadas</span>
                <span className="font-medium text-zinc-100">
                  {executedActions.length}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">Ferramentas usadas</span>
                <span className="font-medium text-zinc-100">{usedToolCount}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">Ultima resposta</span>
                <span className="font-medium text-zinc-100">
                  {latestAssistant?.created_at
                    ? formatTime(latestAssistant.created_at)
                    : "--:--"}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  );
};

export default NanoExecutionPanel;
