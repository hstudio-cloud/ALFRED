import React, { useState } from 'react';
import { mockData } from '../data/mock';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { MessageCircle, Mic, Zap, Check } from 'lucide-react';

const ProductTourSection = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { productTabs, chatFeatures } = mockData;

  return (
    <section id="product-tour" className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <p className="text-cyan-400 font-semibold uppercase tracking-wider text-sm">Tour pelo Produto</p>
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-white">Cada parte da sua operação, </span>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              organizada em um só lugar
            </span>
          </h2>
          <p className="text-xl text-slate-400">
            Explore como o Alfred transforma pagamentos, recebimentos e rotina financeira em ações claras.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {productTabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${
                activeTab === index
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 0 && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-3xl font-bold text-white mb-4">Converse com sua IA financeira</h3>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Interaja naturalmente por texto ou voz. O Alfred entende contexto, classifica gastos e organiza cobranças, contas e lembretes.
                </p>
              </div>

              <div className="space-y-3">
                {chatFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-6 rounded-full">
                Experimentar
              </Button>
            </div>

            <Card className="bg-slate-800/30 border-slate-700/50 p-6">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">U</span>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-sm text-slate-300">
                      Paguei R$ 320 no cartão para marketing da empresa, recebi R$ 1.500 por Pix e preciso lembrar do aluguel no dia 5
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-slate-900/50 border border-slate-700/30 rounded-2xl rounded-tr-sm px-4 py-3">
                    <p className="text-sm text-white mb-3">Entendi. Já organizei tudo para você:</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-green-400">
                        <Check className="w-3 h-3" />
                        <span>Despesa categorizada como Marketing da empresa</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-400">
                        <Check className="w-3 h-3" />
                        <span>Receita por Pix registrada no fluxo de caixa</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-400">
                        <Check className="w-3 h-3" />
                        <span>Lembrete do aluguel programado para o dia 5</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700/50">
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <Mic className="w-4 h-4 text-cyan-400" />
                    <span>Ou envie um áudio...</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab !== 0 && (
          <Card className="bg-slate-800/30 border-slate-700/50 p-12 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mx-auto">
                <Zap className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">{productTabs[activeTab]}</h3>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Essa funcionalidade ajuda você a gerenciar {productTabs[activeTab].toLowerCase()} com organização financeira, contexto e menos trabalho manual.
              </p>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
};

export default ProductTourSection;
