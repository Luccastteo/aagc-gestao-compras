// Dynamic import for client-side only
let jsPDF: any = null;

// Load jsPDF dynamically
const loadJsPDF = async () => {
  if (typeof window === 'undefined') return null;
  if (jsPDF) return jsPDF;
  
  const module = await import('jspdf');
  await import('jspdf-autotable');
  jsPDF = module.default;
  return jsPDF;
};

interface PurchaseOrderItem {
  item: {
    sku: string;
    descricao: string;
  };
  quantidade: number;
  precoUnitario: number;
}

interface PurchaseOrder {
  id: string;
  codigo: string;
  status: string;
  valorTotal: number;
  observacoes?: string;
  createdAt: string;
  supplier: {
    nome: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    cnpj?: string;
  };
  items: PurchaseOrderItem[];
  createdBy?: {
    name: string;
  };
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  APPROVED: 'Aprovado',
  SENT: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export async function generatePurchaseOrderPDF(po: PurchaseOrder) {
  const PDF = await loadJsPDF();
  if (!PDF) return;
  
  const doc = new PDF();
  
  // Header
  doc.setFillColor(139, 92, 246); // Purple
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PEDIDO DE COMPRA', 105, 18, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${po.codigo}`, 105, 28, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Company info (left side)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('AAGC - Gestão Inteligente de Compras', 14, 45);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Sistema de Gestão de Compras e Estoque', 14, 51);
  
  // Order info (right side)
  doc.setFontSize(9);
  doc.text(`Data: ${new Date(po.createdAt).toLocaleDateString('pt-BR')}`, 150, 45);
  doc.text(`Status: ${statusLabels[po.status] || po.status}`, 150, 51);
  if (po.createdBy?.name) {
    doc.text(`Criado por: ${po.createdBy.name}`, 150, 57);
  }
  
  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 62, 196, 62);
  
  // Supplier info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('FORNECEDOR', 14, 72);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${po.supplier.nome}`, 14, 80);
  
  let yPos = 86;
  if (po.supplier.cnpj) {
    doc.text(`CNPJ: ${po.supplier.cnpj}`, 14, yPos);
    yPos += 6;
  }
  if (po.supplier.email) {
    doc.text(`Email: ${po.supplier.email}`, 14, yPos);
    yPos += 6;
  }
  if (po.supplier.telefone) {
    doc.text(`Telefone: ${po.supplier.telefone}`, 14, yPos);
    yPos += 6;
  }
  if (po.supplier.endereco) {
    doc.text(`Endereço: ${po.supplier.endereco}`, 14, yPos);
    yPos += 6;
  }
  
  // Items table
  yPos = Math.max(yPos + 10, 110);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ITENS DO PEDIDO', 14, yPos);
  
  const tableData = po.items.map((item, index) => [
    (index + 1).toString(),
    item.item.sku,
    item.item.descricao.substring(0, 40),
    item.quantidade.toString(),
    `R$ ${item.precoUnitario.toFixed(2)}`,
    `R$ ${(item.quantidade * item.precoUnitario).toFixed(2)}`,
  ]);
  
  doc.autoTable({
    startY: yPos + 5,
    head: [['#', 'SKU', 'Descrição', 'Qtd', 'Preço Unit.', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 60 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });
  
  // Get final Y position after table
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Total
  doc.setFillColor(245, 245, 245);
  doc.rect(120, finalY, 76, 15, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', 125, finalY + 10);
  doc.text(`R$ ${po.valorTotal.toFixed(2)}`, 191, finalY + 10, { align: 'right' });
  
  // Observations
  if (po.observacoes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES:', 14, finalY + 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitObs = doc.splitTextToSize(po.observacoes, 180);
    doc.text(splitObs, 14, finalY + 38);
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, pageHeight - 25, 196, pageHeight - 25);
  
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Documento gerado automaticamente pelo sistema AAGC', 105, pageHeight - 18, { align: 'center' });
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, pageHeight - 12, { align: 'center' });
  
  // Save
  doc.save(`pedido_${po.codigo}.pdf`);
}

export async function generateInventoryReportPDF(items: any[]) {
  const PDF = await loadJsPDF();
  if (!PDF) return;
  
  const doc = new PDF();
  
  // Header
  doc.setFillColor(34, 197, 94); // Green
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE ESTOQUE', 105, 18, { align: 'center' });
  
  // Reset
  doc.setTextColor(0, 0, 0);
  
  // Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 40);
  doc.text(`Total de itens: ${items.length}`, 14, 46);
  
  const criticalCount = items.filter(i => i.saldo <= i.minimo).length;
  doc.text(`Itens críticos: ${criticalCount}`, 100, 40);
  
  const totalValue = items.reduce((sum, item) => sum + (item.saldo * item.custoUnitario), 0);
  doc.text(`Valor total em estoque: R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 100, 46);
  
  // Table
  const tableData = items.map((item, index) => {
    const status = item.saldo <= item.minimo ? 'CRÍTICO' : 'OK';
    return [
      (index + 1).toString(),
      item.sku,
      item.descricao.substring(0, 35),
      item.saldo.toString(),
      item.minimo.toString(),
      item.maximo.toString(),
      `R$ ${item.custoUnitario.toFixed(2)}`,
      status,
    ];
  });
  
  doc.autoTable({
    startY: 55,
    head: [['#', 'SKU', 'Descrição', 'Estoque', 'Mín', 'Máx', 'Custo Un.', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [34, 197, 94],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 25 },
      2: { cellWidth: 50 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 20, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    didDrawCell: (data: any) => {
      // Color critical items
      if (data.column.index === 7 && data.cell.text[0] === 'CRÍTICO') {
        doc.setTextColor(239, 68, 68);
      }
    },
    willDrawCell: (data: any) => {
      if (data.column.index === 7 && data.cell.text[0] === 'CRÍTICO') {
        data.cell.styles.textColor = [239, 68, 68];
      }
    },
  });
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Relatório gerado pelo sistema AAGC', 105, pageHeight - 10, { align: 'center' });
  
  doc.save(`estoque_${new Date().toISOString().split('T')[0]}.pdf`);
}

export async function generateAuditReportPDF(logs: any[]) {
  const PDF = await loadJsPDF();
  if (!PDF) return;
  
  const doc = new PDF();
  
  // Header
  doc.setFillColor(59, 130, 246); // Blue
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE AUDITORIA', 105, 18, { align: 'center' });
  
  // Reset
  doc.setTextColor(0, 0, 0);
  
  // Info
  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 40);
  doc.text(`Total de registros: ${logs.length}`, 14, 46);
  
  // Table
  const actionLabels: Record<string, string> = {
    CREATE: 'Criação',
    UPDATE: 'Atualização',
    DELETE: 'Exclusão',
    APPROVE: 'Aprovação',
    SEND: 'Envio',
    RECEIVE: 'Recebimento',
    MOVE: 'Movimentação',
  };
  
  const tableData = logs.slice(0, 50).map((log, index) => [
    (index + 1).toString(),
    new Date(log.createdAt).toLocaleString('pt-BR'),
    log.user?.name || 'Sistema',
    actionLabels[log.action] || log.action,
    log.entity,
    log.entityId?.substring(0, 8) || '-',
  ]);
  
  doc.autoTable({
    startY: 55,
    head: [['#', 'Data/Hora', 'Usuário', 'Ação', 'Entidade', 'ID']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    margin: { left: 14, right: 14 },
  });
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Relatório gerado pelo sistema AAGC', 105, pageHeight - 10, { align: 'center' });
  
  doc.save(`auditoria_${new Date().toISOString().split('T')[0]}.pdf`);
}
