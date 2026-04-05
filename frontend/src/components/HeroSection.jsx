import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { mockData } from "../data/mock";
import { ArrowRight, Check, Sparkles, LogIn } from "lucide-react";

const HeroSection = () => {
  const { hero } = mockData;
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--background))]/20 via-slate-900 to-[hsl(var(--primary))]/20 animate-gradient" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
        {/* Login button - top right corner */}
        <div className="absolute -top-10 right-0">
          <Button
            variant="ghost"
            onClick={() => navigate("/login")}
            className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]/80 hover:bg-[hsl(var(--primary))]/10"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Entrar
          </Button>
        </div>

        {/* Badge */}
        <Badge
          variant="outline"
          className="bg-cyan-500/10 border-cyan-500/20 text-cyan-400 px-4 py-2 text-sm backdrop-blur-sm hover:bg-cyan-500/20 transition-colors"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {hero.badge}
        </Badge>

        {/* Main heading */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
            {hero.title}
          </h1>
          <h2 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-[hsl(var(--chart-1))] via-[hsl(var(--chart-3))] to-[hsl(var(--chart-5))] bg-clip-text text-transparent">
            {hero.titleHighlight}
          </h2>
        </div>

        {/* Subtitle */}
        <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
          {hero.subtitle}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4">
          <Button
            size="lg"
            onClick={() => navigate("/login")}
            className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all group"
          >
            {hero.ctaPrimary}
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() =>
              document
                .getElementById("product-tour")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold rounded-full transition-all"
          >
            {hero.ctaSecondary}
          </Button>
        </div>

        {/* Features list */}
        <div className="flex flex-wrap gap-6 items-center justify-center pt-8 text-sm text-slate-400">
          {hero.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[hsl(var(--primary))]" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {/* Product mockup placeholder */}
        <div className="pt-12">
          <div className="relative mx-auto max-w-4xl">
            <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 shadow-2xl">
              <div className="bg-slate-900/90 rounded-lg p-8 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-4 text-xs text-slate-500">
                    app.meu-alfred.com
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg border border-[hsl(var(--chart-1))]/30 bg-gradient-to-br from-[hsl(var(--chart-1))]/20 to-[hsl(var(--chart-5))]/10 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-cyan-200">
                          Resumo financeiro
                        </p>
                        <h3 className="mt-2 text-3xl font-semibold text-white">
                          R$ 24.680,00
                        </h3>
                      </div>
                      <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20">
                        Operação saudável
                      </Badge>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3 text-left">
                        <p className="text-xs text-slate-400">Pix recebido</p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          R$ 8.400
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3 text-left">
                        <p className="text-xs text-slate-400">Cartão empresa</p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          R$ 3.280
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3 text-left">
                        <p className="text-xs text-slate-400">
                          Contas a vencer
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          4 alertas
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 text-left">
                      <p className="text-xs text-slate-500">Pessoal</p>
                      <p className="mt-2 text-base font-semibold text-white">
                        R$ 4.320
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 text-left">
                      <p className="text-xs text-slate-500">Empresa</p>
                      <p className="mt-2 text-base font-semibold text-white">
                        R$ 20.360
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 text-left">
                      <p className="text-xs text-slate-500">IA</p>
                      <p className="mt-2 text-base font-semibold text-white">
                        12 sugestões
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--primary))]/20 to-transparent blur-3xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
