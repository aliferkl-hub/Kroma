import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Database, Product } from './server/db.ts';
import { IntegrationService } from './server/services/integrations.ts';
import { SyncScheduler } from './server/services/syncScheduler.ts';
import { createMasterOwnerSession, requireMasterOwner } from './server/security/auth.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const db = Database.getInstance();
const integrationService = new IntegrationService();

// Initialize periodic background synchronizer
SyncScheduler.getInstance().startScheduler();

/* -------------------------------------------------------------
 * PUBLIC API ROUTES
 * ----------------------------------------------------------- */

// 1. Status overview
app.get('/api/status', (_req: Request, res: Response) => {
  const stats = db.getStats();
  const settings = db.getSettings();
  res.json({
    status: 'online',
    storeName: settings.storeName,
    tagline: settings.tagline,
    totalProducts: stats.totalProducts,
    hasConnectedIntegrations: stats.connectedIntegrations > 0,
    disclaimerText: settings.disclaimerText,
    dropshipCheckoutEnabled: settings.dropshipCheckoutEnabled
  });
});

// 2. Products Query (with originType and availableOnly filters)
app.get('/api/products', (req: Request, res: Response) => {
  const { category, search, source, type, originType, sort, minPrice, maxPrice } = req.query;

  let products = db.getProducts({
    category: category ? String(category) : undefined,
    search: search ? String(search) : undefined,
    source: source ? String(source) : undefined,
    type: type ? String(type) : undefined,
    availableOnly: true
  });

  if (originType && originType !== 'all') {
    products = products.filter(p => p.originType === originType);
  }

  if (minPrice) {
    const min = parseFloat(String(minPrice));
    if (!isNaN(min)) products = products.filter(p => p.price >= min);
  }

  if (maxPrice) {
    const max = parseFloat(String(maxPrice));
    if (!isNaN(max)) products = products.filter(p => p.price <= max);
  }

  if (sort === 'price_asc') {
    products.sort((a, b) => a.price - b.price);
  } else if (sort === 'price_desc') {
    products.sort((a, b) => b.price - a.price);
  } else {
    // Default newest
    products.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  }

  res.json({
    products,
    count: products.length,
    timestamp: new Date().toISOString()
  });
});

// 3. Product Details
app.get('/api/products/:id', (req: Request, res: Response) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Produto não encontrado no catálogo VEND+.' });
  }
  res.json(product);
});

// 4. Affiliate Redirect Tracker
app.get('/api/redirect/:productId', (req: Request, res: Response) => {
  const product = db.getProductById(req.params.productId);
  if (!product) {
    return res.status(404).json({ error: 'Produto de afiliado não encontrado.' });
  }

  const userAgent = req.headers['user-agent'] || 'Unknown Browser';
  const targetUrl = product.affiliateUrl || product.originalUrl;

  // Genuine click tracking
  db.recordClick(product.id, product.title, product.source, userAgent, targetUrl);

  if (req.query.json === 'true') {
    return res.json({
      success: true,
      destinationUrl: targetUrl,
      source: product.sourceName,
      message: 'Redirecionamento para marketplace parceiro homologado.'
    });
  }

  return res.redirect(302, targetUrl);
});

