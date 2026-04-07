import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";

const ComparisonSection = () => {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-red-300">
            A diferenca
          </p>
          <h2 className="text-4xl font-bold md:text-5xl">
            <span className="text-white">IAs comuns respondem. </span>
            <span className="bg-gradient-to-r from-red-300 to-amber-300 bg-clip-text text-transparent">
              O Nano IA resolve.
            </span>
          </h2>
          <p className="text-xl text-slate-400">
            Mande a mesma mensagem para os dois. Compare.
          </p>
        </div>

        <div className="mb-12 grid gap-8 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-8">
            <div className="mb-6 text-center">
              <div className="text-lg font-semibold text-slate-400">
                Outras IAs
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Apenas respondem perguntas
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-700/30 bg-slate-900/50 p-4">
                <p className="text-sm text-slate-400">
                  "Claro. Aqui estão algumas sugestões para organizar suas
                  rotinas..."
                </p>
              </div>
              <div className="text-center text-sm text-slate-500">
                Você ainda precisa fazer tudo manualmente
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-950/10 p-8">
            <div className="mb-6 text-center">
              <div className="text-lg font-bold text-red-300">Nano IA</div>
              <div className="mt-2 text-sm text-red-200/70">
                Organiza e executa para você
              </div>
            </div>
            <div className="space-y-3 rounded-lg border border-red-500/20 bg-slate-900/50 p-4">
              <p className="text-sm font-medium text-white">
                - Despesa categorizada e salva
              </p>
              <p className="text-sm font-medium text-white">
                - Pix registrado no fluxo de caixa
              </p>
              <p className="text-sm font-medium text-white">
                - Lembrete de vencimento programado
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Button
            size="lg"
            className="rounded-full bg-white px-8 py-6 text-lg font-semibold text-slate-900 hover:bg-slate-100"
          >
            Começar agora
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
