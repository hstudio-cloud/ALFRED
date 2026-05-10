import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  ArrowUp,
  BellRing,
  CalendarDays,
  Mic,
  MicOff,
  Sparkles,
  Square,
  Target,
  TrendingDown,
  Wallet,
  X,
} from "lucide-react";

import { nanoQuickPromptMap, nanoQuickPrompts } from "../lib/nanoTheme";
import { getRandomResponse, confirmationResponses } from "../lib/nanoResponses";
import NanoCoreAnimation from "./NanoCoreAnimation";
import NanoMark from "./NanoMark";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

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

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

const resolveLiveStatus = ({
  isListening,
  isProcessing,
  isSpeaking,
  partialTranscript,
  finalTranscript,
}) => {
  if (isProcessing) return getRandomResponse(confirmationResponses);
  if (isSpeaking) return "Respondendo via audio...";
  if (partialTranscript || finalTranscript) {
    return partialTranscript || finalTranscript;
  }
  if (isListening) return "Capturando audio...";
  return null;
};

const buildNanoState = ({
  isListening,
  isProcessing,
  isSpeaking,
  voiceState,
  responsePulseActive,
  processingElapsed,
}) => {
  if (voiceState === "speaking") return "speaking";
  if (isSpeaking || responsePulseActive) return "speaking";
  if (voiceState === "processing") {
    return processingElapsed < 1400 ? "thinking" : "executing";
  }
  if (isProcessing && processingElapsed < 1400) return "thinking";
  if (isProcessing) return "executing";
  if (isListening) return "listening";
  return "idle";
};

const getLatestEntry = (chatHistory, role) =>
  [...chatHistory].reverse().find((entry) => entry?.role === role);

const asNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
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

const resolveDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveItemTitle = (item, fallback) =>
  item?.title || item?.description || item?.name || fallback;

const resolveReminderDate = (item) =>
  resolveDate(
    item?.due_date ||
      item?.dueDate ||
      item?.scheduled_for ||
      item?.remind_at ||
      item?.date,
  );

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

const inferContextMode = (text = "") => {
  const normalized = String(text).toLowerCase();

  if (
    /(agenda|hoje|amanha|compromisso|reuniao|treino|lembrete|calendario)/.test(
      normalized,
    )
  ) {
    return "agenda";
  }

  if (
    /(meta|economizar|economia|objetivo|investir|reserva|planejamento|poupar)/.test(
      normalized,
    )
  ) {
    return "goals";
  }

  if (
    /(despesa|gasto|receita|saldo|boleto|fatura|cartao|fluxo|finance|dinheiro|mes)/.test(
      normalized,
    )
  ) {
    return "finance";
  }

  return "default";
};

const buildSparkline = (base, variance = 48) =>
  Array.from({ length: 7 }, (_, index) => {
    const wave = Math.sin(index * 0.92) * variance;
    const drift = Math.cos(index * 0.37) * (variance * 0.42);
    return Math.max(14, Math.round(base + wave + drift));
  });

