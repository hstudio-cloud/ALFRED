import React from "react";
import {
  Calendar,
  MessageCircle,
  Mic,
  Monitor,
  Send,
  Smartphone,
} from "lucide-react";
import { mockData } from "../data/mock";

const iconMap = { Monitor, Smartphone, MessageCircle, Send, Calendar, Mic };

const PlatformsSection = () => {
  const { platforms } = mockData;

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center space-y-4">
          <h2 className="text-4xl font-bold md:text-5xl">
            <span className="text-white">O Nano </span>
            <span className="bg-gradient-to-r from-red-300 to-amber-300 bg-clip-text text-transparent">
              sempre esta com você
            </span>
          </h2>
          <p className="text-xl text-slate-400">
            Ele te ajuda onde você estiver.
          </p>
        </div>

        <div className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {platforms.map((platform, index) => {
            const Icon = iconMap[platform.icon];
            return (
              <div
                key={index}
                className="group rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 transition-all hover:scale-105 hover:border-red-500/30 hover:bg-slate-800/50"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-500/20 to-amber-500/10">
                    <Icon className="h-6 w-6 text-red-300" />
                  </div>
                  <span className="text-center text-sm font-medium text-slate-300 group-hover:text-white">
                    {platform.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PlatformsSection;
