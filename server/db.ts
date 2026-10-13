import fs from 'fs';
import path from 'path';
import { encryptValue, decryptValue, sanitizeCredentials } from './security/encryption.ts';

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

export interface StoreSettings {
  storeName: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  adminPin: string;
  masterOwnerEmail: string;
  masterOwnerPasswordHash: string;
  disclaimerText: string;
  dropshipCheckoutEnabled: boolean;
  contactEmail: string;
}

export interface DatabaseSchema {
  products: Product[];
  integrations: Record<string, IntegrationConfig>;
  suppliers: DropshipSupplier[];
  orders: DropshipOrder[];
  clicks: ClickLog[];
  settings: StoreSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'marketplace_db.json');

const INITIAL_DB: DatabaseSchema = {
  // STRICT RULE: Absolute zero fake or demo products. Starts completely empty.
  products: [],
  integrations: {
    mercadolivre: {
      id: 'mercadolivre',
      name: 'Mercado Livre Brasil',
      status: 'nao_configurado',
      officialApiDocs: 'https://developers.mercadolibre.com.br/pt_br/api-docs-pt-br',
      credentials: {
        appId: '',
        clientSecret: '',
        redirectUri: '',
        accessToken: '',
        refreshToken: '',
      },
      affiliateTag: 'vendplus_mlb_01',
      lastTested: null,
      lastSync: null,
      productsCount: 0,
      errorLog: [],
      syncHistory: [],
      authorizedNotes: 'Integração oficial via Mercado Livre Developers API (Site ID: MLB). Requer OAuth 2.0 (App ID e Access Token).'
    },
    shopee: {
      id: 'shopee',
      name: 'Shopee Brasil',
      status: 'nao_configurado',
      officialApiDocs: 'https://open.shopee.com/documents',
      credentials: {
        partnerId: '',
        partnerKey: '',
        shopId: '',
        appSecret: '',
        affiliateAppId: '',
        redirectUri: '',
      },
      affiliateTag: 'shopee_vendplus_br',
      lastTested: null,
      lastSync: null,
      productsCount: 0,
      errorLog: [],
      syncHistory: [],
      authorizedNotes: 'Requer cadastro no Shopee Open Platform e no Programa Oficial de Afiliados Shopee Brasil.'
    },
    amazon: {
      id: 'amazon',
      name: 'Amazon Brasil',
      status: 'nao_configurado',
      officialApiDocs: 'https://webservices.amazon.com/paapi5/documentation/',
      credentials: {
        associateTag: '',
        accessKeyId: '',
        secretKey: '',
        region: 'sa-east-1',
      },
      affiliateTag: 'vendplus-amz-20',
      lastTested: null,
      lastSync: null,
      productsCount: 0,
      errorLog: [],
      syncHistory: [],
      authorizedNotes: 'Requer conta no Programa de Associados Amazon Brasil e credenciais ativas do PA-API 5.0.'
    },
    tiktok: {
      id: 'tiktok',
      name: 'TikTok Shop',
      status: 'nao_configurado',
      officialApiDocs: 'https://partner.tiktokshop.com/doc/page/overview',
      credentials: {
        appKey: '',
        appSecret: '',
        shopCipher: '',
        accessToken: '',
      },
      affiliateTag: 'tt_vendplus_br',
      lastTested: null,
      lastSync: null,
      productsCount: 0,
      errorLog: [],
      syncHistory: [],
      authorizedNotes: 'Requer homologação no TikTok Shop Partner (TTSP) para o mercado brasileiro.'
    },
    custom_feed: {
      id: 'custom_feed',
      name: 'Feed Oficial Autorizado (CSV/JSON/XML)',
      status: 'nao_configurado',
      officialApiDocs: 'Padronização RFC de feeds de afiliados (Awin, Socialsoul/Lomadee, Rakuten, Fornecedores)',
      credentials: {
        feedUrl: '',
        authHeader: '',
        format: 'json',
      },
      affiliateTag: 'vendplus_feed',
      lastTested: null,
      lastSync: null,
      productsCount: 0,
      errorLog: [],
      syncHistory: [],
      authorizedNotes: 'Importação segura de feeds autorizados por contrato com verificação de integridade e checagem de schema.'
    }
  },
  suppliers: [],
  orders: [],
  clicks: [],
  settings: {
    storeName: 'VEND+ Marketplace',
    tagline: 'Plataforma Inteligente de Compras & Gestão Multicanal',
    primaryColor: '#7C3AED',
    accentColor: '#9333EA',
    adminPin: 'vendplus2026',
    masterOwnerEmail: 'admin@vendplus.com.br',
    masterOwnerPasswordHash: 'vendplus_master_owner_2026',
    disclaimerText: 'Aviso de Transparência: Este marketplace é uma plataforma independente. Produtos com indicação de Afiliado direcionam o comprador para as plataformas oficiais homologadas (Mercado Livre, Shopee, Amazon, TikTok Shop) onde a transação é finalizada com total segurança do consumidor. O VEND+ pode ser remunerado por compras qualificadas sem qualquer custo adicional para o usuário.',
    dropshipCheckoutEnabled: false,
    contactEmail: 'contato@vendplus.com.br'
  }
};

