'use client';

import { useEffect } from 'react';
import { X, Loader2, CheckCircle2 } from 'lucide-react';

export type AnalyzePopupStatus = 'running' | 'completed' | 'error';

interface AnalyzeStockPopupProps {
  taskId: string;
  status: AnalyzePopupStatus;
  progress: number;
  onClose: () => void;
  errorMessage?: string | null;
}

const MESSAGE_RUNNING =
  'Simulando sugestões de reposição de estoque usando previsão de demanda por IA...';

export function AnalyzeStockPopup({
  taskId,
  status,
  progress,
  onClose,
  errorMessage,
}: AnalyzeStockPopupProps) {
  // Auto-close after showing "Análise concluída" for a short time
  useEffect(() => {
    if (status !== 'completed') return;
    const t = setTimeout(() => {
      onClose();
    }, 1800);
    return () => clearTimeout(t);
  }, [status, onClose]);

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[380px] rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
      role="status"
      aria-live="polite"
      aria-label={
        status === 'completed'
          ? 'Análise de estoque concluída'
          : status === 'error'
            ? 'Erro na análise de estoque'
            : 'Tarefa de análise de estoque em execução'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          {/* Ícone: spinner quando running, check quando completed */}
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              status === 'completed'
                ? 'bg-emerald-100 text-emerald-600'
                : status === 'error'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-primary-100 text-primary-600'
            }`}
          >
            {status === 'completed' ? (
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            ) : status === 'error' ? (
              <span className="text-lg font-bold">!</span>
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-800">
                Tarefa BullMQ: #{taskId}-INV
              </span>
              {status === 'running' && (
                <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-700">
                  Em execução
                </span>
              )}
              {status === 'completed' && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  Concluída
                </span>
              )}
              {status === 'error' && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                  Erro
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {status === 'completed'
                ? 'Análise concluída.'
                : status === 'error'
                  ? errorMessage || 'Falha ao analisar estoque.'
                  : MESSAGE_RUNNING}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Fechar notificação"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Barra de progresso: só quando running ou completed (100%) */}
      {(status === 'running' || status === 'completed') && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary-600 transition-all duration-300 ease-out"
              style={{ width: `${status === 'completed' ? 100 : progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
