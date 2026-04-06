import React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import AIVoiceVisualizer from './AIVoiceVisualizer';
import { Mic, MicOff, Send, Volume2 } from 'lucide-react';

const AlfredVoiceAssistant = ({
  chatHistory,
  message,
  setMessage,
  sendingMessage,
  voiceSupported,
  voiceEnabled,
  voiceAwaitingCommand,
  voiceStatus,
  voiceMode,
  toggleVoiceAssistant,
  handleSendMessage
}) => {
  const voiceVisualizerMode = sendingMessage
    ? 'speaking'
    : voiceAwaitingCommand
      ? 'listening'
      : voiceEnabled
        ? 'wake'
        : 'idle';

  const heroTitle = voiceAwaitingCommand
    ? 'Estou ouvindo voce agora'
    : sendingMessage
      ? 'Nano respondendo'
      : voiceEnabled
        ? 'Diga Nano para comecar'
        : 'Ative a escuta para usar o Nano por voz';

  return (
    <div className="mx-auto max-w-6xl">
      <Card className="overflow-hidden border-slate-700/60 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.98))] p-0">
        <div className="border-b border-slate-800/80 px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Nano Assistente</p>
              <h3 className="mt-2 text-3xl font-semibold text-white">Centro de voz e conversa</h3>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Fale com o Nano usando voz ou texto. O backend recebe a transcricao, devolve a resposta e o Nano exibe tudo no chat enquanto sintetiza a fala.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-cyan-400/40 bg-cyan-400/10 text-cyan-100">
                {voiceSupported ? 'Web Speech API pronta' : 'Voz indisponivel'}
              </Badge>
              <Badge variant="outline" className="border-cyan-400/40 bg-cyan-400/10 text-cyan-100">
                {voiceMode === 'openai' ? 'Sintese premium' : 'Sintese local'}
              </Badge>
              <Button
                type="button"
                variant={voiceEnabled ? 'destructive' : 'default'}
                onClick={toggleVoiceAssistant}
                disabled={!voiceSupported}
                className="gap-2 rounded-full"
              >
                {voiceEnabled ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {voiceEnabled ? 'Desativar microfone' : 'Ativar microfone'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-8 px-6 py-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="text-center">
              <AIVoiceVisualizer mode={voiceVisualizerMode} />
              <p className="mt-6 text-lg font-medium text-white">{heroTitle}</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">{voiceStatus}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge variant="outline" className="border-cyan-400/40 bg-cyan-400/10 text-cyan-100">
                {voiceVisualizerMode === 'speaking'
                  ? 'Nano falando'
                  : voiceVisualizerMode === 'listening'
                    ? 'Nano ouvindo'
                    : voiceVisualizerMode === 'wake'
                      ? 'Nano em espera'
                      : 'Interface inativa'}
              </Badge>
              <Badge variant="outline" className="border-cyan-400/40 bg-cyan-400/10 text-cyan-100">
                Wake word: Nano
              </Badge>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 text-cyan-200">
                <Volume2 className="h-4 w-4" />
                Quando houver resposta, o Nano exibe no chat e tenta sintetizar a voz automaticamente.
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">Historico da conversa</p>
                {sendingMessage && (
                  <div className="flex items-center gap-2 text-xs text-cyan-200">
                    <span>Enviando para o Nano</span>
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300" />
                    </div>
                  </div>
                )}
              </div>

              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {chatHistory.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
                    A conversa com o Nano vai aparecer aqui assim que voce enviar uma mensagem ou usar a voz.
                  </div>
                ) : (
                  chatHistory.map((chatMessage, index) => (
                    <div
                      key={chatMessage.id || `${chatMessage.role}-${index}`}
                      className={`rounded-2xl border p-4 text-sm leading-7 ${
                        chatMessage.role === 'user'
                          ? 'ml-6 border-cyan-400/20 bg-cyan-400/12 text-white'
                          : 'mr-6 border-white/10 bg-white/[0.04] text-slate-200'
                      }`}
                    >
                      <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                        {chatMessage.role === 'user' ? 'Voce' : 'Nano'}
                      </div>
                      <div className="whitespace-pre-wrap">{chatMessage.content}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <form onSubmit={handleSendMessage} className="rounded-[28px] border border-white/10 bg-slate-950/45 p-4">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                className="border-0 bg-transparent px-0 text-white placeholder:text-slate-500 focus-visible:ring-0"
                placeholder="Digite aqui o que voce quer que o Nano faca"
              />

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-slate-700 px-3 py-1">Fallback por texto ativo</span>
                  <span className="rounded-full border border-slate-700 px-3 py-1">Tema escuro responsivo</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 rounded-full border-slate-700 bg-slate-900/70 text-white hover:bg-slate-800"
                    onClick={toggleVoiceAssistant}
                    disabled={!voiceSupported}
                  >
                    {voiceEnabled ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {voiceEnabled ? 'Microfone ligado' : 'Ativar voz'}
                  </Button>
                  <Button
                    type="submit"
                    disabled={sendingMessage || !message.trim()}
                    className="gap-2 rounded-full px-6"
                  >
                    <Send className="h-4 w-4" />
                    Enviar texto
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AlfredVoiceAssistant;
