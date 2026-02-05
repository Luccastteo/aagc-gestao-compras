'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from '@/lib/api';
import { Building2, Mail, Phone, MessageCircle, Clock, Star, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';

const qualidadeLabels: Record<string, string> = {
  // pt-BR (seed)
  excelente: 'Excelente',
  bom: 'Bom',
  ok: 'OK',
  ruim: 'Ruim',
  // legacy/en
  excellent: 'Excelente',
  good: 'Bom',
  average: 'Regular',
  poor: 'Ruim',
};

const qualidadeColors: Record<string, string> = {
  excelente: 'text-green-500',
  bom: 'text-blue-500',
  ok: 'text-gray-300',
  ruim: 'text-red-500',
  excellent: 'text-green-500',
  good: 'text-blue-500',
  average: 'text-yellow-500',
  poor: 'text-red-500',
};

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  const { data: suppliersResponse, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: suppliersApi.getAll,
  });

  // `GET /suppliers` é paginado no backend (retorna { data, pagination })
  const suppliers = suppliersResponse?.data || [];

  const [createError, setCreateError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: suppliersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setShowCreateModal(false);
      setCreateError(null);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message;
      setCreateError(
        Array.isArray(message) ? message.join(', ') : message || 'Erro ao criar fornecedor'
      );
    },
  });

  const [updateError, setUpdateError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => suppliersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setEditingSupplier(null);
      setUpdateError(null);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message;
      setUpdateError(
        Array.isArray(message) ? message.join(', ') : message || 'Erro ao atualizar fornecedor'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: suppliersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const payload = {
      codigo: formData.get('codigo'),
      nome: formData.get('nome'),
      cnpj: formData.get('cnpj') || undefined,
      email: formData.get('email') || undefined,
      telefone: formData.get('telefone') || undefined,
      whatsapp: formData.get('whatsapp') || undefined,
    };

    createMutation.mutate(payload);
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSupplier) return;

    const formData = new FormData(e.currentTarget);

    const payload = {
      nome: formData.get('nome'),
      cnpj: formData.get('cnpj') || undefined,
      email: formData.get('email') || undefined,
      telefone: formData.get('telefone') || undefined,
      whatsapp: formData.get('whatsapp') || undefined,
    };

    updateMutation.mutate({ id: editingSupplier.id, data: payload });
  };

  const handleDelete = (id: string, nome: string) => {
    if (confirm(`Confirma exclusão do fornecedor "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="w-8 h-8" />
            Fornecedores
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie sua base de fornecedores</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Novo Fornecedor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suppliers.map((supplier: any) => (
          <div key={supplier.id} className="p-6 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{supplier.nome}</h3>
                <p className="text-sm text-muted-foreground">Código: {supplier.codigo}</p>
              </div>
              <div className="flex items-center gap-1">
                <Star className={`w-4 h-4 ${qualidadeColors[supplier.qualidade] || 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${qualidadeColors[supplier.qualidade] || 'text-gray-400'}`}>
                  {qualidadeLabels[supplier.qualidade] || supplier.qualidade}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {supplier.cnpj && (
                <p className="text-muted-foreground">CNPJ: {supplier.cnpj}</p>
              )}
              
              {supplier.email && (
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  {supplier.email}
                </p>
              )}
              
              {supplier.telefone && (
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {supplier.telefone}
                </p>
              )}
              
              {supplier.whatsapp && (
                <p className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  WhatsApp: {supplier.whatsapp}
                </p>
              )}

              <div className="pt-2 border-t border-border mt-2">
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Prazo Médio: <span className="font-medium">{supplier.prazoMedioDias} dias</span>
                </p>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                <button
                  onClick={() => setEditingSupplier(supplier)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(supplier.id, supplier.nome)}
                  className="flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Criar Fornecedor</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-md text-red-500 text-sm" role="alert">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="supplier-codigo" className="text-sm font-medium">Código *</label>
                <input
                  id="supplier-codigo"
                  name="codigo"
                  required
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                />
              </div>
              <div>
                <label htmlFor="supplier-nome" className="text-sm font-medium">Nome *</label>
                <input
                  id="supplier-nome"
                  name="nome"
                  required
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                />
              </div>
              <div>
                <label htmlFor="supplier-cnpj" className="text-sm font-medium">CNPJ</label>
                <input
                  id="supplier-cnpj"
                  name="cnpj"
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                />
              </div>
              <div>
                <label htmlFor="supplier-email" className="text-sm font-medium">E-mail</label>
                <input
                  id="supplier-email"
                  name="email"
                  type="email"
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="supplier-telefone" className="text-sm font-medium">Telefone</label>
                  <input
                    id="supplier-telefone"
                    name="telefone"
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="supplier-whatsapp" className="text-sm font-medium">WhatsApp</label>
                  <input
                    id="supplier-whatsapp"
                    name="whatsapp"
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-secondary rounded-md hover:bg-secondary/80"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Editar Fornecedor</h2>
              <button
                onClick={() => setEditingSupplier(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {updateError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-md text-red-500 text-sm" role="alert">
                {updateError}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label htmlFor="edit-supplier-codigo" className="text-sm font-medium">Código</label>
                <input
                  id="edit-supplier-codigo"
                  value={editingSupplier.codigo}
                  disabled
                  className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-input rounded-md opacity-70 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">Código não pode ser alterado</p>
              </div>
              <div>
                <label htmlFor="edit-supplier-nome" className="text-sm font-medium">Nome *</label>
                <input
                  id="edit-supplier-nome"
                  name="nome"
                  defaultValue={editingSupplier.nome}
                  required
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                />
              </div>
              <div>
                <label htmlFor="edit-supplier-cnpj" className="text-sm font-medium">CNPJ</label>
                <input
                  id="edit-supplier-cnpj"
                  name="cnpj"
                  defaultValue={editingSupplier.cnpj || ''}
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                />
              </div>
              <div>
                <label htmlFor="edit-supplier-email" className="text-sm font-medium">E-mail</label>
                <input
                  id="edit-supplier-email"
                  name="email"
                  type="email"
                  defaultValue={editingSupplier.email || ''}
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-supplier-telefone" className="text-sm font-medium">Telefone</label>
                  <input
                    id="edit-supplier-telefone"
                    name="telefone"
                    defaultValue={editingSupplier.telefone || ''}
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="edit-supplier-whatsapp" className="text-sm font-medium">WhatsApp</label>
                  <input
                    id="edit-supplier-whatsapp"
                    name="whatsapp"
                    defaultValue={editingSupplier.whatsapp || ''}
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className="px-4 py-2 bg-secondary rounded-md hover:bg-secondary/80"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