const createContextModel = ({
  mode,
  transactions,
  reminders,
  bills,
  latestAssistant,
}) => {
  const expenses = transactions.filter(isExpenseTransaction);
  const incomes = transactions.filter(isIncomeTransaction);
  const totalExpenses = expenses.reduce(
    (sum, item) => sum + Math.abs(asNumber(item?.amount ?? item?.value ?? item?.total ?? item?.valor)),
    0,
  );
  const totalIncome = incomes.reduce(
    (sum, item) => sum + Math.abs(asNumber(item?.amount ?? item?.value ?? item?.total ?? item?.valor)),
    0,
  );
  const topExpense = expenses
    .map((item) => ({
      label:
        item?.category ||
        item?.category_name ||
        item?.description ||
        "Centro de custo",
      amount: Math.abs(asNumber(item?.amount ?? item?.value ?? item?.total ?? item?.valor)),
    }))
    .sort((left, right) => right.amount - left.amount)[0];

  const commitments = [...reminders, ...bills]
    .map((item) => ({
      title: resolveItemTitle(item, "Compromisso do Nano"),
      date: resolveReminderDate(item),
      amount: Math.abs(asNumber(item?.amount ?? item?.value ?? item?.total ?? item?.valor)),
      status: String(item?.status || "").toLowerCase(),
    }))
    .filter((item) => item.date && item.status !== "done" && item.status !== "paid")
    .sort((left, right) => left.date - right.date);

  const nextCommitments = commitments.slice(0, 3);
  const today = new Date();
  const agendaToday = commitments.filter((item) => {
    const date = item.date;
    return (
      date &&
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  });

  const savingsOpportunity = Math.max(topExpense?.amount || 0, totalExpenses * 0.16);
  const answerText =
    latestAssistant?.content ||
    (mode === "agenda"
      ? "Organizei sua agenda e destaquei o que merece prioridade agora."
      : mode === "goals"
        ? "Montei um caminho simples para reduzir pressao e ganhar folga no caixa."
        : "Cruzei seus sinais financeiros recentes e resumi o que mais importa agora.");

  const financeModel = {
    headerCopy: [
      "Estou aqui para cuidar da sua vida financeira.",
      "Pode falar comigo.",
    ],
    promptPlaceholder: "como estao minhas despesas?",
    answerText,
    metrics: [
      {
        label: "Maior gasto",
        value: formatCurrency(topExpense?.amount || 0),
        caption: topExpense?.label || "Sem destaque agora",
        tone: "danger",
      },
      {
        label: "Gastos do mes",
        value: formatCurrency(totalExpenses),
        caption:
          totalIncome > 0
            ? `${Math.round((totalExpenses / totalIncome) * 100)}% das entradas recentes`
            : "Sem entradas suficientes para comparar",
        tone: "neutral",
      },
      {
        label: "Economia potencial",
        value: formatCurrency(savingsOpportunity * 0.18),
        caption: "com ajustes sugeridos",
        tone: "success",
      },
    ],
    railCards: [
      {
        id: "summary",
        eyebrow: "Resumo do periodo",
        title: `Voce tem ${commitments.length} compromisso${commitments.length === 1 ? "" : "s"} no radar`,
        items: nextCommitments.map((item) => ({
          title: item.title,
          subtitle: item.date
            ? item.date.toLocaleString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
              })
            : "Sem horario definido",
        })),
        cta: "Ver agenda completa",
        icon: CalendarDays,
      },
      {
        id: "alerts",
        eyebrow: "Alertas inteligentes",
        title: "Prioridades que pedem sua atencao",
        items: [
          {
            title: topExpense?.label
              ? `${topExpense.label} puxou o custo do periodo`
              : "Nenhum centro de custo fora do padrao",
            subtitle: topExpense?.amount
              ? `${formatCurrency(topExpense.amount)} no recorte atual`
              : "Sem alerta critico",
          },
          {
            title: nextCommitments[0]?.title || "Sem vencimento imediato",
            subtitle: nextCommitments[0]?.date
              ? `vence em ${Math.max(0, Math.ceil((nextCommitments[0].date.getTime() - today.getTime()) / 86400000))} dia(s)`
              : "janela tranquila",
          },
        ],
        cta: "Ver todos os alertas",
        icon: BellRing,
      },
      {
        id: "evolution",
        eyebrow: "Evolucao do mes",
        title: "Despesas",
        emphasis: formatCurrency(totalExpenses),
        footer:
          totalIncome > totalExpenses
            ? "caixa ainda com folga"
            : "momento pede mais disciplina",
        sparkline: buildSparkline(Math.max(totalExpenses / 18, 44)),
      },
    ],
    ctaLabel: "Ver analise completa",
    ctaPrompt: "Quero uma analise completa das minhas despesas e dos proximos pagamentos.",
  };

  if (mode === "agenda") {
    return {
      headerCopy: [
        "Estou organizando seus compromissos e janelas de foco.",
        "Pode falar comigo.",
      ],
      promptPlaceholder: "o que tenho hoje?",
      answerText,
      metrics: [
        {
          label: "Hoje",
          value: `${agendaToday.length}`,
          caption: "compromissos no dia",
          tone: "danger",
        },
        {
          label: "Proximo evento",
          value: nextCommitments[0]?.date
            ? nextCommitments[0].date.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "--:--",
          caption: nextCommitments[0]?.title || "sem compromisso imediato",
          tone: "neutral",
        },
        {
          label: "Janela livre",
          value: agendaToday.length > 2 ? "curta" : "boa",
          caption: "para executar algo importante",
          tone: "success",
        },
      ],
      railCards: [
        {
          id: "summary",
          eyebrow: "Resumo do dia",
          title: `Voce tem ${agendaToday.length} compromisso${agendaToday.length === 1 ? "" : "s"} hoje`,
          items: nextCommitments.map((item) => ({
            title: item.title,
            subtitle: item.date
              ? item.date.toLocaleString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Sem horario",
          })),
          cta: "Ver agenda completa",
          icon: CalendarDays,
        },
        {
          id: "focus",
          eyebrow: "Janela de foco",
          title: agendaToday.length > 2
            ? "Seu dia pede execucao objetiva"
            : "Existe espaco para aprofundar uma prioridade",
          items: [
            {
              title: nextCommitments[0]?.title || "Sem urgencia imediata",
              subtitle: "use o Nano para preparar o proximo passo",
            },
            {
              title: "Lembretes monitorados",
              subtitle: `${commitments.length} item(ns) no radar do assistente`,
            },
          ],
          cta: "Organizar meu dia",
          icon: Target,
        },
        {
          id: "pulse",
          eyebrow: "Pulso do dia",
          title: "Compromissos",
          emphasis: `${commitments.length}`,
          footer: "o Nano ajusta o foco conforme o horario se aproxima",
          sparkline: buildSparkline(58, 22),
        },
      ],
      ctaLabel: "Organizar meu dia",
      ctaPrompt: "Monte meu dia em ordem de prioridade e destaque o que pode dar problema.",
    };
  }

  if (mode === "goals") {
    return {
      headerCopy: [
        "Estou conectando metas, custos e oportunidades de folga.",
        "Pode falar comigo.",
      ],
      promptPlaceholder: "como posso economizar?",
      answerText,
      metrics: [
        {
          label: "Reserva sugerida",
          value: formatCurrency(Math.max(totalIncome * 0.12, 300)),
          caption: "ritmo mensal recomendado",
          tone: "success",
        },
        {
          label: "Ponto de vazamento",
          value: formatCurrency(topExpense?.amount || 0),
          caption: topExpense?.label || "sem destaque atual",
          tone: "danger",
        },
        {
          label: "Folga possivel",
          value: formatCurrency(Math.max(savingsOpportunity * 0.22, 180)),
          caption: "com cortes graduais",
          tone: "neutral",
        },
      ],
      railCards: [
        {
          id: "goals",
          eyebrow: "Meta sugerida",
          title: "Construir caixa sem travar a operacao",
          items: [
            {
              title: "Separar uma faixa automatica",
              subtitle: formatCurrency(Math.max(totalIncome * 0.08, 180)),
            },
            {
              title: "Atacar o maior custo",
              subtitle: topExpense?.label || "revisar categoria dominante",
            },
          ],
          cta: "Ver plano de economia",
          icon: Target,
        },
        {
          id: "alerts",
          eyebrow: "Oportunidades de ajuste",
          title: "Mudancas pequenas, impacto continuo",
          items: [
            {
              title: "Cortar excesso recorrente",
              subtitle: formatCurrency(Math.max(savingsOpportunity * 0.12, 90)),
            },
            {
              title: "Rever compromissos proximos",
              subtitle: `${commitments.length} item(ns) influenciam o caixa`,
            },
          ],
          cta: "Ativar rotina",
          icon: BellRing,
        },
        {
          id: "evolution",
          eyebrow: "Ritmo de melhoria",
          title: "Espaco de folga",
          emphasis: formatCurrency(Math.max(totalIncome - totalExpenses, 0)),
          footer: "o Nano pode transformar isso em rotina automatica",
          sparkline: buildSparkline(Math.max((totalIncome - totalExpenses) / 10, 48), 28),
        },
      ],
      ctaLabel: "Criar meta automatica",
      ctaPrompt: "Quero um plano para economizar com base nos meus gastos atuais.",
    };
  }

  if (mode === "default") {
    return {
      ...financeModel,
      headerCopy: [
        "Estou acompanhando seus sinais e prioridades em tempo real.",
        "Pode falar comigo.",
      ],
      promptPlaceholder: "Fale com o Nano...",
      railCards: [
        {
          id: "summary",
          eyebrow: "Resumo do dia",
          title: `Voce tem ${Math.max(commitments.length, 1)} frente${commitments.length === 1 ? "" : "s"} aberta${commitments.length === 1 ? "" : "s"}`,
          items: nextCommitments.map((item) => ({
            title: item.title,
            subtitle: item.date
              ? item.date.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                })
              : "Sem data",
          })),
          cta: "Abrir agenda",
          icon: CalendarDays,
        },
        {
          id: "alerts",
          eyebrow: "Alertas inteligentes",
          title: "O Nano ja separou o que merece atencao",
          items: [
            {
              title: topExpense?.label || "Despesa dominante mapeada",
              subtitle: topExpense?.amount
                ? `${formatCurrency(topExpense.amount)} no periodo recente`
                : "sem distorcao forte",
            },
            {
              title: commitments[0]?.title || "Sem urgencia financeira agora",
              subtitle: commitments[0]?.date
                ? `vence em ${Math.max(0, Math.ceil((commitments[0].date.getTime() - today.getTime()) / 86400000))} dia(s)`
                : "ambiente sob controle",
            },
          ],
          cta: "Ver detalhes",
          icon: BellRing,
        },
        {
          id: "evolution",
          eyebrow: "Pulso do mes",
          title: "Caixa observado",
          emphasis: formatCurrency(totalIncome - totalExpenses),
          footer: "a interface reage ao que a conversa pede",
          sparkline: buildSparkline(Math.max((totalIncome + totalExpenses) / 20, 52), 24),
        },
      ],
      ctaLabel: "Aprofundar agora",
      ctaPrompt: "Quero um resumo geral do meu momento financeiro.",
    };
  }

  return financeModel;
};

