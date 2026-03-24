import React, { useState } from 'react';
import { mockData } from '../data/mock';
import { Card } from './ui/card';

const ScenariosSection = () => {
  const [activeScenario, setActiveScenario] = useState(1);
  const { scenarios } = mockData;

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Você acorda sem saber por onde começar.
          </h2>
          <p className="text-2xl text-cyan-400 font-medium">
            Ele já organizou tudo.
          </p>
        </div>

        {/* Scenario tabs */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {scenarios.map((scenario, index) => (
            <button
              key={index}
              onClick={() => setActiveScenario(index)}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${
                activeScenario === index
                  ? 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/50'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              {scenario}
            </button>
          ))}
        </div>

        {/* Scenario content */}
        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm p-8">
          <div className="space-y-6">
            <div className="text-slate-300 leading-relaxed">
              <p className="text-lg">
                Enquanto você dormia, Alfred já organizou suas tarefas, priorizou seus projetos
                e preparou um plano de ação para o dia. Tudo pronto antes mesmo de você abrir os olhos.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                <div className="text-cyan-400 text-sm font-semibold mb-2">Tarefas do Dia</div>
                <div className="text-2xl font-bold text-white">8 tarefas</div>
                <div className="text-xs text-slate-400 mt-1">Priorizadas automaticamente</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                <div className="text-purple-400 text-sm font-semibold mb-2">Reuniões</div>
                <div className="text-2xl font-bold text-white">3 agendadas</div>
                <div className="text-xs text-slate-400 mt-1">Sincronizadas e preparadas</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                <div className="text-green-400 text-sm font-semibold mb-2">Lembretes</div>
                <div className="text-2xl font-bold text-white">5 ativos</div>
                <div className="text-xs text-slate-400 mt-1">No momento certo</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Multiplataforma badge */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            Multiplataforma
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScenariosSection;
