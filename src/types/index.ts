export type IntegrationStatus =
  | 'nao_configurado'
  | 'aguardando_autorizacao'
  | 'conectado'
  | 'erro_autenticacao'
  | 'permissao_insuficiente';

export interface Product {
  id: string;
  originalId: string;
  sku?: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  category: string;
  brand: string;
  imageUrl: string;
  additionalImages?: string[];
  source: 'mercadolivre' | 'shopee' | 'amazon' | 'tiktok' | 'dropship_supplier' | 'custom_feed' | 'proprio_vendplus';
  sourceName: string;
  originType: 'proprio' | 'dropship' | 'afiliado';
  originalUrl: string;
  affiliateUrl: string;
  type: 'affiliate' | 'dropshipping';
  available: boolean;
  stock?: number;
  rating?: number;
  salesCount?: number;
  sellerName?: string;
  dropshipDetails?: {
    supplierId: string;
    supplierName: string;
    costPrice: number;
    marginPercent: number;
    shippingDays: number;
    returnPolicy: string;
  };
  lastUpdated: string;
}

export interface IntegrationConfig {
  id: 'mercadolivre' | 'shopee' | 'amazon' | 'tiktok' | 'custom_feed';
  name: string;
  status: IntegrationStatus;
  officialApiDocs: string;
  credentials: Record<string, string>;
  affiliateTag: string;
  lastTested: string | null;
  lastSync: string | null;
  productsCount: number;
  errorLog: Array<{ timestamp: string; message: string; code?: string }>;
  syncHistory: Array<{ timestamp: string; itemsFound: number; itemsSaved: number; status: 'success' | 'failed'; details: string }>;
  authorizedNotes: string;
  accountInfo?: {
    userId?: string;
    nickname?: string;
    email?: string;
    country?: string;
    scopes?: string[];
    expiresAt?: string;
  };
}

export interface DropshipSupplier {
  id: string;
  name: string;
  cnpj: string;
  contactEmail: string;
  contactPhone: string;
  category: string;
  status: 'pendente_aprovacao' | 'homologado' | 'rejeitado' | 'suspenso';
  slaDeliveryDays: number;
  defaultMarginPercent: number;
  shippingOrigin: string;
  contractRef?: string;
  returnPolicy?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes: string;
  createdAt: string;
}

export interface DropshipOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf: string;
  shippingAddress: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
  };
  items: Array<{
    productId: string;
    title: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    supplierId: string;
  }>;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  supplierId: string;
  status: 'aguardando_pagamento' | 'pago_em_processamento' | 'enviado' | 'entregue' | 'cancelado' | 'devolvido';
  trackingCode?: string;
  confirmationCode?: string;
  mercadoPagoPaymentId?: string;
  mercadoPagoStatus?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClickLog {
  id: string;
  productId: string;
  productTitle: string;
  source: string;
  timestamp: string;
  userAgent: string;
  destinationUrl: string;
}

export interface StoreStatus {
  status: string;
  storeName: string;
  tagline: string;
  totalProducts: number;
  hasConnectedIntegrations: boolean;
  disclaimerText: string;
  dropshipCheckoutEnabled: boolean;
}

export interface AdminStats {
  totalProducts: number;
  affiliateProducts: number;
  dropshipProducts: number;
  totalClicks: number;
  totalOrders: number;
  totalSuppliers: number;
  connectedIntegrations: number;
  clicksBySource: Record<string, number>;
  productsBySource: Record<string, number>;
}
