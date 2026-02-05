'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Brain, Send, Sparkles, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ id: string; title: string; type: string; similarity?: number }>;
}

export default function AIPage() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const chatMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await api.post('/ai/chat', { question: q });
      return res.data;
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: question },
        { role: 'assistant', content: data.answer, sources: data.sources },
      ]);
      setQuestion('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      chatMutation.mutate(question);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Brain className="w-8 h-8 text-primary" />
          Assistente de IA
        </h1>
        <p className="text-muted-foreground mt-1">
          Consulte políticas, histórico e decisões de compra usando inteligência artificial
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">LLM Powered</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            GPT-4 Turbo para análise contextual e respostas naturais
          </p>
        </div>

        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold">RAG System</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Busca semântica na base de conhecimento interna
          </p>
        </div>

        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold">Decision Engine</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Motor de decisão autônomo com ML + regras de negócio
          </p>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Messages */}
        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground mt-20">
              <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Como posso ajudar?</p>
              <p className="text-sm">
                Pergunte sobre políticas de compras, histórico de fornecedores, decisões anteriores, etc.
              </p>
              <div className="mt-6 text-left max-w-md mx-auto space-y-2">
                <p className="text-xs font-semibold">Exemplos:</p>
                <ul className="text-xs space-y-1">
                  <li>• "Qual é a política de aprovação automática?"</li>
                  <li>• "Como funciona a escolha de fornecedores?"</li>
                  <li>• "Qual o histórico de compras do item ROL-6205?"</li>
                </ul>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl p-4 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  
                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Fontes consultadas:
                      </p>
                      <ul className="text-xs space-y-1">
                        {msg.sources.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>
                              {s.title}
                              {s.similarity && (
                                <span className="text-muted-foreground ml-1">
                                  ({(s.similarity * 100).toFixed(0)}% relevância)
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-secondary/30">
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Digite sua pergunta..."
              className="flex-1 px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={chatMutation.isPending}
            />
            <button
              type="submit"
              disabled={chatMutation.isPending || !question.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {chatMutation.isPending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>

      {/* Info Footer */}
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-yellow-500 mb-1">Importante:</p>
          <p className="text-muted-foreground">
            O assistente responde baseado na base de conhecimento interna. Para adicionar novos
            documentos, políticas ou manuais, acesse a seção de Configurações.
          </p>
        </div>
      </div>
    </div>
  );
}
