import React, { useState } from 'react';
import { ArrowRight, Brain, Calendar, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { mockData } from '../data/mock';

const IntelligenceSection = () => {
  const { intelligenceFeatures } = mockData;
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-red-300">Inteligencia real</p>
          <h2 className="text-4xl font-bold md:text-5xl">
            <span className="text-white">Nao e apenas organizacao, </span>
            <span className="bg-gradient-to-r from-red-300 to-amber-300 bg-clip-text text-transparent">e inteligencia</span>
          </h2>
          <p className="text-xl text-slate-400">O Nano IA conecta seus dados, identifica padroes e oferece insights que transformam sua rotina.</p>
        </div>

        <div className="mb-12 flex flex-wrap justify-center gap-3">
          {intelligenceFeatures.map((feature, index) => (
            <button
              key={index}
              onClick={() => setActiveFeature(index)}
              className={`rounded-full px-6 py-3 text-sm font-medium transition-all ${
                activeFeature === index
                  ? 'bg-gradient-to-r from-red-500 to-red-700 text-white shadow-lg'
                  : 'border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              {feature}
            </button>
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card className="border-slate-700/50 bg-slate-800/30 p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                  <span className="text-lg text-red-200">U</span>
                </div>
                <div className="text-sm text-slate-400">Voce pergunta</div>
              </div>
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6">
                <h3 className="text-2xl font-bold text-white">O que tem pra semana que vem?</h3>
              </div>
            </div>
          </Card>

          <Card className="border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-950/10 p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div className="text-sm font-semibold text-red-300">Nano analisa</div>
              </div>
              <div className="space-y-4">
                <div className="rounded-lg border border-red-500/20 bg-slate-900/50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-red-300" />
                    <span className="text-sm font-semibold text-white">6 reunioes agendadas</span>
                  </div>
                  <p className="text-xs text-slate-400">Ter (2), Qui (3), Sex (1)</p>
                </div>
                <div className="rounded-lg border border-red-500/20 bg-slate-900/50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-red-300" />
                    <span className="text-sm font-semibold text-white">12 tarefas prioritarias</span>
                  </div>
                  <p className="text-xs text-slate-400">3 com deadline na proxima semana</p>
                </div>
                <div className="rounded-lg border border-red-500/20 bg-slate-900/50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <span className="text-sm font-semibold text-white">Insight</span>
                  </div>
                  <p className="text-xs text-slate-400">Quinta-feira sera mais intensa. Reserve buffer time.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Button size="lg" className="rounded-full bg-gradient-to-r from-red-500 to-red-700 px-8 py-6 text-lg font-semibold text-white hover:from-red-600 hover:to-red-800">
            Quero essa inteligencia
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default IntelligenceSection;
