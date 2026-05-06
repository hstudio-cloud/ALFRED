import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  CreditCard,
  Landmark,
  QrCode,
  ShieldCheck,
} from "lucide-react";

import { useWorkspace } from "../context/WorkspaceContext";
import { useToast } from "../hooks/use-toast";
import billingService from "../services/billingService";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  dashboardClass,
  dashboardTheme,
  resolveDashboardThemeMode,
} from "../lib/dashboardTheme";

const periodOptions = [
  {
    key: "monthly",
    label: "Mensal",
    priceLabel: "R$ 49,90",
    cadence: "/mes",
    description: "Entrada mais leve para comecar a operar com o Nano.",
    planCode: "starter",
    available: true,
  },
  {
    key: "quarterly",
    label: "Trimestral",
    priceLabel: "Em configuracao",
    cadence: "",
    description: "Fluxo pronto para pacote trimestral assim que o valor for definido.",
    planCode: "starter_quarterly",
    available: false,
  },
  {
    key: "yearly",
    label: "Anual",
    priceLabel: "Em configuracao",
    cadence: "",
    description: "Fluxo pronto para pacote anual assim que o valor for definido.",
    planCode: "starter_yearly",
    available: false,
  },
];

const methods = [
  {
    key: "credit_card",
    title: "Cartao",
    description: "Checkout direto no Stripe para assinatura recorrente no cartao.",
    icon: CreditCard,
    provider: "Stripe",
  },
  {
    key: "pix",
    title: "PIX",
    description: "Geracao instantanea de cobranca no Asaas com QR Code.",
    icon: QrCode,
    provider: "Asaas",
  },
  {
    key: "boleto",
    title: "Boleto",
    description: "Cobranca por boleto no Asaas com liberacao confirmada por webhook.",
    icon: Landmark,
    provider: "Asaas",
  },
];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const accessStatusLabels = {
  active: "Acesso ativo",
  trialing: "Em periodo de teste",
  checkout_pending: "Checkout iniciado",
  checkout_completed: "Pagamento aguardando confirmacao",
  past_due: "Pagamento pendente",
  canceled: "Assinatura cancelada",
  unpaid: "Pagamento nao compensado",
  inactive: "Sem assinatura ativa",
};

const providerLabels = {
  stripe: "Stripe",
  asaas: "Asaas",
};

const paymentMethodLabels = {
  credit_card: "Cartao",
  pix: "PIX",
  boleto: "Boleto",
};
const THEME_STORAGE_KEY = "nano_theme_mode";

const planLabels = {
  starter: "Nano Mensal",
  starter_quarterly: "Nano Trimestral",
  starter_yearly: "Nano Anual",
};