const getMetricToneClasses = (tone) => {
  if (tone === "danger") {
    return "text-red-200 shadow-[0_24px_50px_rgba(130,10,18,0.18)]";
  }
  if (tone === "success") {
    return "text-emerald-100 shadow-[0_24px_50px_rgba(9,66,47,0.16)]";
  }
  return "text-zinc-100 shadow-[0_24px_50px_rgba(0,0,0,0.22)]";
};

const ContextMetric = ({ item }) => (
  <div
    className={`rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] px-4 py-4 backdrop-blur-xl ${getMetricToneClasses(item.tone)}`}
  >
    <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
      {item.label}
    </p>
    <p className="mt-3 text-[28px] font-semibold tracking-tight">{item.value}</p>
    <p className="mt-2 text-sm leading-6 text-zinc-400">{item.caption}</p>
  </div>
);

const ContextRailCard = ({ card }) => {
  const Icon = card.icon || Sparkles;
  const sparkline = card.sparkline || [];
  const maxPoint = Math.max(...sparkline, 1);
  const points = sparkline
    .map((point, index) => {
      const x = (index / Math.max(sparkline.length - 1, 1)) * 220;
      const y = 72 - (point / maxPoint) * 56;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[30px] border border-white/6 bg-[linear-gradient(180deg,rgba(13,10,12,0.88),rgba(10,9,10,0.82))] px-6 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl"
    >
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-red-300" />
        <p className="text-[11px] uppercase tracking-[0.26em] text-red-300/88">
          {card.eyebrow}
        </p>
      </div>

      <p className="text-xl font-medium leading-8 text-zinc-100">{card.title}</p>

      {card.emphasis ? (
        <p className="mt-3 text-[42px] font-semibold tracking-tight text-white">
          {card.emphasis}
        </p>
      ) : null}

      {card.items?.length ? (
        <div className="mt-5 space-y-4">
          {card.items.map((item, index) => (
            <div
              key={`${card.id}-item-${index}`}
              className="flex items-start gap-3 text-sm text-zinc-300"
            >
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_12px_rgba(255,42,42,0.85)]" />
              <div>
                <p className="font-medium text-zinc-100">{item.title}</p>
                <p className="mt-1 text-zinc-500">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {sparkline.length ? (
        <div className="mt-5 overflow-hidden rounded-[24px] border border-red-500/8 bg-[radial-gradient(circle_at_bottom,rgba(255,42,42,0.18),transparent_58%),rgba(255,255,255,0.02)] p-4">
          <svg viewBox="0 0 220 78" className="h-[82px] w-full">
            <defs>
              <linearGradient id={`sparkline-${card.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7f1d1d" />
                <stop offset="55%" stopColor="#ff2a2a" />
                <stop offset="100%" stopColor="#ff7676" />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke={`url(#sparkline-${card.id})`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
            {sparkline.map((point, index) => {
              const x = (index / Math.max(sparkline.length - 1, 1)) * 220;
              const y = 72 - (point / maxPoint) * 56;
              return (
                <circle
                  key={`${card.id}-dot-${index}`}
                  cx={x}
                  cy={y}
                  r="2.6"
                  fill="#ff5c5c"
                />
              );
            })}
          </svg>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-zinc-500">{card.footer}</p>
        {card.cta ? (
          <span className="inline-flex items-center gap-2 text-sm text-zinc-200">
            {card.cta}
            <ArrowRight className="h-4 w-4 text-zinc-400" />
          </span>
        ) : null}
      </div>
    </motion.div>
  );
};

const NanoChatPanel = ({
  chatHistory,
  message,
  setMessage,
  userName,
  transactions,
  reminders,
  bills,
  onSend,
  onQuickPrompt,
  isListening,
  isProcessing,
  isSpeaking,
  partialTranscript,
  finalTranscript,
  currentLevel,
  voiceState,
  voiceStatus,
  isWakeArmed,
  voiceSupported,
  error,
  chatError,
  onStartVoice,
  onStopVoice,
  onCancelVoiceCommand,
  onInterrupt,
}) => {
  const scrollRef = useRef(null);
  const lastAssistantMessageIdRef = useRef(null);
  const responsePulseTimerRef = useRef(null);
  const processingStartedAtRef = useRef(0);
  const [responsePulseActive, setResponsePulseActive] = useState(false);
  const [processingElapsed, setProcessingElapsed] = useState(0);

  const latestAssistant = useMemo(
    () => getLatestEntry(chatHistory, "assistant"),
    [chatHistory],
  );
  const latestUser = useMemo(() => getLatestEntry(chatHistory, "user"), [chatHistory]);
  const olderMessages = useMemo(
    () =>
      chatHistory
        .filter(
          (item) =>
            item?.id !== latestAssistant?.id && item?.id !== latestUser?.id,
        )
        .slice(-3),
    [chatHistory, latestAssistant?.id, latestUser?.id],
  );

  const liveStatus = useMemo(
    () =>
      resolveLiveStatus({
        isListening,
        isProcessing,
        isSpeaking,
        partialTranscript,
        finalTranscript,
      }),
    [isListening, isProcessing, isSpeaking, partialTranscript, finalTranscript],
  );

  const nanoState = useMemo(
    () =>
      buildNanoState({
        isListening,
        isProcessing,
        isSpeaking,
        voiceState,
        responsePulseActive,
        processingElapsed,
      }),
    [
      isListening,
      isProcessing,
      isSpeaking,
      voiceState,
      responsePulseActive,
      processingElapsed,
    ],
  );

  const contextMode = useMemo(
    () =>
      inferContextMode(
        latestUser?.content ||
          message ||
          latestAssistant?.content ||
          voiceStatus ||
          "",
      ),
    [latestAssistant?.content, latestUser?.content, message, voiceStatus],
  );

  const contextModel = useMemo(
    () =>
      createContextModel({
        mode: contextMode,
        transactions,
        reminders,
        bills,
        latestAssistant,
      }),
    [bills, contextMode, latestAssistant, reminders, transactions],
  );

  const liveTranscript = (partialTranscript || finalTranscript || "").trim();
  const voiceErrorDetail = error?.message || error?.error || "";
  const greeting = getGreeting();
  const latestAssistantText = latestAssistant?.content || contextModel.answerText;
  const latestPromptText =
    latestUser?.content || message || contextModel.promptPlaceholder;
  const shellBusy = nanoState === "thinking" || nanoState === "executing";

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatHistory, liveStatus]);

  useEffect(() => {
    const lastAssistantMessage = latestAssistant;
    if (!lastAssistantMessage?.id) return;
    if (lastAssistantMessage.id === lastAssistantMessageIdRef.current) return;

    lastAssistantMessageIdRef.current = lastAssistantMessage.id;
    setResponsePulseActive(true);

    if (responsePulseTimerRef.current) {
      clearTimeout(responsePulseTimerRef.current);
    }

    responsePulseTimerRef.current = setTimeout(() => {
      setResponsePulseActive(false);
      responsePulseTimerRef.current = null;
    }, 2200);
  }, [latestAssistant]);

  useEffect(() => {
    if (!isProcessing) {
      processingStartedAtRef.current = 0;
      setProcessingElapsed(0);
      return undefined;
    }

    if (!processingStartedAtRef.current) {
      processingStartedAtRef.current = Date.now();
    }

    const interval = window.setInterval(() => {
      setProcessingElapsed(Date.now() - processingStartedAtRef.current);
    }, 120);

    return () => window.clearInterval(interval);
  }, [isProcessing]);

  useEffect(() => {
    return () => {
      if (responsePulseTimerRef.current) {
        clearTimeout(responsePulseTimerRef.current);
      }
    };
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[34px] border border-white/6 bg-[linear-gradient(180deg,rgba(6,6,7,0.68),rgba(5,5,6,0.8))] shadow-[0_40px_140px_rgba(0,0,0,0.42)]">
      <style>{`
        @keyframes nano-shell-drift {
          0% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(-1.2%, 1.4%, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        @keyframes nano-card-enter {
          0% { opacity: 0; transform: translateY(18px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .nano-assistant-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.12) transparent;
        }
        .nano-assistant-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .nano-assistant-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12);
          border-radius: 999px;
        }
        .nano-card-enter {
          animation: nano-card-enter 420ms cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 opacity-55">
        <div className="absolute left-[8%] top-[24%] h-[220px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(255,42,42,0.24),transparent_62%)] blur-3xl" />
        <div className="absolute bottom-[14%] left-[12%] h-[200px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(127,29,29,0.22),transparent_68%)] blur-3xl" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 16% 24%, rgba(255,255,255,0.14) 0 1px, transparent 2px), radial-gradient(circle at 42% 14%, rgba(255,255,255,0.08) 0 1px, transparent 2px), radial-gradient(circle at 76% 22%, rgba(255,255,255,0.1) 0 1px, transparent 2px), radial-gradient(circle at 70% 74%, rgba(255,255,255,0.08) 0 1px, transparent 2px)",
            animation: "nano-shell-drift 18s ease-in-out infinite",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-6 pt-6 md:px-8 md:pb-7 md:pt-8">
        <div className="flex flex-col gap-4 border-b border-white/6 pb-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.36em] text-red-300/84">
              Assistente ativo
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-[58px]">
              {greeting}, {userName || "Heitor"}.
            </h1>
            <div className="mt-5 space-y-2 text-lg leading-8 text-zinc-300">
              {contextModel.headerCopy.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className="mt-6 h-px w-20 bg-[linear-gradient(90deg,#ff2a2a,transparent)]" />
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            {voiceSupported ? (
              <button
                type="button"
                onClick={isWakeArmed ? onStopVoice : onStartVoice}
                className={`inline-flex h-12 items-center gap-3 rounded-full border px-5 text-sm shadow-[0_20px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl transition ${
                  isWakeArmed
                    ? "border-red-400/24 bg-red-500/14 text-red-50"
                    : "border-white/10 bg-black/24 text-zinc-200 hover:border-red-400/18 hover:text-white"
                }`}
              >
                {isWakeArmed ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                <span>{isWakeArmed ? "Escuta ativa" : "Ativar voz"}</span>
              </button>
            ) : null}

            <div className="inline-flex h-12 items-center gap-3 rounded-full border border-white/10 bg-black/24 px-5 text-sm text-zinc-200 shadow-[0_20px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_18px_rgba(255,42,42,0.9)]" />
              Online
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="nano-assistant-scroll relative min-h-0 flex-1 overflow-y-auto pt-6"
        >
          <div className="grid min-h-full gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid items-center gap-6 xl:grid-cols-[minmax(280px,0.88fr)_minmax(420px,1.05fr)] xl:gap-10">
              <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-[34px] border border-white/6 bg-[linear-gradient(180deg,rgba(17,10,12,0.44),rgba(9,8,10,0.08))] px-4 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="pointer-events-none absolute inset-x-[-6%] top-1/2 h-[220px] -translate-y-1/2 bg-[radial-gradient(circle,rgba(255,42,42,0.2),transparent_58%)] blur-3xl" />
                <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-[140px] -translate-y-1/2 xl:block">
                  <div className="absolute inset-x-0 top-[26%] h-px bg-[linear-gradient(90deg,transparent,rgba(255,42,42,0.48),transparent)] opacity-70" />
                  <div className="absolute inset-x-0 top-[50%] h-px bg-[linear-gradient(90deg,transparent,rgba(255,42,42,0.22),transparent)]" />
                  <div className="absolute inset-x-[8%] top-[74%] h-px bg-[linear-gradient(90deg,rgba(255,42,42,0.1),rgba(255,42,42,0.42),transparent)] opacity-70" />
                </div>

                <div className="relative flex flex-col items-center gap-5">
                  <NanoCoreAnimation
                    nanoState={nanoState}
                    amplitude={currentLevel}
                  />

                  <AnimatePresence mode="wait">
                    {shellBusy || isSpeaking ? (
                      <motion.div
                        key={nanoState}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.28 }}
                        className="rounded-full border border-red-400/16 bg-black/32 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-zinc-100 shadow-[0_16px_34px_rgba(0,0,0,0.28)]"
                      >
                        {nanoState === "thinking"
                          ? "Nano analisando contexto"
                          : nanoState === "executing"
                            ? "Nano reagindo ao pedido"
                            : "Nano respondendo"}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              <div className="relative flex flex-col gap-5">
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="ml-auto w-full max-w-[360px] rounded-[28px] border border-red-500/14 bg-[linear-gradient(180deg,rgba(97,10,16,0.42),rgba(60,8,12,0.2))] px-5 py-4 text-red-50 shadow-[0_20px_54px_rgba(85,10,16,0.2)] backdrop-blur-xl"
                >
                  <p className="whitespace-pre-wrap text-[22px] leading-8">
                    {latestPromptText}
                  </p>
                  <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-red-200/72">
                    {latestUser?.created_at ? formatTime(latestUser.created_at) : "--:--"}
                  </p>
                </motion.div>

                <motion.div
                  key={`${contextMode}-${latestAssistant?.id || "seed"}`}
                  initial={{ opacity: 0, y: 18, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  className="nano-card-enter rounded-[34px] border border-white/6 bg-[linear-gradient(180deg,rgba(18,14,16,0.86),rgba(10,9,10,0.82))] px-6 py-6 shadow-[0_28px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 shadow-[0_0_24px_rgba(255,42,42,0.18)] sm:flex">
                      <NanoMark className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap text-[31px] leading-[1.45] text-zinc-100">
                        {latestAssistantText}
                      </p>
                      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                        {latestAssistant?.created_at
                          ? formatTime(latestAssistant.created_at)
                          : liveStatus || "Nano em escuta continua"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {contextModel.metrics.map((item) => (
                      <ContextMetric key={item.label} item={item} />
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => onQuickPrompt(contextModel.ctaPrompt)}
                      className="inline-flex items-center gap-3 rounded-full border border-white/8 bg-white/[0.03] px-5 py-3 text-sm text-zinc-100 transition hover:border-red-400/16 hover:bg-red-500/[0.06]"
                    >
                      {contextModel.ctaLabel}
                      <ArrowRight className="h-4 w-4 text-zinc-400" />
                    </button>

                    {liveStatus ? (
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-4 py-2 text-sm text-zinc-300">
                        <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_14px_rgba(255,42,42,0.8)]" />
                        {liveStatus}
                      </div>
                    ) : null}
                  </div>
                </motion.div>

                {olderMessages.length ? (
                  <div className="rounded-[28px] border border-white/6 bg-black/14 px-5 py-4 text-sm text-zinc-400 backdrop-blur-xl">
                    <p className="text-[11px] uppercase tracking-[0.26em] text-zinc-600">
                      Historico recente
                    </p>
                    <div className="mt-4 space-y-3">
                      {olderMessages.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-4 border-b border-white/4 pb-3 last:border-b-0 last:pb-0"
                        >
                          <p className="line-clamp-2 flex-1 leading-6">
                            {item.content}
                          </p>
                          <span className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-zinc-600">
                            {formatTime(item.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {chatError ? (
                  <div className="flex items-start gap-3 rounded-[24px] border border-red-500/14 bg-red-500/[0.08] px-5 py-4 text-sm text-red-50 shadow-[0_18px_48px_rgba(127,29,29,0.14)] backdrop-blur-xl">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      O Nano encontrou uma instabilidade temporaria. O fluxo de
                      texto continua disponivel.
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="hidden space-y-5 xl:block">
              {contextModel.railCards.map((card) => (
                <ContextRailCard key={card.id} card={card} />
              ))}
            </aside>
          </div>
        </div>

        <div className="mt-6 border-t border-white/6 pt-5">
          {chatHistory.length === 0 && !message && !liveStatus ? (
            <div className="mb-4 flex flex-wrap gap-3">
              {nanoQuickPrompts.slice(0, 4).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onQuickPrompt(nanoQuickPromptMap[prompt] || prompt)}
                  className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-200 transition hover:border-red-400/16 hover:bg-red-500/[0.06] hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}

          <div className="rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,12,13,0.78),rgba(8,8,9,0.72))] px-4 py-4 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
            {isWakeArmed && liveTranscript ? (
              <div className="mb-3 rounded-[20px] bg-white/[0.035] px-4 py-3 text-sm text-zinc-300">
                <span className="mr-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                  Transcricao
                </span>
                {liveTranscript}
              </div>
            ) : null}

            <div className="flex items-end gap-3">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Fale com o Nano..."
                className="min-h-[74px] resize-none rounded-[24px] border border-transparent bg-transparent px-4 py-4 text-base text-white placeholder:text-zinc-500 focus-visible:border-red-500/20 focus-visible:ring-0"
              />

              <div className="flex items-center gap-2 pb-1">
                {voiceSupported ? (
                  <button
                    type="button"
                    onClick={isWakeArmed ? onStopVoice : onStartVoice}
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                      isWakeArmed
                        ? "bg-red-500/16 text-red-50 shadow-[0_0_28px_rgba(255,42,42,0.24)]"
                        : "bg-white/[0.04] text-zinc-300 hover:bg-red-500/[0.08] hover:text-white"
                    }`}
                    title={isWakeArmed ? "Desativar voz" : "Ativar voz"}
                  >
                    {isWakeArmed ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                ) : null}

                {isSpeaking ? (
                  <button
                    type="button"
                    onClick={onInterrupt}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] text-zinc-200 transition hover:bg-white/[0.08]"
                    title="Interromper resposta"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                ) : null}

                {(isWakeArmed || isProcessing) ? (
                  <button
                    type="button"
                    onClick={onCancelVoiceCommand}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] text-zinc-200 transition hover:bg-white/[0.08]"
                    title="Cancelar comando de voz"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}

                <Button
                  type="button"
                  onClick={onSend}
                  disabled={isProcessing}
                  className="group h-12 rounded-full bg-[linear-gradient(135deg,#ff2a2a,#b90e18)] px-5 text-white shadow-[0_0_36px_rgba(255,42,42,0.28)] transition hover:scale-[1.01] hover:shadow-[0_0_44px_rgba(255,42,42,0.34)]"
                >
                  <ArrowUp className="h-4 w-4 transition group-hover:-translate-y-0.5" />
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
              <span>
                {isSpeaking
                  ? "Respondendo"
                  : isProcessing
                    ? "Processando"
                    : isListening
                      ? "Escuta ativa"
                      : "Pronto"}
              </span>
              <span>{voiceErrorDetail || "O Nano aprende. O Nano cuida. O Nano faz por voce."}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NanoChatPanel;
