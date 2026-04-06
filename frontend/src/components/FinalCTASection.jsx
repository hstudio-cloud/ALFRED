import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

const FinalCTASection = () => {
  return (
    <section className="relative overflow-hidden px-6 py-32">
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-amber-500/10" />
      <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/20 blur-3xl" />

      <div className="relative mx-auto max-w-4xl space-y-8 text-center">
        <Badge variant="outline" className="border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300 backdrop-blur-sm">
          <Sparkles className="mr-2 h-4 w-4" />
          +2.000 pessoas no controle da propria rotina financeira
        </Badge>

        <h2 className="text-5xl font-bold md:text-6xl">
          <span className="text-white">Sua operacao financeira </span>
          <span className="bg-gradient-to-r from-red-300 via-red-500 to-amber-300 bg-clip-text text-transparent">comeca agora</span>
        </h2>

        <p className="mx-auto max-w-2xl text-xl text-slate-300">
          Voce ja viu o que o Nano IA faz. Agora e hora de colocar o assistente no centro da sua rotina.
        </p>

        <Button size="lg" className="rounded-full bg-white px-12 py-8 text-xl font-bold text-slate-900 shadow-2xl transition-all hover:bg-slate-100">
          Quero comecar
          <ArrowRight className="ml-3 h-6 w-6" />
        </Button>
      </div>
    </section>
  );
};

export default FinalCTASection;
