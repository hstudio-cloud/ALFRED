import React from 'react';
import { MessageCircle, Send, Calendar, Mic } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Nano Assistente
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              O assistente financeiro inteligente que organiza sua rotina pessoal e empresarial.
            </p>
            {/* Social links - placeholder */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800/50 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-800/50 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer">
                <Send className="w-4 h-4" />
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-800/50 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold mb-4">Produto</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">Funcionalidades</a></li>
              <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">Preços</a></li>
              <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">Integrações</a></li>
              <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">Roadmap</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Empresa</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">Sobre</a></li>
              <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">Blog</a></li>
              <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">Carreiras</a></li>
              <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">Contato</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">Suporte</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">Central de Ajuda</a></li>
              <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">Documentação</a></li>
              <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">Tutoriais</a></li>
              <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">Status</a></li>
            </ul>
          </div>
        </div>

        {/* Platforms */}
        <div className="border-t border-slate-800 pt-8 mb-8">
          <div className="text-center mb-4">
            <span className="text-slate-400 text-sm">Disponível em</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800/30 px-4 py-2 rounded-full border border-slate-700/50">
              <MessageCircle className="w-4 h-4 text-green-400" />
              <span className="text-slate-300 text-sm">WhatsApp</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/30 px-4 py-2 rounded-full border border-slate-700/50">
              <Send className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300 text-sm">Telegram</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/30 px-4 py-2 rounded-full border border-slate-700/50">
              <Calendar className="w-4 h-4 text-red-400" />
              <span className="text-slate-300 text-sm">Google Calendar</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/30 px-4 py-2 rounded-full border border-slate-700/50">
              <Mic className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-300 text-sm">Alexa</span>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
            <div>
              &copy; {currentYear} Nano Assistente. Todos os direitos reservados.
            </div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-cyan-400 transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Privacidade</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