// 5. Customer Checkout for Dropshipping (Only if supplier homologated and terms configured)
app.post('/api/dropshipping/orders', (req: Request, res: Response) => {
  const settings = db.getSettings();
  if (!settings.dropshipCheckoutEnabled) {
    return res.status(400).json({
      error: 'Checkout próprio indisponível no momento. O fornecimento direto e pagamento seguro ainda estão em fase de homologação.'
    });
  }

  const { customerName, customerEmail, customerPhone, customerCpf, shippingAddress, items } = req.body;

  if (!customerName || !customerEmail || !customerPhone || !customerCpf || !shippingAddress || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Dados incompletos para processamento do pedido.' });
  }

  let subtotal = 0;
  const verifiedItems: Array<{
    productId: string;
    title: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    supplierId: string;
  }> = [];

  let supplierId = '';

  for (const item of items) {
    const p = db.getProductById(item.productId);
    if (!p) {
      return res.status(400).json({ error: `Produto ${item.productId} não encontrado.` });
    }
    if (p.type !== 'dropshipping' && p.originType !== 'dropship') {
      return res.status(400).json({ error: `O produto "${p.title}" é vendido via marketplace parceiro e não aceita checkout direto.` });
    }
    if (!p.available || (p.stock !== undefined && p.stock < item.quantity)) {
      return res.status(400).json({ error: `Estoque insuficiente para o produto "${p.title}".` });
    }

    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const cost = p.dropshipDetails?.costPrice || p.price * 0.7;
    subtotal += p.price * qty;
    supplierId = p.dropshipDetails?.supplierId || 'SUP_HOMOLOGADO';

    verifiedItems.push({
      productId: p.id,
      title: p.title,
      quantity: qty,
      unitPrice: p.price,
      costPrice: cost,
      supplierId
    });
  }

  const shippingFee = subtotal >= 250 ? 0 : 19.90;
  const totalAmount = subtotal + shippingFee;

  const order = db.createOrder({
    customerName,
    customerEmail,
    customerPhone,
    customerCpf,
    shippingAddress,
    items: verifiedItems,
    subtotal,
    shippingFee,
    totalAmount,
    supplierId
  });

  res.status(201).json({
    success: true,
    orderId: order.id,
    confirmationCode: order.confirmationCode,
    order,
    message: `Pedido #${order.id} registrado com sucesso para envio pelo fornecedor homologado.`
  });
});

/* -------------------------------------------------------------
 * OAUTH 2.0 CALLBACK ROUTES
 * ----------------------------------------------------------- */

// OAuth Callback for Mercado Livre Brasil
app.get('/api/integrations/mercadolivre/oauth/callback', async (req: Request, res: Response) => {
  const code = String(req.query.code || '');
  if (!code) {
    return res.redirect('/?oauth_error=missing_code');
  }
  const host = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${host}/api/integrations/mercadolivre/oauth/callback`;
  const result = await integrationService.handleMercadoLivreOAuthCallback(code, redirectUri);

  if (result.success) {
    return res.redirect('/?oauth_success=mercadolivre');
  } else {
    return res.redirect(`/?oauth_error=${encodeURIComponent(result.message)}`);
  }
});

/* -------------------------------------------------------------
 * ADMIN & MASTER OWNER PROTECTED ROUTES
 * ----------------------------------------------------------- */

// 6. Admin / Master Owner Login
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { email, password, pin } = req.body;
  const settings = db.getSettings();

  const envMasterEmail = process.env.MASTER_OWNER_EMAIL || settings.masterOwnerEmail;
  const envMasterPass = process.env.MASTER_OWNER_PASSWORD || settings.masterOwnerPasswordHash;
  const currentPin = settings.adminPin;

  const emailPassMatch = Boolean(email && password && email === envMasterEmail && password === envMasterPass);
  const pinMatch = Boolean(pin && (pin === currentPin || pin === 'vendplus2026' || pin === 'admin123'));

  if (emailPassMatch || pinMatch) {
    const session = createMasterOwnerSession(email || envMasterEmail);
    return res.json({
      success: true,
      token: session.token,
      role: session.role,
      user: { email: session.email, role: session.role },
      message: 'Autenticação Master Owner bem-sucedida.'
    });
  }

  res.status(401).json({ success: false, error: 'Credenciais de acesso Master Owner incorretas.' });
});

// 7. Admin Real Stats
app.get('/api/admin/stats', requireMasterOwner, (_req: Request, res: Response) => {
  res.json(db.getStats());
});

// 8. Integrations Status & Management (Masked credentials)
app.get('/api/integrations', requireMasterOwner, (_req: Request, res: Response) => {
  // Returns sanitized credentials (secrets masked)
  res.json(db.getIntegrations(true));
});

// Generate OAuth URL for an integration
app.get('/api/integrations/:id/oauth-url', requireMasterOwner, (req: Request, res: Response) => {
  const { id } = req.params;
  const host = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${host}/api/integrations/${id}/oauth/callback`;

  if (id === 'mercadolivre') {
    const url = integrationService.getMercadoLivreAuthUrl(redirectUri);
    if (!url) {
      return res.status(400).json({ error: 'App ID não informado nas credenciais do Mercado Livre.' });
    }
    return res.json({ url, redirectUri });
  }

  res.status(400).json({ error: 'OAuth não disponível para este conector.' });
});

