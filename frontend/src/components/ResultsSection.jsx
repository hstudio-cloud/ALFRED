import React, { useState } from 'react';
import { mockData } from '../data/mock';
import { Card } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { BarChart3, TrendingUp, Brain, Sparkles } from 'lucide-react';

const ResultsSection = () => {
  const { categories } = mockData;
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <p className="text-cyan-400 font-semibold uppercase tracking-wider text-sm">O resultado</p>
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-white">Sua vida organizada </span>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              em um só lugar
            </span>
          </h2>
          <p className="text-xl text-slate-400">
            Cada área, organizada com exemplos reais.
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {categories.map((category, index) => (
            <button
              key={index}
              onClick={() => setActiveCategory(index)}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${
                activeCategory === index
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Category content - Dashboard mockup */}
        <Card className="bg-slate-800/30 border-slate-700/50 p-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">{categories[activeCategory]}</h3>
              <div className="text-sm text-slate-400">Visão geral</div>
            </div>

            {/* Stats grid */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-slate-400 text-sm">Tarefas Concluídas</div>
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-3xl font-bold text-white">24</div>
                <div className="text-xs text-green-400 mt-1">+12% esta semana</div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-slate-400 text-sm">Produtividade</div>
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-3xl font-bold text-white">87%</div>
                <div className="text-xs text-cyan-400 mt-1">Acima da média</div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-slate-400 text-sm">Insights IA</div>
                  <Brain className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-3xl font-bold text-white">5</div>
                <div className="text-xs text-purple-400 mt-1">Novos esta semana</div>
              </div>
            </div>

            {/* Example tasks/items */}
            <div className="space-y-3">
              <div className="text-sm text-slate-400 font-semibold mb-4">Itens Recentes</div>
              {[1, 2, 3].map((item) => (
                <div key={item} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30 hover:border-cyan-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    <div className="flex-1">
                      <div className="text-white font-medium">Exemplo de item {item}</div>
                      <div className="text-xs text-slate-400 mt-1">Organizado automaticamente pelo Alfred</div>
                    </div>
                    <div className="text-xs text-slate-500">Há 2h</div>
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
