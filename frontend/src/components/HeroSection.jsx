import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, LogIn, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import NanoMark from './NanoMark';
import { mockData } from '../data/mock';

const HeroSection = () => {
  const { hero } = mockData;
  const navigate = useNavigate();

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(127,29,29,0.24),_transparent_24%),linear-gradient(180deg,#090203_0%,#180405_52%,#090203_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(248,113,113,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(248,113,113,0.04)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 mx-auto max-w-6xl text-center">
        <div className="absolute -top-10 right-0">
          <Button variant="ghost" onClick={() => navigate('/login')} className="text-red-300 hover:bg-red-500/10 hover:text-red-200">
            <LogIn className="mr-2 h-4 w-4" />
            Entrar
          </Button>
        </div>

        <div className="mb-8 flex items-center justify-center gap-4">
          <NanoMark className="h-16 w-16 md:h-20 md:w-20" />
          <div className="text-left">
            <p className="text-xs uppercase tracking-[0.42em] text-red-300/70">Nano IA</p>
            <p className="mt-1 text-sm text-slate-400">Sistema financeiro inteligente</p>
          </div>
        </div>

        <Badge variant="outline" className="border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300 backdrop-blur-sm hover:bg-red-500/20">
          <Sparkles className="mr-2 h-4 w-4" />
          {hero.badge}
        </Badge>

        <div className="mt-8 space-y-4">
          <h1 className="text-5xl font-bold leading-tight text-white md:text-7xl">{hero.title}</h1>
          <h2 className="bg-gradient-to-r from-red-300 via-red-500 to-amber-300 bg-clip-text text-5xl font-bold text-transparent md:text-7xl">
            {hero.titleHighlight}
          </h2>
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-xl leading-relaxed text-slate-300">{hero.subtitle}</p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" onClick={() => navigate('/login')} className="rounded-full bg-white px-8 py-6 text-lg font-semibold text-slate-900 shadow-lg transition-all hover:bg-slate-100 hover:shadow-xl">
            {hero.ctaPrimary}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button size="lg" variant="ghost" onClick={() => document.getElementById('product-tour')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-full px-8 py-6 text-lg font-semibold text-white transition-all hover:bg-white/10">
            {hero.ctaSecondary}
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
          {hero.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-red-300" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <div className="pt-12">
          <div className="relative mx-auto max-w-4xl">
            <div className="rounded-2xl border border-red-500/10 bg-slate-950/55 p-4 shadow-2xl backdrop-blur-sm">
              <div className="rounded-lg border border-slate-700/40 bg-slate-950/90 p-8">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="ml-4 text-xs text-slate-500">app.nanoia.com.br</span>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg border border-red-500/20 bg-gradient-to-br from-red-500/15 to-red-950/10 p-5">
                    <div className="flex items-start justify-between">
                      <div className="text-left">
                        <p className="text-xs uppercase tracking-[0.25em] text-red-200">Resumo financeiro</p>
                        <h3 className="mt-2 text-3xl font-semibold text-white">R$ 24.680,00</h3>
                      </div>
                      <Badge className="border-red-500/20 bg-red-500/15 text-red-200">Operacao saudavel</Badge>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      {[
                        ['Pix recebido', 'R$ 8.400'],
                        ['Cartao empresa', 'R$ 3.280'],
                        ['Contas a vencer', '4 alertas'],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3 text-left">
                          <p className="text-xs text-slate-400">{label}</p>
                          <p className="mt-2 text-lg font-semibold text-white">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ['Pessoal', 'R$ 4.320'],
                      ['Empresa', 'R$ 20.360'],
                      ['IA', '12 sugestoes'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 text-left">
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className="mt-2 text-base font-semibold text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-red-500/20 to-transparent blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