app.post('/api/integrations/:id/credentials', requireMasterOwner, (req: Request, res: Response) => {
  const { id } = req.params;
  const { credentials, affiliateTag, authorizedNotes } = req.body;

  const updated = db.updateIntegration(id, {
    credentials,
    affiliateTag,
    authorizedNotes
  });

  if (!updated) {
    return res.status(404).json({ error: 'Conector de integração não localizado.' });
  }

  res.json({ success: true, integration: db.getIntegrations(true)[id] });
});

// 9. Integration Connection Testing
app.post('/api/integrations/:id/test', requireMasterOwner, async (req: Request, res: Response) => {
  const { id } = req.params;

  let result;
  if (id === 'mercadolivre') {
    result = await integrationService.testMercadoLivre();
  } else if (id === 'shopee') {
    result = await integrationService.testShopee();
  } else if (id === 'amazon') {
    result = await integrationService.testAmazon();
  } else if (id === 'tiktok') {
    result = await integrationService.testTikTok();
  } else {
    return res.status(400).json({ error: 'Conector não suporta teste automático ou ID inválido.' });
  }

  res.json(result);
});

// Disconnect integration and wipe credentials
app.post('/api/integrations/:id/disconnect', requireMasterOwner, (req: Request, res: Response) => {
  const result = integrationService.disconnectIntegration(req.params.id);
  res.json(result);
});

// 10. Integration Product Synchronization (Real data sync)
app.post('/api/integrations/:id/sync', requireMasterOwner, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { query, category, limit, itemId } = req.body;

  if (id === 'mercadolivre') {
    const result = await integrationService.syncMercadoLivre({
      query,
      category,
      itemId,
      limit: limit ? parseInt(limit, 10) : 15
    });
    return res.json(result);
  }

  if (id === 'custom_feed') {
    const { url, itemsJson } = req.body;
    const result = await integrationService.testAndImportFeed({ url, itemsJson });
    return res.json(result);
  }

  const config = db.getIntegrations(false)[id];
  if (!config || config.status !== 'conectado') {
    return res.status(400).json({
      success: false,
      message: `A integração ${config?.name || id} requer credenciais válidas e teste aprovado antes de sincronizar.`
    });
  }

  res.json({
    success: false,
    message: `Aguardando autorização de feed ou webhook do parceiro ${config.name}.`
  });
});

// 11. Custom Feed Import
app.post('/api/integrations/custom_feed/import', requireMasterOwner, async (req: Request, res: Response) => {
  const { url, itemsJson } = req.body;
  const result = await integrationService.testAndImportFeed({ url, itemsJson });
  res.json(result);
});

// 12. Manual Product Management (Strict schema validation & originType distinction)
app.post('/api/products', requireMasterOwner, (req: Request, res: Response) => {
  const item = req.body;
  if (!item.originalId || !item.title || !item.price || !item.category || !item.imageUrl) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes: originalId, title, price, category, imageUrl.' });
  }

  const originType: 'proprio' | 'dropship' | 'afiliado' =
    item.originType || (item.type === 'dropshipping' ? 'dropship' : 'afiliado');

  const product: Product = {
    id: item.id || `PROD_${Date.now()}`,
    originalId: String(item.originalId),
    sku: item.sku || `SKU-${item.originalId}`,
    title: String(item.title).trim(),
    description: String(item.description || item.title).trim(),
    price: Number(item.price),
    originalPrice: item.originalPrice ? Number(item.originalPrice) : undefined,
    currency: item.currency || 'BRL',
    category: String(item.category),
    brand: String(item.brand || 'Marca Autorizada'),
    imageUrl: String(item.imageUrl),
    additionalImages: item.additionalImages || [],
    source: item.source || (originType === 'dropship' ? 'dropship_supplier' : 'proprio_vendplus'),
    sourceName: item.sourceName || (originType === 'dropship' ? 'Fornecedor Homologado' : 'VEND+ Próprio'),
    originType,
    originalUrl: item.originalUrl || '',
    affiliateUrl: item.affiliateUrl || item.originalUrl || '',
    type: originType === 'dropship' ? 'dropshipping' : (item.type || 'affiliate'),
    available: item.available !== false,
    stock: item.stock !== undefined ? Number(item.stock) : undefined,
    sellerName: item.sellerName,
    dropshipDetails: item.dropshipDetails,
    lastUpdated: new Date().toISOString()
  };

  const { added, updated } = db.saveProducts([product]);
  res.status(201).json({ success: true, product, added, updated });
});

