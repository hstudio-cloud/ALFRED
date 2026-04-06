import React from 'react';
import { Clock } from 'lucide-react';
import { mockData } from '../data/mock';

const TimelineSection = () => {
  const { timeline } = mockData;

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold text-white md:text-5xl">Um dia com o Nano IA</h2>
        </div>
        <div className="relative">
          <div className="absolute bottom-0 left-8 top-0 w-px bg-gradient-to-b from-red-500/50 via-red-700/40 to-amber-300/30 md:left-1/2" />
          <div className="space-y-12">
            {timeline.map((item, index) => (
              <div key={index} className={`relative flex items-start gap-8 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                <div className="absolute left-8 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border-4 border-slate-900 bg-gradient-to-br from-red-500 to-red-700 shadow-lg md:left-1/2">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div className={`w-full pl-20 md:w-5/12 md:pl-0 ${index % 2 === 0 ? 'md:pr-16 md:text-right' : 'md:pl-16'}`}>
                  <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm transition-all hover:border-red-500/30 hover:bg-slate-800/50">
                    <div className="mb-2 text-sm font-bold text-red-300">{item.time}</div>
                    <h3 className="mb-3 text-2xl font-bold text-white">{item.title}</h3>
                    <p className="leading-relaxed text-slate-400">{item.description}</p>
                  </div>
                </div>
                <div className="hidden w-5/12 md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TimelineSection;
