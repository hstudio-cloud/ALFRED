import React, { useState } from 'react';
import { BarChart3, Brain, TrendingUp } from 'lucide-react';
import { Card } from './ui/card';
import { mockData } from '../data/mock';

const ResultsSection = () => {
  const { categories } = mockData;
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-red-300">O resultado</p>
          <h2 className="text-4xl font-bold md:text-5xl">
            <span className="text-white">Sua operacao organizada </span>
            <span className="bg-gradient-to-r from-red-300 to-amber-300 bg-clip-text text-transparent">em um so lugar</span>
          </h2>
          <p className="text-xl text-slate-400">Cada area com exemplos reais de uso financeiro.</p>
        </div>

        <div className="mb-12 flex flex-wrap justify-center gap-3">
          {categories.map((category, index) => (
            <button
              key={category}
              onClick={() => setActiveCategory(index)}
              className={`rounded-full px-6 py-3 text-sm font-medium transition-all ${
                activeCategory === index
                  ? 'bg-gradient-to-r from-red-500 to-red-700 text-white shadow-lg'
                  : 'border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <Card className="border-slate-700/50 bg-slate-800/30 p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">{categories[activeCategory]}</h3>
              <div className="text-sm text-slate-400">Visao geral</div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-700/30 bg-slate-900/50 p-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm text-slate-400">Receitas registradas</div>
                  <TrendingUp className="h-4 w-4 text-red-300" />
                </div>
                <div className="text-3xl font-bold text-white">24</div>
                <div className="mt-1 text-xs text-red-300">+12% este mes</div>
              </div>
              <div className="rounded-lg border border-slate-700/30 bg-slate-900/50 p-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm text-slate-400">Fluxo financeiro</div>
                  <BarChart3 className="h-4 w-4 text-red-300" />
                </div>
                <div className="text-3xl font-bold text-white">87%</div>
                <div className="mt-1 text-xs text-red-300">Saude operacional</div>
              </div>
              <div className="rounded-lg border border-slate-700/30 bg-slate-900/50 p-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm text-slate-400">Insights da IA</div>
                  <Brain className="h-4 w-4 text-amber-300" />
                </div>
                <div className="text-3xl font-bold text-white">5</div>
                <div className="mt-1 text-xs text-amber-300">Novos esta semana</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="mb-4 text-sm font-semibold text-slate-400">Itens recentes</div>
              {[1, 2, 3].map((item) => (
                <div key={item} className="rounded-lg border border-slate-700/30 bg-slate-900/50 p-4 transition-all hover:border-red-500/30">
                  <div className="flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full bg-red-300" />
                    <div className="flex-1">
                      <div className="font-medium text-white">Exemplo de item {item}</div>
                      <div className="mt-1 text-xs text-slate-400">Organizado automaticamente pelo Nano IA</div>
                    </div>
                    <div className="text-xs text-slate-500">Ha 2h</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default ResultsSection;
