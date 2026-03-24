import React, { useState } from 'react';
import { mockData } from '../data/mock';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Brain, TrendingUp, Calendar, Sparkles, ArrowRight } from 'lucide-react';

const IntelligenceSection = () => {
  const { intelligenceFeatures } = mockData;
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <p className="text-cyan-400 font-semibold uppercase tracking-wider text-sm">Inteligência Real</p>
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-white">Não é apenas organização, </span>
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              é inteligência
            </span>
          </h2>
          <p className="text-xl text-slate-400">
            O Alfred conecta seus dados, identifica padrões e oferece insights que transformam sua rotina.
          </p>
        </div>

        {/* Feature tabs */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {intelligenceFeatures.map((feature, index) => (
            <button
              key={index}
              onClick={() => setActiveFeature(index)}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${
                activeFeature === index
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              {feature}
            </button>
          ))}
        </div>

        {/* Intelligence demo */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left - Question */}
          <Card className="bg-slate-800/30 border-slate-700/50 p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-lg">U</span>
                </div>
                <div className="text-slate-400 text-sm">Você pergunta</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-white mb-3">O que tem pra semana que vem?</h3>
              </div>
            </div>
          </Card>

          {/* Right - AI Analysis */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div className="text-purple-400 text-sm font-semibold">Alfred analisa</div>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span className="text-white font-semibold text-sm">6 reuniões agendadas</span>
                  </div>
                  <p className="text-slate-400 text-xs">Ter (2), Qui (3), Sex (1)</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-white font-semibold text-sm">12 tarefas prioritárias</span>
                  </div>
                  <p className="text-slate-400 text-xs">3 com deadline na próxima semana</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="text-white font-semibold text-sm">Insight</span>
                  </div>
                  <p className="text-slate-400 text-xs">Quinta-feira será mais intensa. Reserve buffer time.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all group"
          >
            Quero essa inteligência
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default IntelligenceSection;
