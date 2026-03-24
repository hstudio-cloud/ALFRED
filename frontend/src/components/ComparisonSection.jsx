import React from 'react';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';

const ComparisonSection = () => {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <p className="text-cyan-400 font-semibold uppercase tracking-wider text-sm">A diferença</p>
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-white">IAs comuns respondem. </span>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              O Alfred resolve.
            </span>
          </h2>
          <p className="text-xl text-slate-400">
            Mande a mesma mensagem pros dois. Compare.
          </p>
        </div>

        {/* Video demo placeholder */}
        <div className="relative mb-12">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 shadow-2xl">
            <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 flex items-center justify-center group cursor-pointer hover:border-cyan-500/30 transition-all">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto group-hover:bg-cyan-500/30 transition-all">
                  <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-cyan-400 border-b-[12px] border-b-transparent ml-1" />
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">Demonstração real do Alfred</p>
                  <p className="text-slate-400 text-sm">organizando tudo de uma mensagem</p>
                </div>
              </div>
            </div>
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent blur-3xl -z-10" />
        </div>

        {/* Comparison cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Other AI */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-8">
            <div className="text-center mb-6">
              <div className="text-slate-400 font-semibold text-lg">Outras IAs</div>
              <div className="text-sm text-slate-500 mt-2">Apenas respondem perguntas</div>
            </div>
            <div className="space-y-3">
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                <p className="text-slate-400 text-sm">
                  "Claro! Aqui estão algumas sugestões para organizar suas tarefas..."
                </p>
              </div>
              <div className="text-center text-slate-500 text-sm">Você ainda precisa fazer tudo manualmente</div>
            </div>
          </div>

          {/* Alfred */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-8">
            <div className="text-center mb-6">
              <div className="text-cyan-400 font-bold text-lg">Alfred</div>
              <div className="text-sm text-cyan-400/70 mt-2">Organiza e executa para você</div>
            </div>
            <div className="space-y-3">
              <div className="bg-slate-900/50 rounded-lg p-4 border border-cyan-500/20">
                <p className="text-white text-sm font-medium mb-2">✓ Tarefas criadas</p>
                <p className="text-white text-sm font-medium mb-2">✓ Lembretes configurados</p>
                <p className="text-white text-sm font-medium">✓ Calendário atualizado</p>
              </div>
              <div className="text-center text-cyan-400 text-sm font-medium">Tudo pronto em segundos</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button 
            size="lg" 
            className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all group"
          >
            Começar agora
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
