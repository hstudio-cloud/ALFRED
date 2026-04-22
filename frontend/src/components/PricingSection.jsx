import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { mockData } from "../data/mock";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useAuth } from "../context/AuthContext";
import {
  Check,
  ArrowRight,
  MessageCircle,
  Send,
  Calendar,
  Mic,
} from "lucide-react";

const periodMeta = {
  monthly: {
    label: "Mensal",
    value: "R$ 49.90",
    cadence: "/mes",
    helper: "",
  },
  quarterly: {
    label: "Trimestral",
    value: "Em breve",
    cadence: "",
    helper: "Valor em configuracao",
  },
  yearly: {
    label: "Anual",
    value: "Em breve",
    cadence: "",
    helper: "Valor em configuracao",
  },
};

const PricingSection = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const { pricing } = mockData;
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const currentPeriod = periodMeta[selectedPeriod];

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-red-400">
            Comece gratis
          </p>
          <h2 className="text-4xl font-bold text-white md:text-5xl">
            Um plano. Tudo incluso.
          </h2>
          <p className="text-xl text-slate-400">
            Sem limites. Sem restricoes. Sem surpresas.
          </p>
        </div>

        <div className="mb-12 flex flex-wrap items-center justify-center gap-3">
          {Object.entries(periodMeta).map(([key, option]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedPeriod(key)}
              className={`rounded-full px-5 py-3 text-sm font-medium transition-all ${
                selectedPeriod === key
                  ? "bg-white text-slate-950 shadow-lg"
                  : "border border-slate-700/50 bg-slate-900/40 text-slate-300 hover:border-slate-500/60"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mx-auto max-w-md">
          <Card className="relative overflow-hidden border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 transition-all hover:border-red-500/30">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-red-400/10 blur-3xl" />

            <div className="relative space-y-6">
              <div className="text-center">
                <h3 className="mb-2 text-2xl font-bold text-white">
                  {pricing.title}
                </h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-white">
                    {currentPeriod.value}
                  </span>
                  {currentPeriod.cadence ? (
                    <span className="text-slate-400">{currentPeriod.cadence}</span>
                  ) : null}
                </div>
                {currentPeriod.helper ? (
                  <div className="mt-2 text-sm text-red-400">
                    {currentPeriod.helper}
                  </div>
                ) : null}
                <div className="mt-2 text-sm text-slate-400">
                  {pricing.guarantee}
                </div>
              </div>

              <div className="border-t border-slate-700/50" />

              <div>
                <div className="mb-4 text-center font-semibold text-white">
                  Tudo incluso
                </div>
                <div className="space-y-3">
                  {pricing.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                      <span className="text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-700/30 bg-red-900/10 p-4">
                <div className="mb-3 text-center text-sm text-slate-400">
                  Conecta com
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <MessageCircle className="h-5 w-5 text-green-400" />
                  <Send className="h-5 w-5 text-blue-400" />
                  <Calendar className="h-5 w-5 text-red-400" />
                  <Mic className="h-5 w-5 text-cyan-400" />
                </div>
              </div>

              <Button
                size="lg"
                className="group w-full rounded-full bg-white py-6 text-lg font-semibold text-slate-900 shadow-lg transition-all hover:bg-slate-100 hover:shadow-xl"
                onClick={() => navigate(isAuthenticated ? "/billing" : "/register")}
              >
                Comecar agora
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>

              <div className="space-y-1 text-center">
                <div className="text-xs text-slate-400">14 dias de garantia</div>
                <div className="text-xs text-slate-400">
                  Cancele quando quiser
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
