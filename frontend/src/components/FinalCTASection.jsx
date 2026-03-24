import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowRight, Sparkles } from 'lucide-react';

const FinalCTASection = () => {
  return (
    <section className="py-32 px-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto text-center space-y-8">
        {/* Badge */}
        <Badge 
          variant="outline" 
          className="bg-cyan-500/10 border-cyan-500/20 text-cyan-400 px-4 py-2 text-sm backdrop-blur-sm"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          +2.000 pessoas no controle da própria vida
        </Badge>

        {/* Heading */}
        <div className="space-y-4">
          <h2 className="text-5xl md:text-6xl font-bold">
            <span className="text-white">Sua vida organizada </span>
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              começa agora
            </span>
          </h2>
        </div>

        {/* Subtitle */}
        <p className="text-xl text-slate-300 max-w-2xl mx-auto">
          Você já viu o que o Alfred faz. Agora é hora de sentir.
        </p>

        {/* CTA Button */}
        <div className="pt-4">
          <Button 
            size="lg" 
            className="bg-white text-slate-900 hover:bg-slate-100 px-12 py-8 text-xl font-bold rounded-full shadow-2xl hover:shadow-3xl transition-all group"
          >
            Quero começar
            <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-6 items-center justify-center pt-4 text-sm text-slate-400">
          <span>Ativação instantânea</span>
          <span>•</span>
          <span>14 dias de garantia</span>
          <span>•</span>
          <span>Suporte em português</span>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;
