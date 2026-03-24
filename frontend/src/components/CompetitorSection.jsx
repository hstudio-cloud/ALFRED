import React from 'react';
import { mockData } from '../data/mock';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { X, Check, ArrowRight } from 'lucide-react';

const CompetitorSection = () => {
  const { competitors, comparison } = mockData;

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <p className="text-cyan-400 font-semibold uppercase tracking-wider text-sm">Comparação Honesta</p>
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-white">Você pode usar outras ferramentas</span>
          </h2>
          <p className="text-xl text-slate-400">
            Ou pode escolher o que realmente funciona.
          </p>
        </div>

        {/* Competitor logos */}
        <div className="flex flex-wrap justify-center gap-6 mb-16 opacity-40">
          {competitors.map((competitor, index) => (
            <div key={index} className="bg-slate-800/30 border border-slate-700/50 rounded-lg px-6 py-3">
              <span className="text-slate-400 font-semibold">{competitor.name}</span>
            </div>
          ))}
        </div>

        {/* Comparison cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Competitors */}
          <Card className="bg-slate-800/30 border-slate-700/50 p-8">
            <div className="space-y-6">
              <div>
                <div className="text-slate-400 text-lg font-semibold mb-2">{comparison.competitor.name}</div>
                <h3 className="text-2xl font-bold text-white mb-2">{comparison.competitor.title}</h3>
              </div>
              <div className="space-y-3">
                {comparison.competitor.problems.map((problem, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-400">{problem}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Alfred */}
          <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30 p-8 relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl" />
            
            <div className="relative space-y-6">
              <div>
                <div className="text-cyan-400 text-lg font-bold mb-2">{comparison.alfred.name}</div>
                <h3 className="text-2xl font-bold text-white mb-2">{comparison.alfred.title}</h3>
              </div>
              <div className="space-y-3">
                {comparison.alfred.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button 
            size="lg" 
            className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all group"
          >
            Experimente o Alfred
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CompetitorSection;
