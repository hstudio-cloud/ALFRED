import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, CreditCard, Landmark, QrCode, Wallet } from "lucide-react";

import { useWorkspace } from "../context/WorkspaceContext";
import { useToast } from "../hooks/use-toast";
import billingService from "../services/billingService";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const planOptions = [
  { code: "starter", label: "Starter", subtitle: "Assinatura principal do Nano" },
  { code: "pro", label: "Pro", subtitle: "Estrutura preparada para upgrade" },
];

const methods = [
  {
    key: "credit_card",
    title: "Cartao",
    description: "Checkout recorrente no Stripe com confirmacao via webhook.",
    icon: CreditCard,
  },
  {
    key: "pix",
    title: "PIX",
    description: "Cobranca no Asaas com QR Code e liberacao por webhook.",
    icon: QrCode,
  },
  {
    key: "boleto",
    title: "Boleto",
    description: "Boleto no Asaas com link de segunda via e reconciliacao por webhook.",
    icon: Landmark,
  },
];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const Billing = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [planCode, setPlanCode] = useState("starter");
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [subscriptionState, setSubscriptionState] = useState(null);
  const [checkoutResult, setCheckoutResult] = useState(null);

  const selectedMethod = useMemo(
    () => methods.find((item) => item.key === paymentMethod) || methods[0],
    [paymentMethod],
  );

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
          title: "Erro ao carregar billing",
          description: error.response?.data?.detail || "Nao consegui carregar o status da assinatura.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, [currentWorkspace?.id, toast]);

  const handleCheckout = async () => {
    if (!currentWorkspace?.id) {
      return;
    }
    setSubmitting(true);
    try {
      const response = await billingService.createCheckout({
        workspace_id: currentWorkspace.id,
        plan_code: planCode,
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
            : "O link do boleto foi carregado abaixo.",
      });
    } catch (error) {
      toast({
        title: "Erro ao iniciar checkout",
        description: error.response?.data?.detail || "Nao foi possivel iniciar a cobranca.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPortal = async () => {
    if (!currentWorkspace?.id) {
      return;
    }
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
        description: error.response?.data?.detail || "Nao consegui abrir o portal do Stripe.",
        variant: "destructive",
      });
    }
  };

  const copyPixPayload = async () => {
    const payload = checkoutResult?.payment?.pix_payload;
    if (!payload) {
      return;
    }
    await navigator.clipboard.writeText(payload);
    toast({
      title: "Codigo PIX copiado",
      description: "O payload do PIX foi copiado para sua area de transferencia.",
    });
  };

  const access = subscriptionState?.access;
  const subscription = subscriptionState?.subscription;
  const latestPayment = subscriptionState?.latest_payment || checkoutResult?.payment;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(127,29,29,0.22),_transparent_26%),linear-gradient(180deg,#090203_0%,#140304_52%,#090203_100%)] px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-red-300/70">Billing</p>
            <h1 className="text-4xl font-semibold">Assinatura do Nano</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Escolha o metodo de pagamento. A liberacao de acesso so acontece quando o backend confirma o pagamento via webhook.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-slate-700/60 bg-slate-950/50 text-slate-100"
            onClick={() => navigate("/dashboard")}
          >
            Voltar ao dashboard
          </Button>
        </div>

        <Card className="border-slate-700/30 bg-slate-950/60 p-6 backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Workspace</p>
              <h2 className="text-2xl font-semibold">{currentWorkspace?.name || "Sem workspace selecionado"}</h2>
              <p className="mt-2 text-sm text-slate-400">
                Status atual: <span className="font-medium text-slate-100">{access?.status || "inactive"}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge className={access?.has_access ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}>
                {access?.has_access ? "Acesso liberado" : "Acesso pendente"}
              </Badge>
              {access?.grace_period ? <Badge className="bg-orange-500/15 text-orange-300">Grace period</Badge> : null}
            </div>
          </div>

          {subscription ? (
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <StatusItem label="Plano" value={subscription.plan_code || "-"} />
              <StatusItem label="Provider" value={subscription.provider || "-"} />
              <StatusItem label="Metodo" value={subscription.payment_method || "-"} />
              <StatusItem
                label="Fim do ciclo"
                value={
                  subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR")
                    : "-"
                }
              />
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-400">Nenhuma assinatura ativa encontrada para este workspace.</p>
          )}
        </Card>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-slate-700/30 bg-slate-950/60 p-6 backdrop-blur-sm">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-slate-400">Plano</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {planOptions.map((plan) => (
                    <button
                      key={plan.code}
                      type="button"
                      onClick={() => setPlanCode(plan.code)}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        planCode === plan.code
                          ? "border-red-500/50 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.12)]"
                          : "border-slate-700/30 bg-slate-900/40 hover:border-slate-600/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold">{plan.label}</span>
                        <Wallet className="h-4 w-4 text-red-300" />
                      </div>
                      <p className="mt-2 text-sm text-slate-400">{plan.subtitle}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-400">Metodo de pagamento</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {methods.map((method) => {
                    const Icon = method.icon;
                    const isActive = paymentMethod === method.key;
                    return (
                      <button
                        key={method.key}
                        type="button"
                        onClick={() => setPaymentMethod(method.key)}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          isActive
                            ? "border-red-500/50 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.12)]"
                            : "border-slate-700/30 bg-slate-900/40 hover:border-slate-600/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-red-300" />
                          <span className="font-semibold">{method.title}</span>
                        </div>
                        <p className="mt-3 text-sm text-slate-400">{method.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700/30 bg-slate-900/40 p-5">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Fluxo escolhido</p>
                <h3 className="mt-2 text-xl font-semibold">{selectedMethod.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{selectedMethod.description}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  className="bg-white text-slate-950 hover:bg-slate-100"
                  onClick={handleCheckout}
                  disabled={submitting || !currentWorkspace?.id}
                >
                  {submitting ? "Processando..." : "Iniciar checkout"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700/60 bg-slate-950/50 text-slate-100"
                  onClick={handleOpenPortal}
                  disabled={!subscription || subscription.provider !== "stripe"}
                >
                  Abrir portal Stripe
                </Button>
              </div>
            </div>
          </Card>

          <Card className="border-slate-700/30 bg-slate-950/60 p-6 backdrop-blur-sm">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Confirmacao real</p>
              <h3 className="text-2xl font-semibold">Status do pagamento</h3>
              <p className="text-sm text-slate-400">
                O frontend nunca libera acesso sozinho. O Nano espera a confirmacao do webhook antes de ativar o plano.
              </p>

              {loading ? (
                <p className="text-sm text-slate-400">Carregando assinatura...</p>
              ) : latestPayment ? (
                <div className="space-y-4 rounded-2xl border border-slate-700/30 bg-slate-900/40 p-5">
                  <StatusItem label="Provider" value={latestPayment.provider || "-"} />
                  <StatusItem label="Valor" value={currencyFormatter.format(Number(latestPayment.amount || 0))} />
                  <StatusItem label="Status" value={latestPayment.status || "-"} />
                  <StatusItem
                    label="Vencimento"
                    value={latestPayment.due_date ? new Date(latestPayment.due_date).toLocaleDateString("pt-BR") : "-"}
                  />

                  {latestPayment.pix_qr_code ? (
                    <div className="space-y-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                      <p className="text-sm font-medium text-red-100">QR Code PIX</p>
                      <div className="break-all rounded-xl bg-slate-950/80 p-3 text-xs text-slate-300">
                        {latestPayment.pix_qr_code}
                      </div>
                      {latestPayment.pix_payload ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="border-slate-700/60 bg-slate-950/50 text-slate-100"
                          onClick={copyPixPayload}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar payload PIX
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {latestPayment.invoice_url ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-slate-700/60 bg-slate-950/50 text-slate-100"
                      onClick={() => window.open(latestPayment.invoice_url, "_blank", "noopener,noreferrer")}
                    >
                      Abrir cobranca
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Ainda nao existe cobranca gerada. Escolha um metodo e inicie o checkout.
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
  <div className="rounded-2xl border border-slate-700/30 bg-slate-900/40 p-4">
    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
    <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
  </div>
);

export default Billing;
