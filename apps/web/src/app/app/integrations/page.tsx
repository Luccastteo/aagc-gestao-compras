'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { 
  Bell, Mail, MessageCircle, Phone, 
  Send, History, CheckCircle2,
  AlertCircle, Zap, Bot
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const tipoLabels: Record<string, string> = {
  EMAIL: 'E-mail',
  WHATSAPP: 'WhatsApp',
  SMS: 'SMS',
};

const tipoIcons: Record<string, any> = {
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
  SMS: Phone,
};

const statusColors: Record<string, string> = {
  SENT: 'text-green-500',
  SIMULATED: 'text-blue-500',
  FAILED: 'text-red-500',
};

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [showTestModal, setShowTestModal] = useState(false);
  const [testForm, setTestForm] = useState({ email: '', whatsapp: '', sms: '' });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['notifications', 'history'],
    queryFn: notificationsApi.getHistory,
  });

  const { data: stats } = useQuery({
    queryKey: ['notifications', 'stats'],
    queryFn: notificationsApi.getStats,
  });

  const { data: settings } = useQuery({
    queryKey: ['notifications', 'settings'],
    queryFn: notificationsApi.getSettings,
  });

  const testMutation = useMutation({
    mutationFn: notificationsApi.test,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setShowTestModal(false);
      setTestForm({ email: '', whatsapp: '', sms: '' });
    },
  });

  const handleTest = () => {
    const params: any = {};
    if (testForm.email) params.email = testForm.email;
    if (testForm.whatsapp) params.whatsapp = testForm.whatsapp;
    if (testForm.sms) params.sms = testForm.sms;
    
    if (Object.keys(params).length === 0) {
      alert('Preencha pelo menos um canal de notificação');
      return;
    }
    
    testMutation.mutate(params);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bell className="w-8 h-8" />
          Integrações e Notificações
        </h1>
        <p className="text-muted-foreground mt-1">
          Configurações de SMS, WhatsApp e E-mail
        </p>
      </div>

      {/* Agent Info */}
      <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium">Notificações Automáticas do Agente</p>
            <p className="text-sm text-muted-foreground">
              O agente AAGC envia notificações automaticamente quando cards são movidos no Kanban
              ou quando pedidos de compra mudam de status.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-primary" />
            <p className="text-sm text-muted-foreground">Total Enviadas</p>
          </div>
          <p className="text-2xl font-bold">{stats?.total || 0}</p>
        </div>
        
        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-blue-500" />
            <p className="text-sm text-muted-foreground">E-mails</p>
          </div>
          <p className="text-2xl font-bold">{stats?.byType?.EMAIL || 0}</p>
        </div>
        
        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-green-500" />
            <p className="text-sm text-muted-foreground">WhatsApp</p>
          </div>
          <p className="text-2xl font-bold">{stats?.byType?.WHATSAPP || 0}</p>
        </div>
        
        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4 text-purple-500" />
            <p className="text-sm text-muted-foreground">SMS</p>
          </div>
          <p className="text-2xl font-bold">{stats?.byType?.SMS || 0}</p>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Email */}
        <div className="p-6 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Mail className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold">E-mail</h3>
              <p className="text-sm text-muted-foreground">
                {settings?.emailEnabled ? 'Ativo' : 'Inativo'}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Envia notificações por e-mail para fornecedores e responsáveis.
          </p>
          <div className="text-xs text-muted-foreground p-2 bg-secondary rounded">
            Provedor: {settings?.emailProvider || 'Simulado'}
          </div>
        </div>

        {/* WhatsApp */}
        <div className="p-6 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <MessageCircle className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold">WhatsApp</h3>
              <p className="text-sm text-muted-foreground">
                {settings?.whatsappEnabled ? 'Ativo' : 'Inativo'}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Envia mensagens WhatsApp para fornecedores cadastrados.
          </p>
          <div className="text-xs text-muted-foreground p-2 bg-secondary rounded">
            Provedor: {settings?.whatsappProvider || 'Simulado'}
          </div>
        </div>

        {/* SMS */}
        <div className="p-6 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Phone className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold">SMS</h3>
              <p className="text-sm text-muted-foreground">
                {settings?.smsEnabled ? 'Ativo' : 'Inativo'}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Envia SMS para notificações urgentes.
          </p>
          <div className="text-xs text-muted-foreground p-2 bg-secondary rounded">
            Provedor: {settings?.smsProvider || 'Simulado'}
          </div>
        </div>
      </div>

      {/* Test Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowTestModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Send className="w-4 h-4" />
          Testar Notificações
        </button>
      </div>

      {/* Notification History */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <History className="w-5 h-5" />
          Histórico de Notificações
        </h2>
        
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Data/Hora</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Canal</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Destinatário</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Assunto</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : history?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma notificação enviada ainda
                  </td>
                </tr>
              ) : (
                history?.map((log: any) => {
                  const Icon = tipoIcons[log.tipo] || Bell;
                  return (
                    <tr key={log.id} className="border-t border-border hover:bg-secondary/50">
                      <td className="px-4 py-3 text-sm">
                        {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {tipoLabels[log.tipo] || log.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{log.destinatario}</td>
                      <td className="px-4 py-3 text-sm">{log.assunto || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`flex items-center gap-1 ${statusColors[log.status]}`}>
                          {log.status === 'SIMULATED' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Simulado
                            </>
                          ) : log.status === 'SENT' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Enviado
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4" />
                              Falhou
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md border border-border">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Send className="w-5 h-5" />
              Testar Notificações
            </h2>
            
            <p className="text-sm text-muted-foreground mb-4">
              Preencha os campos abaixo para enviar notificações de teste.
              Deixe em branco para não enviar por aquele canal.
            </p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="test-email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  E-mail
                </label>
                <input
                  id="test-email"
                  type="email"
                  value={testForm.email}
                  onChange={(e) => setTestForm({ ...testForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                />
              </div>
              
              <div>
                <label htmlFor="test-whatsapp" className="text-sm font-medium flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  WhatsApp
                </label>
                <input
                  id="test-whatsapp"
                  type="text"
                  value={testForm.whatsapp}
                  onChange={(e) => setTestForm({ ...testForm, whatsapp: e.target.value })}
                  placeholder="5511999999999"
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                />
              </div>
              
              <div>
                <label htmlFor="test-sms" className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4 text-purple-500" />
                  SMS
                </label>
                <input
                  id="test-sms"
                  type="text"
                  value={testForm.sms}
                  onChange={(e) => setTestForm({ ...testForm, sms: e.target.value })}
                  placeholder="5511999999999"
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                />
              </div>
            </div>
            
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 bg-secondary rounded-md hover:bg-secondary/80"
              >
                Cancelar
              </button>
              <button
                onClick={handleTest}
                disabled={testMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {testMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Teste
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
