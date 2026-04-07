import React, { useState } from "react";
import { Check, MessageCircle, Mic, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { mockData } from "../data/mock";

const ProductTourSection = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { productTabs, chatFeatures } = mockData;

  return (
    <section id="product-tour" className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-red-300">
            Tour pelo produto
          </p>
          <h2 className="text-4xl font-bold md:text-5xl">
            <span className="text-white">Cada parte da sua operação, </span>
            <span className="bg-gradient-to-r from-red-300 to-amber-300 bg-clip-text text-transparent">
              organizada em um só lugar
            </span>
          </h2>
          <p className="text-xl text-slate-400">
            Explore como o Nano IA transforma pagamentos, recebimentos e rotina
            financeira em ações claras.
          </p>
        </div>

        <div className="mb-12 flex flex-wrap justify-center gap-3">
          {productTabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`rounded-full px-6 py-3 text-sm font-medium transition-all ${
                activeTab === index
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                  : "border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 0 ? (
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-white">
                Converse com sua IA financeira
              </h3>
              <p className="text-lg leading-relaxed text-slate-400">
                Interaja naturalmente por texto ou voz. O Nano IA entende
                contexto, classifica gastos e organiza cobranças, contas e
                lembretes.
              </p>
              <div className="space-y-3">
                {chatFeatures.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3 text-slate-300"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20">
                      <Check className="h-4 w-4 text-red-300" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Button className="rounded-full bg-red-500 px-6 py-6 text-white hover:bg-red-600">
                Experimentar
              </Button>
            </div>

            <Card className="border-slate-700/50 bg-slate-800/30 p-6">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-sm text-red-200">
                    U
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-red-500/15 bg-red-500/10 px-4 py-3">
                    <p className="text-sm text-slate-300">
                      Paguei R$ 320 no cartão para marketing da empresa, recebi
                      R$ 1.500 por Pix e preciso lembrar do aluguel no dia 5.
                    </p>
                  </div>
                </div>
                <div className="flex flex-row-reverse gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                  <div className="rounded-2xl rounded-tr-sm border border-slate-700/30 bg-slate-900/50 px-4 py-3">
                    <p className="mb-3 text-sm text-white">
                      Entendi. Já organizei tudo para você:
                    </p>
                    <div className="space-y-2 text-xs text-slate-300">
                      <p>- Despesa categorizada como Marketing da empresa</p>
                      <p>- Receita por Pix registrada no fluxo de caixa</p>
                      <p>- Lembrete do aluguel programado para o dia 5</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-700/50 pt-4">
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <Mic className="h-4 w-4 text-red-300" />
                    <span>Ou envie um áudio...</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="border-slate-700/50 bg-slate-800/30 p-12 text-center">
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500/20 to-amber-500/10">
                <Zap className="h-8 w-8 text-red-300" />
              </div>
              <h3 className="text-2xl font-bold text-white">
                {productTabs[activeTab]}
              </h3>
              <p className="mx-auto max-w-2xl text-slate-400">
                Essa funcionalidade ajuda você a gerenciar{" "}
                {productTabs[activeTab].toLowerCase()} com contexto financeiro,
                organização e menos trabalho manual.
              </p>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
};

export default ProductTourSection;
