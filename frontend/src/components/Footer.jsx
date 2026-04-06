import React from 'react';
import { Calendar, MessageCircle, Mic, Send } from 'lucide-react';
import NanoMark from './NanoMark';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 grid gap-12 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <NanoMark className="h-10 w-10" />
              <div className="bg-gradient-to-r from-red-300 to-amber-300 bg-clip-text text-2xl font-bold text-transparent">Nano IA</div>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              O assistente financeiro inteligente que organiza sua rotina pessoal e empresarial.
            </p>
            <div className="flex gap-3">
              {[MessageCircle, Send, Calendar].map((Icon, index) => (
                <div key={index} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-800/50 text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-300">
                  <Icon className="h-4 w-4" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">Produto</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="transition-colors hover:text-red-300">Funcionalidades</a></li>
              <li><a href="#" className="transition-colors hover:text-red-300">Precos</a></li>
              <li><a href="#" className="transition-colors hover:text-red-300">Integracoes</a></li>
              <li><a href="#" className="transition-colors hover:text-red-300">Roadmap</a></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">Empresa</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="transition-colors hover:text-red-300">Sobre</a></li>
              <li><a href="#" className="transition-colors hover:text-red-300">Blog</a></li>
              <li><a href="#" className="transition-colors hover:text-red-300">Carreiras</a></li>
              <li><a href="#" className="transition-colors hover:text-red-300">Contato</a></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">Suporte</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="transition-colors hover:text-red-300">Central de ajuda</a></li>
              <li><a href="#" className="transition-colors hover:text-red-300">Documentacao</a></li>
              <li><a href="#" className="transition-colors hover:text-red-300">Tutoriais</a></li>
              <li><a href="#" className="transition-colors hover:text-red-300">Status</a></li>
            </ul>
          </div>
        </div>

        <div className="mb-8 border-t border-slate-800 pt-8">
          <div className="mb-4 text-center text-sm text-slate-400">Disponivel em</div>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/30 px-4 py-2">
              <MessageCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-300">WhatsApp</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/30 px-4 py-2">
              <Send className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-slate-300">Telegram</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/30 px-4 py-2">
              <Calendar className="h-4 w-4 text-red-300" />
              <span className="text-sm text-slate-300">Google Calendar</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/30 px-4 py-2">
              <Mic className="h-4 w-4 text-red-300" />
              <span className="text-sm text-slate-300">Voice</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-slate-400 md:flex-row">
            <div>&copy; {currentYear} Nano IA. Todos os direitos reservados.</div>
            <div className="flex gap-6">
              <a href="#" className="transition-colors hover:text-red-300">Termos de Uso</a>
              <a href="#" className="transition-colors hover:text-red-300">Privacidade</a>
              <a href="#" className="transition-colors hover:text-red-300">Cookies</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
