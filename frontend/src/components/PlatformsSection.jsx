import React from 'react';
import { mockData } from '../data/mock';
import { Monitor, Smartphone, MessageCircle, Send, Calendar, Mic } from 'lucide-react';

const iconMap = {
  Monitor,
  Smartphone,
  MessageCircle,
  Send,
  Calendar,
  Mic
};

const PlatformsSection = () => {
  const { platforms } = mockData;

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-white">O Alfred </span>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              sempre está com você
            </span>
          </h2>
          <p className="text-xl text-slate-400">
            Ele te ajuda onde você estiver.
          </p>
        </div>

        {/* Platforms grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {platforms.map((platform, index) => {
            const Icon = iconMap[platform.icon];
            return (
              <div
                key={index}
                className="group relative bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/50 hover:border-cyan-500/30 transition-all hover:scale-105 cursor-pointer"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-all">
                    <Icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors text-center">
                    {platform.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrolling platforms ticker */}
        <div className="relative overflow-hidden py-8">
          <div className="flex gap-8 animate-scroll">
            {[...platforms, ...platforms, ...platforms].map((platform, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-slate-800/20 px-6 py-3 rounded-full border border-slate-700/30 whitespace-nowrap"
              >
                {React.createElement(iconMap[platform.icon], { className: 'w-4 h-4 text-cyan-400' })}
                <span className="text-sm text-slate-400">{platform.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Product mockup */}
        <div className="mt-16 relative">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Desktop mockup */}
              <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/30">
                <div className="aspect-video bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/20" />
                <div className="mt-4 text-center text-sm text-slate-400">Desktop</div>
              </div>
              {/* Mobile mockup */}
              <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/30">
                <div className="aspect-[9/16] max-w-[200px] mx-auto bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20" />
                <div className="mt-4 text-center text-sm text-slate-400">iOS & Android</div>
              </div>
            </div>
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent blur-3xl -z-10" />
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>
    </section>
  );
};

export default PlatformsSection;
