/**
 * NanoOperationalBriefing.jsx
 * Briefing operacional do dia - mostra insights e recomendações
 * Foco: central operacional da IA, não nos cards
 */

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  TrendingDown,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  Clock,
  Target,
} from 'lucide-react';
import { TIMING, NANO_COLORS, staggerDelay } from '../lib/nanoAnimations';
import { Card } from './ui/card';

const NanoOperationalBriefing = ({ data = null, isLoading = false }) => {
  const [briefingItems, setBriefingItems] = useState([]);

  useEffect(() => {
    // Simula dados se não fornecidos
    const defaultData = {
      topExpense: {
        category: 'Combustível',
        amount: '245,00',
        trend: 'up',
      },
      upcomingBills: 2,
      nextPayment: {
        name: 'Conta Internet',
        days: 3,
        amount: '149,00',
      },
      balanceStatus: {
        current: 'melhor',
        percentage: '+12%',
        period: 'mês passado',
      },
      recommendations: [
        {
          type: 'automation',
          text: 'Criar automação para pagamento recorrente',
          priority: 'high',
        },
        {
          type: 'insight',
          text: 'Gastos com alimentação acima da média',
          priority: 'medium',
        },
      ],
    };

    const items = data || defaultData;

    const briefingList = [
      {
        id: 'top-expense',
        type: 'alert',
        icon: TrendingDown,
        title: 'Maior gasto',
        description: `${items.topExpense.category}: R$ ${items.topExpense.amount}`,
        accent: 'red',
      },
      {
        id: 'upcoming-bills',
        type: 'attention',
        icon: AlertCircle,
        title: 'Próximos vencimentos',
        description: `${items.upcomingBills} cobrança${items.upcomingBills !== 1 ? 's' : ''} pendente${items.upcomingBills !== 1 ? 's' : ''}`,
        accent: 'orange',
      },
      {
        id: 'next-payment',
        type: 'info',
        icon: Clock,
        title: 'Próximo pagamento',
        description: `${items.nextPayment.name} em ${items.nextPayment.days} dias`,
        accent: 'blue',
      },
      {
        id: 'balance-status',
        type: 'success',
        icon: CheckCircle2,
        title: 'Situação financeira',
        description: `Saldo ${items.balanceStatus.current} ${items.balanceStatus.percentage} vs ${items.balanceStatus.period}`,
        accent: 'green',
      },
      ...items.recommendations.map((rec, idx) => ({
        id: `recommendation-${idx}`,
        type: 'recommendation',
        icon: Lightbulb,
        title: 'Recomendação',
        description: rec.text,
        accent: 'gold',
        priority: rec.priority,
      })),
    ];

    setBriefingItems(briefingList);
  }, [data]);

  const getAccentColor = (accent) => {
    const colors = {
      red: 'from-red-500/10 to-red-500/5 border-red-500/30 text-red-200',
      orange: 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/30 text-yellow-200',
      blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/30 text-blue-200',
      green: 'from-green-500/10 to-green-500/5 border-green-500/30 text-green-200',
      gold: 'from-yellow-600/10 to-yellow-600/5 border-yellow-600/30 text-yellow-300',
    };
    return colors[accent] || colors.red;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-slate-800/20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header do briefing */}
      <motion.div
        className="flex items-center justify-between rounded-lg bg-gradient-to-r from-slate-900/40 to-slate-800/20 border border-slate-700/30 px-4 py-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-red-400" />
          <span className="text-sm font-semibold text-white">Briefing do Nano</span>
        </div>
        <span className="text-xs text-slate-400">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </motion.div>

      {/* Items de briefing */}
      <AnimatePresence>
        {briefingItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.id}
              className={`rounded-lg border bg-gradient-to-r ${getAccentColor(item.accent)} p-4 backdrop-blur-sm transition-all hover:shadow-lg`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{
                duration: 0.3,
                delay: staggerDelay(idx, 80),
                ease: 'easeOut',
              }}
              whileHover={{ scale: 1.02, marginRight: 8 }}
            >
              <div className="flex items-start gap-3">
                {/* Ícone */}
                <div className="mt-0.5">
                  <Icon className="h-5 w-5" />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold uppercase tracking-wide opacity-75">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-sm font-medium leading-snug">{item.description}</p>

                  {/* Priority tag para recomendações */}
                  {item.priority && (
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          item.priority === 'high'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}
                      >
                        {item.priority === 'high' ? 'Importante' : 'Sugestão'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Ação (opcional) */}
                {item.type === 'recommendation' && (
                  <motion.button
                    className="flex-shrink-0 rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white hover:bg-white/20 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Agir
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Footer */}
      {briefingItems.length > 0 && (
        <motion.div
          className="text-xs text-slate-500 text-center pt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          O Nano acompanha você 24/7
        </motion.div>
      )}
    </motion.div>
  );
};

export default NanoOperationalBriefing;
