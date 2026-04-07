import React, { useState } from "react";
import { Card } from "./ui/card";
import { mockData } from "../data/mock";

const ScenariosSection = () => {
  const [activeScenario, setActiveScenario] = useState(1);
  const { scenarios } = mockData;

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center space-y-4">
          <h2 className="text-4xl font-bold text-white md:text-5xl">
            Você acorda sem saber por onde começar.
          </h2>
          <p className="text-2xl font-medium text-red-300">
            O Nano já organizou tudo.
          </p>
        </div>

        <div className="mb-12 flex flex-wrap justify-center gap-3">
          {scenarios.map((scenario, index) => (
            <button
              key={index}
              onClick={() => setActiveScenario(index)}
              className={`rounded-full px-6 py-3 text-sm font-medium transition-all ${
                activeScenario === index
                  ? "border-2 border-red-500/50 bg-red-500/20 text-red-300"
                  : "border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
              }`}
            >
              {scenario}
            </button>
          ))}
        </div>

        <Card className="border-slate-700/50 bg-slate-800/30 p-8 backdrop-blur-sm">
          <div className="space-y-6">
            <div className="text-lg leading-relaxed text-slate-300">
              Enquanto você dormia, o Nano IA já organizou suas tarefas,
              priorizou seus projetos e preparou um plano de ação para o dia.
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-700/30 bg-slate-900/50 p-4">
                <div className="mb-2 text-sm font-semibold text-red-300">
                  Tarefas do dia
                </div>
                <div className="text-2xl font-bold text-white">8 tarefas</div>
                <div className="mt-1 text-xs text-slate-400">
                  Priorizadas automaticamente
                </div>
              </div>
              <div className="rounded-lg border border-slate-700/30 bg-slate-900/50 p-4">
                <div className="mb-2 text-sm font-semibold text-amber-300">
                  Reuniões
                </div>
                <div className="text-2xl font-bold text-white">3 agendadas</div>
                <div className="mt-1 text-xs text-slate-400">
                  Sincronizadas e preparadas
                </div>
              </div>
              <div className="rounded-lg border border-slate-700/30 bg-slate-900/50 p-4">
                <div className="mb-2 text-sm font-semibold text-red-200">
                  Lembretes
                </div>
                <div className="text-2xl font-bold text-white">5 ativos</div>
                <div className="mt-1 text-xs text-slate-400">
                  No momento certo
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default ScenariosSection;