const Billing = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [themeMode] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return resolveDashboardThemeMode(
      window.localStorage.getItem(THEME_STORAGE_KEY) || "dark",
    );
  });
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [subscriptionState, setSubscriptionState] = useState(null);
  const [checkoutResult, setCheckoutResult] = useState(null);

  const selectedPeriodConfig = useMemo(
    () =>
      periodOptions.find((period) => period.key === selectedPeriod) ||
      periodOptions[0],
    [selectedPeriod],
  );

  const selectedMethod = useMemo(
    () => methods.find((item) => item.key === paymentMethod) || methods[0],
    [paymentMethod],
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.nanoTheme = themeMode;
      document.body.dataset.nanoTheme = themeMode;
    }
  }, [themeMode]);

  useEffect(() => {
    const loadSubscription = async () => {
      if (!currentWorkspace?.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await billingService.getSubscription(currentWorkspace.id);
        setSubscriptionState(response);
      } catch (error) {
        toast({
          title: "Erro ao carregar assinatura",
          description:
            error.response?.data?.detail ||
            "Nao consegui carregar o status da assinatura.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, [currentWorkspace?.id, toast]);

  const handleCheckout = async () => {
    if (!currentWorkspace?.id) return;

    if (!selectedPeriodConfig.available) {
      toast({
        title: "Plano em configuracao",
        description:
          "Esse periodo ja esta pronto no visual, mas o valor ainda precisa ser configurado.",
        variant: "destructive",
      });
      return;
    }

    const providerHealth = subscriptionState?.provider_health || {};
    const stripeHealth = providerHealth?.stripe || { ready: false, missing_env: [] };
    const asaasHealth = providerHealth?.asaas || { ready: false, missing_env: [] };
    const selectedMethodReady =
      paymentMethod === "credit_card" ? stripeHealth.ready : asaasHealth.ready;
    const selectedMethodMissingEnv =
      paymentMethod === "credit_card"
        ? stripeHealth.missing_env || []
        : asaasHealth.missing_env || [];

    if (!selectedMethodReady) {
      toast({
        title: "Pagamento indisponivel",
        description: `Faltam configuracoes no backend para ${paymentMethod === "credit_card" ? "Stripe" : "Asaas"}: ${selectedMethodMissingEnv.join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await billingService.createCheckout({
        workspace_id: currentWorkspace.id,
        plan_code: selectedPeriodConfig.planCode,
        payment_method: paymentMethod,
      });

      if (response.provider === "stripe" && response.checkout_url) {
        window.location.href = response.checkout_url;
        return;
      }

      setCheckoutResult(response);
      setSubscriptionState((prev) => ({
        ...(prev || {}),
        subscription: response.subscription || prev?.subscription || null,
        latest_payment: response.payment || prev?.latest_payment || null,
        access: prev?.access || { has_access: false, status: "pending" },
      }));
      toast({
        title: paymentMethod === "pix" ? "PIX gerado" : "Boleto gerado",
        description:
          paymentMethod === "pix"
            ? "O QR Code foi carregado abaixo."
            : "O link da cobranca foi carregado abaixo.",
      });
    } catch (error) {
      toast({
        title: "Erro ao iniciar pagamento",
        description:
          error.response?.data?.detail ||
          "Nao foi possivel iniciar a cobranca agora.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPortal = async () => {
    if (!currentWorkspace?.id) return;
    try {
      const response = await billingService.createStripePortal({
        workspace_id: currentWorkspace.id,
      });
      if (response.portal_url) {
        window.location.href = response.portal_url;
      }
    } catch (error) {
      toast({
        title: "Portal indisponivel",
        description:
          error.response?.data?.detail ||
          "Nao consegui abrir o portal da assinatura.",
        variant: "destructive",
      });
    }
  };

  const copyPixPayload = async () => {
    const payload = checkoutResult?.payment?.pix_payload;
    if (!payload) return;

    await navigator.clipboard.writeText(payload);
    toast({
      title: "Codigo PIX copiado",
      description: "O codigo foi copiado para sua area de transferencia.",
    });
  };

  const access = subscriptionState?.access;
  const subscription = subscriptionState?.subscription;
  const latestPayment =
    subscriptionState?.latest_payment || checkoutResult?.payment;
  const providerHealth = subscriptionState?.provider_health || {};
  const stripeHealth = providerHealth?.stripe || { ready: false, missing_env: [] };
  const asaasHealth = providerHealth?.asaas || { ready: false, missing_env: [] };
  const selectedMethodReady =
    selectedMethod.key === "credit_card" ? stripeHealth.ready : asaasHealth.ready;
  const selectedMethodMissingEnv =
    selectedMethod.key === "credit_card"
      ? stripeHealth.missing_env || []
      : asaasHealth.missing_env || [];
  const accessLabel =
    accessStatusLabels[access?.status] || "Pagamento aguardando confirmacao";
  const selectedFlowLabel =
    selectedMethod.key === "credit_card"
      ? "Pagamento recorrente por cartao"
      : selectedMethod.key === "pix"
        ? "Pagamento instantaneo por PIX"
        : "Pagamento por boleto";

  return (
    <div
      className={`theme-dashboard-${themeMode} ${dashboardTheme.layout} min-h-screen px-6 py-12 ${dashboardTheme.textPrimary}`}
    >
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-red-300/70">
              Planos
            </p>
            <h1 className="text-4xl font-semibold">Escolha sua assinatura</h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-300">
              Primeiro voce escolhe o periodo do plano. Em seguida o Nano abre a
              forma de pagamento correta: Stripe para cartao e Asaas para PIX ou
              boleto.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className={dashboardClass.buttonGhost}
            onClick={() => navigate("/dashboard")}
          >
            Voltar ao painel
          </Button>
        </div>

        <Card className={`${dashboardTheme.panel} p-6`}>
          <div className="flex flex-wrap items-center gap-3">
            {periodOptions.map((period) => {
              const isActive = selectedPeriod === period.key;
              return (
                <button
                  key={period.key}
                  type="button"
                  onClick={() => setSelectedPeriod(period.key)}
                  className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-white text-slate-950 shadow-[0_10px_30px_rgba(255,255,255,0.12)]"
                      : "border border-slate-700/40 bg-slate-900/40 text-slate-300 hover:border-slate-500/60"
                  }`}
                >
                  {period.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className={`${dashboardTheme.panelSecondary} ${dashboardTheme.glow} rounded-[32px] p-8`}>
              <div className="text-center">
                <p className="text-4xl font-semibold">Nano IA</p>
                <div className="mt-5 flex items-end justify-center gap-2">
                  <span className="text-5xl font-bold text-white">
                    {selectedPeriodConfig.priceLabel}
                  </span>
                  {selectedPeriodConfig.cadence ? (
                    <span className="pb-2 text-lg text-slate-400">
                      {selectedPeriodConfig.cadence}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  {selectedPeriodConfig.description}
                </p>
              </div>

              <div className="mt-8 border-t border-slate-700/30 pt-8">
                <p className="text-center text-2xl font-semibold">Tudo incluso</p>
                <div className="mt-6 space-y-4 text-base text-slate-200">
                  {[
                    "Painel financeiro com IA",
                    "Controle de receitas e despesas",
                    "Categorias personalizadas",
                    "Separacao pessoal e empresa",
                    "Lembretes de vencimento",
                    "Historico de movimentacoes",
                    "Insights e analises",
                    "Chat operacional",
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-red-400" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className={`${dashboardTheme.panelSecondary} rounded-[28px] p-6`}>
                <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-red-200/70">
                  <CalendarClock className="h-4 w-4" />
                  <span>Passo 1</span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  Periodo escolhido: {selectedPeriodConfig.label}
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  A escolha do periodo define o codigo do plano enviado ao
                  backend. Mensal ja esta pronto. Trimestral e anual ficam com o
                  visual preparado para voce configurar os valores depois.
                </p>
                {!selectedPeriodConfig.available ? (
                  <Badge className="mt-4 bg-amber-500/15 text-amber-300">
                    Valor ainda nao configurado
                  </Badge>
                ) : null}
              </div>

              <div className={`${dashboardTheme.panelSecondary} rounded-[28px] p-6`}>
                <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-red-200/70">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Passo 2</span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  Escolha a forma de pagamento
                </h2>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {methods.map((method) => {
                    const Icon = method.icon;
                    const isActive = paymentMethod === method.key;
                    const methodReady =
                      method.key === "credit_card" ? stripeHealth.ready : asaasHealth.ready;
                    return (
                      <button
                        key={method.key}
                        type="button"
                        onClick={() => setPaymentMethod(method.key)}
                        disabled={!methodReady}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          isActive
                            ? "border-red-500/50 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.12)]"
                            : "border-slate-700/30 bg-slate-950/30 hover:border-slate-600/50"
                        } ${!methodReady ? "cursor-not-allowed opacity-55" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-red-300" />
                          <span className="font-semibold text-white">
                            {method.title}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-slate-400">
                          {method.description}
                        </p>
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                          {method.provider}
                        </p>
                        {!methodReady ? (
                          <p className="mt-2 text-xs text-amber-300">
                            Provider ainda nao configurado
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`${dashboardTheme.panelSecondary} rounded-[28px] p-6`}>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Fluxo escolhido
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-white">
                  {selectedFlowLabel}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  {selectedMethod.description}
                </p>
                {!selectedMethodReady ? (
                  <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4 text-sm text-amber-200">
                    Esse fluxo ainda nao esta pronto em producao. Faltam{" "}
                    {selectedMethodMissingEnv.join(", ")}.
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    className="bg-white text-slate-950 hover:bg-slate-100"
                    onClick={handleCheckout}
                    disabled={submitting || !currentWorkspace?.id || !selectedMethodReady}
                  >
                    {submitting ? "Processando..." : "Continuar para o pagamento"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={dashboardClass.buttonGhost}
                    onClick={handleOpenPortal}
                    disabled={!subscription || subscription.provider !== "stripe"}
                  >
                    Gerenciar assinatura
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <Card className={`${dashboardTheme.panel} p-6`}>
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.22em] text-red-200/70">
                Status da assinatura
              </p>
              <h3 className="text-3xl font-semibold text-white">
                {accessLabel}
              </h3>
              <p className="text-sm leading-7 text-slate-400">
                O acesso e liberado somente depois da confirmacao real do
                pagamento no backend. O retorno visual do checkout sozinho nao
                ativa o plano.
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <StatusItem
                  label="Plano atual"
                  value={
                    planLabels[subscription?.plan_code] ||
                    planLabels[selectedPeriodConfig.planCode] ||
                    selectedPeriodConfig.label
                  }
                />
                <StatusItem
                  label="Processador"
                  value={providerLabels[subscription?.provider] || "-"}
                />
                <StatusItem
                  label="Forma"
                  value={
                    paymentMethodLabels[subscription?.payment_method] || "-"
                  }
                />
              </div>
            </div>
          </Card>

          <Card className={`${dashboardTheme.panel} p-6`}>
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Pagamento em aberto
              </p>
              {loading ? (
                <p className="text-sm text-slate-400">
                  Carregando status da cobranca...
                </p>
              ) : latestPayment ? (
                <div className="space-y-4 rounded-2xl border border-slate-700/30 bg-slate-900/40 p-5">
                  <StatusItem
                    label="Valor"
                    value={currencyFormatter.format(
                      Number(latestPayment.amount || 0),
                    )}
                  />
                  <StatusItem
                    label="Status"
                    value={
                      accessStatusLabels[latestPayment.status] ||
                      latestPayment.status ||
                      "-"
                    }
                  />
                  <StatusItem
                    label="Vencimento"
                    value={
                      latestPayment.due_date
                        ? new Date(latestPayment.due_date).toLocaleDateString(
                            "pt-BR",
                          )
                        : "-"
                    }
                  />

                  {latestPayment.pix_qr_code ? (
                    <div className="space-y-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                      <p className="text-sm font-medium text-red-100">
                        QR Code PIX
                      </p>
                      <div className="break-all rounded-xl bg-slate-950/80 p-3 text-xs text-slate-300">
                        {latestPayment.pix_qr_code}
                      </div>
                      {latestPayment.pix_payload ? (
                        <Button
                          type="button"
                          variant="outline"
                          className={dashboardClass.buttonGhost}
                          onClick={copyPixPayload}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar codigo PIX
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {latestPayment.invoice_url ? (
                    <Button
                      type="button"
                      variant="outline"
                      className={`w-full ${dashboardClass.buttonGhost}`}
                      onClick={() =>
                        window.open(
                          latestPayment.invoice_url,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      Abrir cobranca
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm leading-7 text-slate-400">
                  Nenhuma cobranca gerada ainda. Escolha o periodo, selecione a
                  forma de pagamento e avance para o checkout.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const StatusItem = ({ label, value }) => (
  <div className={`${dashboardTheme.panelSecondary} rounded-2xl p-4`}>
    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
    <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
  </div>
);

export default Billing;