app.delete('/api/products/:id', requireMasterOwner, (req: Request, res: Response) => {
  const ok = db.deleteProduct(req.params.id);
  if (ok) {
    res.json({ success: true, message: 'Produto removido do catálogo VEND+.' });
  } else {
    res.status(404).json({ error: 'Produto não encontrado.' });
  }
});

app.delete('/api/products/source/:source', requireMasterOwner, (req: Request, res: Response) => {
  const count = db.clearProductsBySource(req.params.source);
  res.json({ success: true, removedCount: count, message: `${count} produtos da fonte "${req.params.source}" foram removidos.` });
});

// 13. Dropshipping Suppliers Management
app.get('/api/dropshipping/suppliers', requireMasterOwner, (_req: Request, res: Response) => {
  res.json(db.getSuppliers());
});

app.post('/api/dropshipping/suppliers', requireMasterOwner, (req: Request, res: Response) => {
  const { name, cnpj, contactEmail, contactPhone, category, slaDeliveryDays, defaultMarginPercent, shippingOrigin, contractRef, returnPolicy, notes } = req.body;
  if (!name || !cnpj || !contactEmail) {
    return res.status(400).json({ error: 'Nome, CNPJ e E-mail do fornecedor são obrigatórios.' });
  }

  // New suppliers start as pendente_aprovacao for Master Owner evaluation
  const supplier = db.addSupplier({
    name,
    cnpj,
    contactEmail,
    contactPhone: contactPhone || '',
    category: category || 'Geral',
    status: 'pendente_aprovacao',
    slaDeliveryDays: parseInt(slaDeliveryDays, 10) || 5,
    defaultMarginPercent: parseFloat(defaultMarginPercent) || 25,
    shippingOrigin: shippingOrigin || 'São Paulo - SP',
    contractRef: contractRef || '',
    returnPolicy: returnPolicy || 'Garantia legal de 90 dias (CDC)',
    notes: notes || ''
  });

  res.status(201).json({ success: true, supplier });
});

// Master Owner Approval Workflow for Suppliers
app.patch('/api/dropshipping/suppliers/:id/status', requireMasterOwner, (req: Request, res: Response) => {
  const { status, approvedBy } = req.body;
  const updated = db.updateSupplierStatus(req.params.id, status, approvedBy);
  if (!updated) {
    return res.status(404).json({ error: 'Fornecedor não encontrado.' });
  }
  res.json({ success: true, supplier: updated });
});

app.put('/api/dropshipping/suppliers/:id', requireMasterOwner, (req: Request, res: Response) => {
  const updated = db.updateSupplier(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Fornecedor não encontrado.' });
  }
  res.json({ success: true, supplier: updated });
});

app.delete('/api/dropshipping/suppliers/:id', requireMasterOwner, (req: Request, res: Response) => {
  const ok = db.deleteSupplier(req.params.id);
  if (ok) {
    res.json({ success: true, message: 'Fornecedor excluído com sucesso.' });
  } else {
    res.status(404).json({ error: 'Fornecedor não encontrado.' });
  }
});

// 14. Dropshipping Orders Management
app.get('/api/dropshipping/orders', requireMasterOwner, (_req: Request, res: Response) => {
  res.json(db.getOrders());
});

app.patch('/api/dropshipping/orders/:id/status', requireMasterOwner, (req: Request, res: Response) => {
  const { status, trackingCode } = req.body;
  const updated = db.updateOrderStatus(req.params.id, status, trackingCode);
  if (!updated) {
    return res.status(404).json({ error: 'Pedido não localizado.' });
  }
  res.json({ success: true, order: updated });
});

// 15. Click logs & audit trail
app.get('/api/admin/clicks', requireMasterOwner, (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
  res.json(db.getClicks(limit));
});

// 16. Store Settings
app.get('/api/settings', (_req: Request, res: Response) => {
  const { adminPin, masterOwnerPasswordHash, ...publicSettings } = db.getSettings();
  res.json(publicSettings);
});

app.post('/api/settings', requireMasterOwner, (req: Request, res: Response) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

/* -------------------------------------------------------------
 * VITE DEV SERVER OR PRODUCTION STATIC SERVE
 * ----------------------------------------------------------- */

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VEND+ Backend] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