export class Database {
  private static instance: Database;
  private data: DatabaseSchema;

  private constructor() {
    this.ensureDataDir();
    this.data = this.loadData();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        // Ensure all top-level keys exist
        return {
          ...INITIAL_DB,
          ...parsed,
          integrations: {
            ...INITIAL_DB.integrations,
            ...(parsed.integrations || {})
          },
          settings: {
            ...INITIAL_DB.settings,
            ...(parsed.settings || {})
          }
        };
      }
    } catch (err) {
      console.error('Failed to parse database file, falling back to clean initial state:', err);
    }
    this.saveData(INITIAL_DB);
    return INITIAL_DB;
  }

  private saveData(data: DatabaseSchema) {
    try {
      this.ensureDataDir();
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Failed to save database:', err);
    }
  }

  public getProducts(filter?: { category?: string; search?: string; source?: string; type?: string; availableOnly?: boolean }): Product[] {
    let list = [...this.data.products];
    if (filter) {
      if (filter.availableOnly) {
        list = list.filter(p => p.available);
      }
      if (filter.category && filter.category !== 'all') {
        const catNorm = filter.category.toLowerCase().trim();
        list = list.filter(p => p.category.toLowerCase().includes(catNorm));
      }
      if (filter.source && filter.source !== 'all') {
        list = list.filter(p => p.source === filter.source);
      }
      if (filter.type && filter.type !== 'all') {
        list = list.filter(p => p.type === filter.type);
      }
      if (filter.search && filter.search.trim().length > 0) {
        const q = filter.search.toLowerCase().trim();
        list = list.filter(p =>
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.originalId.toLowerCase().includes(q)
        );
      }
    }
    return list;
  }

  public getProductById(id: string): Product | undefined {
    return this.data.products.find(p => p.id === id);
  }

  public saveProducts(newProducts: Product[]): { added: number; updated: number } {
    let added = 0;
    let updated = 0;

    for (const prod of newProducts) {
      const idx = this.data.products.findIndex(p => p.id === prod.id || (p.originalId === prod.originalId && p.source === prod.source));
      if (idx >= 0) {
        this.data.products[idx] = { ...this.data.products[idx], ...prod, lastUpdated: new Date().toISOString() };
        updated++;
      } else {
        this.data.products.push(prod);
        added++;
      }
    }

    // Update product counts per integration
    for (const key of Object.keys(this.data.integrations)) {
      this.data.integrations[key].productsCount = this.data.products.filter(p => p.source === key).length;
    }

    this.saveData(this.data);
    return { added, updated };
  }

  public deleteProduct(id: string): boolean {
    const prevLen = this.data.products.length;
    this.data.products = this.data.products.filter(p => p.id !== id);
    if (this.data.products.length !== prevLen) {
      for (const key of Object.keys(this.data.integrations)) {
        this.data.integrations[key].productsCount = this.data.products.filter(p => p.source === key).length;
      }
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public clearProductsBySource(source: string): number {
    const count = this.data.products.filter(p => p.source === source).length;
    this.data.products = this.data.products.filter(p => p.source !== source);
    if (this.data.integrations[source]) {
      this.data.integrations[source].productsCount = 0;
    }
    this.saveData(this.data);
    return count;
  }

  public getIntegrations(sanitized = true): Record<string, IntegrationConfig> {
    if (!sanitized) {
      return this.data.integrations;
    }
    const safe: Record<string, IntegrationConfig> = {};
    for (const [key, val] of Object.entries(this.data.integrations)) {
      safe[key] = {
        ...val,
        credentials: sanitizeCredentials(val.credentials)
      };
    }
    return safe;
  }

  public updateIntegration(id: string, updates: Partial<IntegrationConfig>): IntegrationConfig | null {
    if (!this.data.integrations[id]) return null;
    let nextCredentials = this.data.integrations[id].credentials;
    if (updates.credentials) {
      nextCredentials = { ...this.data.integrations[id].credentials };
      for (const [k, v] of Object.entries(updates.credentials)) {
        // If value is masked, keep original value
        if (typeof v === 'string' && v.startsWith('••••')) {
          continue;
        }
        nextCredentials[k] = v;
      }
    }

    this.data.integrations[id] = {
      ...this.data.integrations[id],
      ...updates,
      credentials: nextCredentials
    };
    this.saveData(this.data);
    return this.data.integrations[id];
  }

  public updateSupplierStatus(id: string, status: DropshipSupplier['status'], approvedBy?: string): DropshipSupplier | null {
    const s = this.data.suppliers.find(x => x.id === id);
    if (s) {
      s.status = status;
      if (status === 'homologado') {
        s.approvedBy = approvedBy || 'Master Owner';
        s.approvedAt = new Date().toISOString();
      }
      this.saveData(this.data);
      return s;
    }
    return null;
  }

  public logIntegrationError(id: string, message: string, code?: string) {
    if (this.data.integrations[id]) {
      this.data.integrations[id].errorLog.unshift({
        timestamp: new Date().toISOString(),
        message,
        code
      });
      if (this.data.integrations[id].errorLog.length > 50) {
        this.data.integrations[id].errorLog.pop();
      }
      this.data.integrations[id].status = 'erro_autenticacao';
      this.saveData(this.data);
    }
  }

  public addSyncHistory(id: string, record: { itemsFound: number; itemsSaved: number; status: 'success' | 'failed'; details: string }) {
    if (this.data.integrations[id]) {
      this.data.integrations[id].syncHistory.unshift({
        timestamp: new Date().toISOString(),
        ...record
      });
      if (this.data.integrations[id].syncHistory.length > 50) {
        this.data.integrations[id].syncHistory.pop();
      }
      this.data.integrations[id].lastSync = new Date().toISOString();
      this.saveData(this.data);
    }
  }

  public getSuppliers(): DropshipSupplier[] {
    return this.data.suppliers;
  }

  public addSupplier(supplier: Omit<DropshipSupplier, 'id' | 'createdAt'>): DropshipSupplier {
    const id = `SUP_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newSupp: DropshipSupplier = {
      ...supplier,
      id,
      createdAt: new Date().toISOString()
    };
    this.data.suppliers.push(newSupp);
    this.saveData(this.data);
    return newSupp;
  }

  public updateSupplier(id: string, updates: Partial<DropshipSupplier>): DropshipSupplier | null {
    const idx = this.data.suppliers.findIndex(s => s.id === id);
    if (idx >= 0) {
      this.data.suppliers[idx] = { ...this.data.suppliers[idx], ...updates };
      this.saveData(this.data);
      return this.data.suppliers[idx];
    }
    return null;
  }

  public deleteSupplier(id: string): boolean {
    const prev = this.data.suppliers.length;
    this.data.suppliers = this.data.suppliers.filter(s => s.id !== id);
    if (this.data.suppliers.length !== prev) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public getOrders(): DropshipOrder[] {
    return this.data.orders;
  }

  public createOrder(orderData: Omit<DropshipOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: DropshipOrder['status'] }): DropshipOrder {
    const id = `PED_${Date.now().toString().slice(-6)}`;
    const confirmationCode = `VP-${Math.floor(100000 + Math.random() * 900000)}`;
    const order: DropshipOrder = {
      ...orderData,
      id,
      confirmationCode: orderData.confirmationCode || confirmationCode,
      status: 'aguardando_pagamento',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.orders.unshift(order);
    this.saveData(this.data);
    return order;
  }

  public updateOrderStatus(id: string, status: DropshipOrder['status'], trackingCode?: string): DropshipOrder | null {
    const order = this.data.orders.find(o => o.id === id);
    if (order) {
      order.status = status;
      if (trackingCode !== undefined) {
        order.trackingCode = trackingCode;
      }
      order.updatedAt = new Date().toISOString();
      this.saveData(this.data);
      return order;
    }
    return null;
  }

  public recordClick(productId: string, productTitle: string, source: string, userAgent: string, destinationUrl: string): ClickLog {
    const click: ClickLog = {
      id: `CLK_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId,
      productTitle,
      source,
      timestamp: new Date().toISOString(),
      userAgent,
      destinationUrl
    };
    this.data.clicks.unshift(click);
    if (this.data.clicks.length > 500) {
      this.data.clicks.pop();
    }
    this.saveData(this.data);
    return click;
  }

  public getClicks(limit = 100): ClickLog[] {
    return this.data.clicks.slice(0, limit);
  }

  public getStats() {
    const totalProducts = this.data.products.length;
    const affiliateProducts = this.data.products.filter(p => p.type === 'affiliate').length;
    const dropshipProducts = this.data.products.filter(p => p.type === 'dropshipping').length;
    const totalClicks = this.data.clicks.length;
    const totalOrders = this.data.orders.length;
    const totalSuppliers = this.data.suppliers.length;
    const connectedIntegrations = Object.values(this.data.integrations).filter(i => i.status === 'conectado' || (i.status as string) === 'connected').length;

    const clicksBySource: Record<string, number> = {};
    for (const c of this.data.clicks) {
      clicksBySource[c.source] = (clicksBySource[c.source] || 0) + 1;
    }

    const productsBySource: Record<string, number> = {};
    for (const p of this.data.products) {
      productsBySource[p.source] = (productsBySource[p.source] || 0) + 1;
    }

    return {
      totalProducts,
      affiliateProducts,
      dropshipProducts,
      totalClicks,
      totalOrders,
      totalSuppliers,
      connectedIntegrations,
      clicksBySource,
      productsBySource
    };
  }

  public getSettings(): StoreSettings {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<StoreSettings>): StoreSettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.saveData(this.data);
    return this.data.settings;
  }
}
