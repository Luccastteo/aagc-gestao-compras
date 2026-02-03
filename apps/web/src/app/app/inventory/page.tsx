'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '@/lib/api';
import { 
  Plus, AlertCircle, CheckCircle, Bot, 
  Download, Upload, FileSpreadsheet, X,
  FileDown, FileUp, CheckCircle2, FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateInventoryReportPDF } from '@/lib/pdf';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAnalyze, setShowAnalyze] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: itemsApi.getAll,
  });

  const { data: analysis, isLoading: isAnalyzing } = useQuery({
    queryKey: ['items', 'analyze'],
    queryFn: itemsApi.analyze,
    enabled: showAnalyze,
  });

  const createMutation = useMutation({
    mutationFn: itemsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setShowCreateModal(false);
    },
  });

  const [importError, setImportError] = useState<string | null>(null);
  
  const importMutation = useMutation({
    mutationFn: itemsApi.importExcel,
    onSuccess: (result) => {
      setImportResult(result);
      setImportError(null);
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
    onError: (error: any) => {
      console.error('Import error:', error);
      setImportError(error.response?.data?.message || error.message || 'Erro ao importar dados');
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      sku: formData.get('sku'),
      descricao: formData.get('descricao'),
      categoria: formData.get('categoria'),
      unidade: formData.get('unidade') || 'UN',
      saldo: parseInt(formData.get('saldo') as string) || 0,
      minimo: parseInt(formData.get('minimo') as string) || 0,
      maximo: parseInt(formData.get('maximo') as string) || 100,
      leadTimeDays: parseInt(formData.get('leadTimeDays') as string) || 7,
      custoUnitario: parseFloat(formData.get('custoUnitario') as string) || 0,
      localizacao: formData.get('localizacao'),
    };
    createMutation.mutate(data);
  };

  // Export to Excel
  const handleExport = async () => {
    try {
      const result = await itemsApi.exportExcel();
      
      const worksheet = XLSX.utils.json_to_sheet(result.data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Estoque');
      
      // Auto-size columns
      const colWidths = Object.keys(result.data[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      worksheet['!cols'] = colWidths;
      
      XLSX.writeFile(workbook, result.filename);
    } catch (error) {
      console.error('Export error:', error);
      alert('Erro ao exportar dados');
    }
  };

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const result = await itemsApi.getTemplate();
      
      const worksheet = XLSX.utils.json_to_sheet(result.template);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
      
      XLSX.writeFile(workbook, 'template_importacao_estoque.xlsx');
    } catch (error) {
      console.error('Template error:', error);
      alert('Erro ao baixar template');
    }
  };

  // Normaliza nomes de colunas para o padrão esperado
  const normalizeColumnNames = (data: any[]): any[] => {
    const columnMappings: Record<string, string> = {
      // SKU variations
      'sku': 'SKU',
      'Sku': 'SKU',
      'codigo': 'SKU',
      'Codigo': 'SKU',
      'CODIGO': 'SKU',
      'código': 'SKU',
      'Código': 'SKU',
      'cod': 'SKU',
      'Cod': 'SKU',
      'COD': 'SKU',
      // Description variations
      'descricao': 'Descricao',
      'Descrição': 'Descricao',
      'descrição': 'Descricao',
      'DESCRICAO': 'Descricao',
      'DESCRIÇÃO': 'Descricao',
      'nome': 'Descricao',
      'Nome': 'Descricao',
      'NOME': 'Descricao',
      'produto': 'Descricao',
      'Produto': 'Descricao',
      'PRODUTO': 'Descricao',
      // Estoque variations
      'estoque': 'Estoque_Atual',
      'Estoque': 'Estoque_Atual',
      'ESTOQUE': 'Estoque_Atual',
      'saldo': 'Estoque_Atual',
      'Saldo': 'Estoque_Atual',
      'SALDO': 'Estoque_Atual',
      'quantidade': 'Estoque_Atual',
      'Quantidade': 'Estoque_Atual',
      'QUANTIDADE': 'Estoque_Atual',
      'qtd': 'Estoque_Atual',
      'Qtd': 'Estoque_Atual',
      'QTD': 'Estoque_Atual',
      // Minimo variations
      'minimo': 'Estoque_Minimo',
      'Minimo': 'Estoque_Minimo',
      'MINIMO': 'Estoque_Minimo',
      'mínimo': 'Estoque_Minimo',
      'Mínimo': 'Estoque_Minimo',
      'min': 'Estoque_Minimo',
      'Min': 'Estoque_Minimo',
      'MIN': 'Estoque_Minimo',
      // Maximo variations
      'maximo': 'Estoque_Maximo',
      'Maximo': 'Estoque_Maximo',
      'MAXIMO': 'Estoque_Maximo',
      'máximo': 'Estoque_Maximo',
      'Máximo': 'Estoque_Maximo',
      'max': 'Estoque_Maximo',
      'Max': 'Estoque_Maximo',
      'MAX': 'Estoque_Maximo',
      // Custo variations
      'custo': 'Custo_Unitario',
      'Custo': 'Custo_Unitario',
      'CUSTO': 'Custo_Unitario',
      'preco': 'Custo_Unitario',
      'Preco': 'Custo_Unitario',
      'PRECO': 'Custo_Unitario',
      'preço': 'Custo_Unitario',
      'Preço': 'Custo_Unitario',
      'valor': 'Custo_Unitario',
      'Valor': 'Custo_Unitario',
      'VALOR': 'Custo_Unitario',
      // Categoria
      'categoria': 'Categoria',
      'CATEGORIA': 'Categoria',
      // Unidade
      'unidade': 'Unidade',
      'UNIDADE': 'Unidade',
      'und': 'Unidade',
      'Und': 'Unidade',
      'UND': 'Unidade',
    };

    return data.map(row => {
      const normalizedRow: Record<string, any> = {};
      for (const key of Object.keys(row)) {
        const normalizedKey = columnMappings[key] || key;
        normalizedRow[normalizedKey] = row[key];
      }
      return normalizedRow;
    });
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          alert('A planilha está vazia ou não possui dados válidos.');
          return;
        }
        
        // Normaliza os nomes das colunas
        const normalizedData = normalizeColumnNames(jsonData);
        
        // Verifica se tem SKU e Descrição
        const firstRow = normalizedData[0];
        if (!firstRow.SKU && !firstRow.Descricao) {
          const columns = Object.keys(jsonData[0] || {}).join(', ');
          alert(`Colunas encontradas: ${columns}\n\nA planilha deve ter pelo menos as colunas SKU (ou Codigo) e Descricao (ou Nome/Produto).`);
          return;
        }
        
        setImportData(normalizedData);
        setImportResult(null);
        setShowImportModal(true);
      } catch (error) {
        console.error('Parse error:', error);
        alert('Erro ao ler arquivo Excel. Verifique se o arquivo é válido.');
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Execute import
  const handleImport = () => {
    // Filtra apenas itens válidos
    const validItems = importData.filter(row => row.SKU && row.Descricao);
    if (validItems.length === 0) {
      setImportError('Nenhum item válido para importar. Verifique se todos os itens têm SKU e Descrição.');
      return;
    }
    setImportError(null);
    importMutation.mutate(validItems);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Estoque</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus itens de estoque</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowAnalyze(!showAnalyze)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80"
          >
            <Bot className="w-4 h-4" />
            {showAnalyze ? 'Ocultar Análise' : 'Analisar Estoque'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Novo Item
          </button>
        </div>
      </div>

      {/* Import/Export Section */}
      <div className="p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Integração Excel</h2>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <FileDown className="w-4 h-4" />
            Exportar Excel
          </button>
          
          <button
            onClick={() => items && generateInventoryReportPDF(items)}
            disabled={!items || items.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            Relatório PDF
          </button>
          
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Baixar Template
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer">
            <FileUp className="w-4 h-4" />
            Importar Excel
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Use o template para importar novos itens ou atualizar existentes em massa.
          A importação usa o SKU como identificador único.
        </p>
      </div>

      {/* Analysis - Agent Intelligence */}
      {showAnalyze && (
        <div className="p-6 bg-card border border-primary/30 rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Análise Inteligente do Agente</h2>
          </div>
          
          {isAnalyzing ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
              Analisando estoque...
            </div>
          ) : analysis ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm text-muted-foreground">Total de Itens</p>
                  <p className="text-2xl font-bold">{analysis.totalItems}</p>
                </div>
                <div className="p-4 bg-destructive/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Itens Críticos</p>
                  <p className="text-2xl font-bold text-red-500">{analysis.itemsCriticos}</p>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm text-muted-foreground">Custo Estimado Reposição</p>
                  <p className="text-2xl font-bold">R$ {analysis.valorTotalEstimado?.toFixed(2)}</p>
                </div>
              </div>

              {analysis.suggestions && analysis.suggestions.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    Sugestões de Compra do Agente
                  </h3>
                  <div className="space-y-2">
                    {analysis.suggestions.map((sug: any) => (
                      <div key={sug.itemId} className="p-3 bg-secondary rounded-md">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{sug.sku} - {sug.descricao}</p>
                            <p className="text-sm text-muted-foreground">
                              Atual: {sug.saldoAtual} / Mínimo: {sug.minimo} / Faltam: {sug.falta}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">Comprar: {sug.sugestaoCompra} un</p>
                            <p className="text-sm text-muted-foreground">
                              R$ {sug.custoEstimado.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Items Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">SKU</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Descrição</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Estoque</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Mín/Máx</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Custo Unit.</th>
            </tr>
          </thead>
          <tbody>
            {items?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum item cadastrado. Use o botão "Novo Item" ou importe via Excel.
                </td>
              </tr>
            ) : (
              items?.map((item: any) => {
                const isCritical = item.saldo <= item.minimo;
                return (
                  <tr key={item.id} className="border-t border-border hover:bg-secondary/50">
                    <td className="px-4 py-3 text-sm font-medium">{item.sku}</td>
                    <td className="px-4 py-3 text-sm">{item.descricao}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={isCritical ? 'text-red-500 font-bold' : ''}>
                        {item.saldo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.minimo} / {item.maximo}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {isCritical ? (
                        <span className="flex items-center gap-1 text-red-500">
                          <AlertCircle className="w-4 h-4" />
                          Crítico
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-500">
                          <CheckCircle className="w-4 h-4" />
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">R$ {item.custoUnitario.toFixed(2)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Criar Novo Item</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium">SKU *</label>
                <input name="sku" required className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md" />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição *</label>
                <input name="descricao" required className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Categoria</label>
                  <input name="categoria" className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md" />
                </div>
                <div>
                  <label className="text-sm font-medium">Unidade</label>
                  <input name="unidade" defaultValue="UN" className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Estoque</label>
                  <input name="saldo" type="number" defaultValue={0} className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md" />
                </div>
                <div>
                  <label className="text-sm font-medium">Mínimo</label>
                  <input name="minimo" type="number" defaultValue={5} className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md" />
                </div>
                <div>
                  <label className="text-sm font-medium">Máximo</label>
                  <input name="maximo" type="number" defaultValue={20} className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Custo Unitário</label>
                  <input name="custoUnitario" type="number" step="0.01" defaultValue={0} className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md" />
                </div>
                <div>
                  <label className="text-sm font-medium">Lead Time (dias)</label>
                  <input name="leadTimeDays" type="number" defaultValue={7} className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Localização</label>
                <input name="localizacao" className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md" />
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-4xl border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Importar Dados do Excel
              </h2>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setImportData([]);
                  setImportResult(null);
                  setImportError(null);
                }} 
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importResult ? (
              // Show import results
              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h3 className="font-semibold flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="w-5 h-5" />
                    Importação Concluída
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-500">{importResult.created}</p>
                      <p className="text-sm text-muted-foreground">Criados</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-500">{importResult.updated}</p>
                      <p className="text-sm text-muted-foreground">Atualizados</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-500">{importResult.errors}</p>
                      <p className="text-sm text-muted-foreground">Erros</p>
                    </div>
                  </div>
                </div>

                {importResult.details?.errors?.length > 0 && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <h4 className="font-semibold text-red-500 mb-2">Erros encontrados:</h4>
                    <ul className="text-sm space-y-1">
                      {importResult.details.errors.map((err: any, idx: number) => (
                        <li key={idx}>
                          SKU: {err.row?.SKU || 'N/A'} - {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportData([]);
                      setImportResult(null);
                      setImportError(null);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              // Show preview
              <div className="space-y-4">
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm">
                    <strong>{importData.length}</strong> itens encontrados no arquivo.
                    Revise os dados abaixo antes de confirmar a importação.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Colunas obrigatórias: SKU (ou Codigo) e Descricao (ou Nome). Demais colunas são opcionais.
                  </p>
                </div>

                {importError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-500 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {importError}
                    </p>
                  </div>
                )}

                <div className="max-h-[400px] overflow-auto border border-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">SKU</th>
                        <th className="px-3 py-2 text-left">Descrição</th>
                        <th className="px-3 py-2 text-left">Estoque</th>
                        <th className="px-3 py-2 text-left">Mín</th>
                        <th className="px-3 py-2 text-left">Máx</th>
                        <th className="px-3 py-2 text-left">Custo</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.map((row, idx) => {
                        const hasRequiredFields = row.SKU && row.Descricao;
                        return (
                          <tr key={idx} className={`border-t border-border ${!hasRequiredFields ? 'bg-red-500/10' : ''}`}>
                            <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium">{row.SKU || <span className="text-red-500">Falta</span>}</td>
                            <td className="px-3 py-2">{row.Descricao || <span className="text-red-500">Falta</span>}</td>
                            <td className="px-3 py-2">{row.Estoque_Atual ?? 0}</td>
                            <td className="px-3 py-2">{row.Estoque_Minimo ?? 0}</td>
                            <td className="px-3 py-2">{row.Estoque_Maximo ?? 100}</td>
                            <td className="px-3 py-2">R$ {Number(row.Custo_Unitario || 0).toFixed(2)}</td>
                            <td className="px-3 py-2">
                              {hasRequiredFields ? (
                                <span className="text-green-500 text-xs">OK</span>
                              ) : (
                                <span className="text-red-500 text-xs">Incompleto</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-secondary/50 rounded-lg text-sm">
                  <p><strong>Resumo:</strong></p>
                  <ul className="list-disc list-inside mt-1 text-muted-foreground">
                    <li>Itens com SKU válido: {importData.filter(r => r.SKU && r.Descricao).length}</li>
                    <li>Itens com dados incompletos: {importData.filter(r => !r.SKU || !r.Descricao).length}</li>
                  </ul>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportData([]);
                      setImportError(null);
                    }}
                    className="px-4 py-2 bg-secondary rounded-md hover:bg-secondary/80"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importMutation.isPending || importData.filter(r => r.SKU && r.Descricao).length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {importMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Confirmar Importação ({importData.filter(r => r.SKU && r.Descricao).length} itens)
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
