import React from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { mockData } from '../data/mock';

const CompetitorSection = () => {
  const { competitors, comparison } = mockData;

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-red-300">Comparacao honesta</p>
          <h2 className="text-4xl font-bold text-white md:text-5xl">Voce pode usar outras ferramentas</h2>
          <p className="text-xl text-slate-400">Ou pode escolher o que realmente organiza e executa.</p>
        </div>

        <div className="mb-16 flex flex-wrap justify-center gap-6 opacity-40">
          {competitors.map((competitor) => (
            <div key={competitor.name} className="rounded-lg border border-slate-700/50 bg-slate-800/30 px-6 py-3">
              <span className="font-semibold text-slate-400">{competitor.name}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card className="border-slate-700/50 bg-slate-800/30 p-8">
            <div className="space-y-6">
              <div>
                <div className="mb-2 text-lg font-semibold text-slate-400">{comparison.competitor.name}</div>
                <h3 className="text-2xl font-bold text-white">{comparison.competitor.title}</h3>
              </div>
              <div className="space-y-3">
                {comparison.competitor.problems.map((problem) => (
                  <div key={problem} className="flex items-start gap-3">
                    <X className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                    <span className="text-slate-400">{problem}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-950/10 p-8">
            <div className="space-y-6">
              <div>
                <div className="mb-2 text-lg font-bold text-red-300">{comparison.alfred.name}</div>
                <h3 className="text-2xl font-bold text-white">{comparison.alfred.title}</h3>
              </div>
              <div className="space-y-3">
                {comparison.alfred.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                    <span className="font-medium text-white">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Button size="lg" className="rounded-full bg-white px-8 py-6 text-lg font-semibold text-slate-900 hover:bg-slate-100">
            Experimente o Nano IA
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CompetitorSection;
