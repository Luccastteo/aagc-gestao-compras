'use client';

import { useQuery } from '@tanstack/react-query';
import { suppliersApi } from '@/lib/api';
import { Building2, Mail, Phone, MessageCircle, Clock, Star } from 'lucide-react';

const qualidadeLabels: Record<string, string> = {
  excellent: 'Excelente',
  good: 'Bom',
  average: 'Regular',
  poor: 'Ruim',
};

const qualidadeColors: Record<string, string> = {
  excellent: 'text-green-500',
  good: 'text-blue-500',
  average: 'text-yellow-500',
  poor: 'text-red-500',
};

export default function SuppliersPage() {
  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: suppliersApi.getAll,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Building2 className="w-8 h-8" />
          Fornecedores
        </h1>
        <p className="text-muted-foreground mt-1">Gerencie sua base de fornecedores</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suppliers?.map((supplier: any) => (
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
