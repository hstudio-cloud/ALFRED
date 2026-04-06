import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { mockData } from '../data/mock';

const HowItWorksSection = () => {
  const { howItWorks } = mockData;

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-red-300">Como funciona</p>
          <h2 className="text-4xl font-bold md:text-5xl">
            <span className="text-white">Por que ter o </span>
            <span className="bg-gradient-to-r from-red-300 to-amber-300 bg-clip-text text-transparent">Nano IA como seu assistente?</span>
          </h2>
          <p className="text-xl text-slate-400">Uma mensagem. Tudo organizado. Em segundos.</p>
        </div>

        <div className="space-y-16">
          {howItWorks.map((step, index) => (
            <div key={index} className="flex items-start gap-8">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-2xl font-bold text-white shadow-lg">
                {step.number}
              </div>
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="mb-3 text-3xl font-bold text-white">{step.title}</h3>
                  <p className="text-lg text-slate-400">{step.description}</p>
                </div>
                {index === 0 && step.example && (
                  <Card className="border-slate-700/50 bg-slate-800/30 p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20">
                        <Sparkles className="h-5 w-5 text-red-300" />
                      </div>
                      <div>
                        <div className="mb-2 text-xs text-slate-500">Audio transcrito</div>
                        <p className="leading-relaxed text-slate-300">{step.example}</p>
                      </div>
                    </div>
                  </Card>
                )}
                {index === 1 && step.items && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {step.items.map((item) => (
                      <Card key={item.label} className="border-slate-700/50 bg-slate-800/30 p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-red-300" />
                          <div>
                            <div className="mb-1 text-sm font-semibold text-red-300">{item.label}</div>
                            <div className="font-medium text-white">{item.value}</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                {index === 2 && step.cards && (
                  <div className="grid gap-4 md:grid-cols-4">
                    {step.cards.map((card) => (
                      <Card key={card.title} className="border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 transition-all hover:border-red-500/30">
                        <div className="space-y-2 text-center">
                          <div className="text-xl font-bold text-white">{card.title}</div>
                          <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-xs text-red-300">{card.badge}</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
