import React from 'react';
import { mockData } from '../data/mock';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle2, Sparkles } from 'lucide-react';

const HowItWorksSection = () => {
  const { howItWorks } = mockData;

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <p className="text-cyan-400 font-semibold uppercase tracking-wider text-sm">Como Funciona</p>
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-white">Por que ter o </span>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Alfred como seu assistente?
            </span>
          </h2>
          <p className="text-xl text-slate-400">
            Uma mensagem. Tudo organizado. Em segundos.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-16">
          {howItWorks.map((step, index) => (
            <div key={index} className="relative">
              {/* Step number */}
              <div className="flex items-start gap-8">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-6">
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-3">{step.title}</h3>
                    <p className="text-lg text-slate-400">{step.description}</p>
                  </div>

                  {/* Step 1 - Example message */}
                  {index === 0 && step.example && (
                    <Card className="bg-slate-800/30 border-slate-700/50 p-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-2">Áudio transcrito</div>
                          <p className="text-slate-300 leading-relaxed">{step.example}</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Step 2 - Detected items */}
                  {index === 1 && step.items && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {step.items.map((item, itemIndex) => (
                        <Card key={itemIndex} className="bg-slate-800/30 border-slate-700/50 p-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
                            <div>
                              <div className="text-sm text-cyan-400 font-semibold mb-1">{item.label}</div>
                              <div className="text-white font-medium">{item.value}</div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Step 3 - Result cards */}
                  {index === 2 && step.cards && (
                    <div className="grid md:grid-cols-4 gap-4">
                      {step.cards.map((card, cardIndex) => (
                        <Card key={cardIndex} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 p-4 hover:border-cyan-500/30 transition-all">
                          <div className="text-center space-y-2">
                            <div className="text-xl font-bold text-white">{card.title}</div>
                            <Badge variant="outline" className="bg-cyan-500/10 border-cyan-500/20 text-cyan-400 text-xs">
                              {card.badge}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Connecting line */}
              {index < howItWorks.length - 1 && (
                <div className="absolute left-8 top-16 w-px h-16 bg-gradient-to-b from-cyan-500/50 to-transparent" />
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all">
            Quero meu assistente pessoal
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
