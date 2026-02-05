import { z } from 'zod';

// ==================== AUTH ====================

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token obrigatório'),
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve ter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve ter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve ter pelo menos um número'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual obrigatória'),
  newPassword: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve ter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve ter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve ter pelo menos um número'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// ==================== ITEMS ====================

export const createItemSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(200, 'Nome muito longo'),
  sku: z.string().min(1, 'SKU obrigatório').max(50, 'SKU muito longo'),
  descricao: z.string().max(1000, 'Descrição muito longa').optional(),
  unidadeMedida: z.string().min(1, 'Unidade de medida obrigatória'),
  saldo: z.number().min(0, 'Saldo não pode ser negativo'),
  minimo: z.number().min(0, 'Mínimo não pode ser negativo'),
  maximo: z.number().min(0, 'Máximo não pode ser negativo'),
  leadTimeDias: z.number().min(0, 'Lead time não pode ser negativo').optional(),
  custoUnitario: z.number().min(0, 'Custo não pode ser negativo').optional(),
  localizacao: z.string().max(100, 'Localização muito longa').optional(),
  supplierId: z.string().uuid('Fornecedor inválido').optional().nullable(),
});

export type CreateItemFormData = z.infer<typeof createItemSchema>;

export const updateItemSchema = createItemSchema.partial();

export type UpdateItemFormData = z.infer<typeof updateItemSchema>;

export const movimentarEstoqueSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SAIDA'], { 
    errorMap: () => ({ message: 'Tipo deve ser ENTRADA ou SAIDA' })
  }),
  quantidade: z.number().min(1, 'Quantidade mínima é 1'),
  motivo: z.string().min(1, 'Motivo obrigatório').max(500, 'Motivo muito longo'),
});

export type MovimentarEstoqueFormData = z.infer<typeof movimentarEstoqueSchema>;

// ==================== SUPPLIERS ====================

export const createSupplierSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(200, 'Nome muito longo'),
  cnpj: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  telefone: z.string().max(20, 'Telefone muito longo').optional(),
  whatsapp: z.string().max(20, 'WhatsApp muito longo').optional(),
  endereco: z.string().max(500, 'Endereço muito longo').optional(),
  contatoPrincipal: z.string().max(100, 'Contato muito longo').optional(),
  prazoMedioDias: z.number().min(0, 'Prazo não pode ser negativo').optional(),
  observacoes: z.string().max(1000, 'Observações muito longas').optional(),
  isDefault: z.boolean().optional(),
});

export type CreateSupplierFormData = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial();

export type UpdateSupplierFormData = z.infer<typeof updateSupplierSchema>;

// ==================== PURCHASE ORDERS ====================

export const purchaseOrderItemSchema = z.object({
  itemId: z.string().uuid('Item inválido'),
  quantidade: z.number().min(1, 'Quantidade mínima é 1'),
  precoUnitario: z.number().min(0.01, 'Preço mínimo é 0.01'),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Fornecedor obrigatório'),
  observacoes: z.string().max(2000, 'Observações muito longas').optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'Adicione pelo menos um item'),
});

export type CreatePurchaseOrderFormData = z.infer<typeof createPurchaseOrderSchema>;

export const updatePurchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Fornecedor inválido').optional(),
  observacoes: z.string().max(2000, 'Observações muito longas').optional(),
  items: z.array(purchaseOrderItemSchema).optional(),
});

export type UpdatePurchaseOrderFormData = z.infer<typeof updatePurchaseOrderSchema>;

// ==================== KANBAN ====================

export const createKanbanCardSchema = z.object({
  titulo: z.string().min(1, 'Título obrigatório').max(200, 'Título muito longo'),
  descricao: z.string().max(1000, 'Descrição muito longa').optional(),
  purchaseOrderId: z.string().uuid('Pedido inválido').optional(),
});

export type CreateKanbanCardFormData = z.infer<typeof createKanbanCardSchema>;

export const updateKanbanCardSchema = createKanbanCardSchema.partial();

export type UpdateKanbanCardFormData = z.infer<typeof updateKanbanCardSchema>;

// ==================== NOTIFICATIONS ====================

export const sendNotificationSchema = z.object({
  destinatario: z.string().min(1, 'Destinatário obrigatório'),
  assunto: z.string().max(200, 'Assunto muito longo').optional(),
  mensagem: z.string().min(1, 'Mensagem obrigatória').max(2000, 'Mensagem muito longa'),
});

export type SendNotificationFormData = z.infer<typeof sendNotificationSchema>;
