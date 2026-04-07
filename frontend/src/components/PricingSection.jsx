import React, { useState } from "react";
import { mockData } from "../data/mock";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Check,
  ArrowRight,
  MessageCircle,
  Send,
  Calendar,
  Mic,
} from "lucide-react";

const PricingSection = () => {
  const [isYearly, setIsYearly] = useState(false);
  const { pricing, platforms } = mockData;

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <p className="text-red-400 font-semibold uppercase tracking-wider text-sm">
            Comece grátis
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Um plano. Tudo incluso.
          </h2>
          <p className="text-xl text-slate-400">
            Sem limites. Sem restrições. Sem surpresas.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span
            className={`text-sm font-medium ${!isYearly ? "text-white" : "text-slate-400"}`}
          >
            Mensal
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              isYearly ? "bg-red-500" : "bg-slate-700"
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                isYearly ? "translate-x-7" : "translate-x-0"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${isYearly ? "text-white" : "text-slate-400"}`}
          >
            Anual
          </span>
          {isYearly && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              -33%
            </Badge>
          )}
        </div>

        {/* Pricing card */}
        <div className="max-w-md mx-auto">
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 p-8 hover:border-red-500/30 transition-all relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-400/10 rounded-full blur-3xl" />

            <div className="relative space-y-6">
              {/* Header */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {pricing.title}
                </h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-white">
                    R${" "}
                    {isYearly
                      ? pricing.yearly.toFixed(2)
                      : pricing.monthly.toFixed(2)}
                  </span>
                  <span className="text-slate-400">/mês</span>
                </div>
                {isYearly && (
                  <div className="text-sm text-red-500 mt-2">
                    Cobrado anualmente
                  </div>
                )}
                <div className="text-sm text-slate-400 mt-2">
                  {pricing.guarantee}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-700/50" />

              {/* Features */}
              <div>
                <div className="text-center text-white font-semibold mb-4">
                  Tudo incluso
                </div>
                <div className="space-y-3">
                  {pricing.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Integrations */}
              <div className="bg-red-900/10 rounded-lg p-4 border border-slate-700/30">
                <div className="text-sm text-slate-400 mb-3 text-center">
                  Conecta com
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <MessageCircle className="w-5 h-5 text-green-400" />
                  <Send className="w-5 h-5 text-blue-400" />
                  <Calendar className="w-5 h-5 text-red-400" />
                  <Mic className="w-5 h-5 text-cyan-400" />
                </div>
              </div>

              {/* CTA */}
              <Button
                size="lg"
                className="w-full bg-white text-slate-900 hover:bg-slate-100 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all group"
              >
                Começar agora
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>

              {/* Footer */}
              <div className="text-center space-y-1">
                <div className="text-xs text-slate-400">
                  14 dias de garantia
                </div>
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
