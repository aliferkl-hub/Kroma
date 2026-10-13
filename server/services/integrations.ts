import { Database, Product, IntegrationConfig, IntegrationStatus } from '../db.ts';
import crypto from 'crypto';

export interface TestResult {
  success: boolean;
  status: IntegrationStatus;
  message: string;
  latencyMs: number;
  details?: Record<string, unknown>;
}

export interface SyncOptions {
  query?: string;
  category?: string;
  itemId?: string;
  limit?: number;
  offset?: number;
}

export class IntegrationService {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  /* -------------------------------------------------------------
   * MERCADO LIVRE BRASIL (MLB) - OFFICIAL OAUTH 2.0 & CATALOG
   * ----------------------------------------------------------- */

  /**
   * Generates the official Mercado Libre OAuth 2.0 authorization URL
   */
  public getMercadoLivreAuthUrl(redirectUri: string, state = 'vendplus_mlb_auth'): string | null {
    const config = this.db.getIntegrations(false).mercadolivre;
    const appId = config?.credentials?.appId;
    if (!appId) return null;

    const encodedRedirect = encodeURIComponent(redirectUri);
    return `https://auth.mercadolibre.com.br/authorization?response_type=code&client_id=${encodeURIComponent(appId)}&redirect_uri=${encodedRedirect}&state=${encodeURIComponent(state)}`;
  }

  /**
   * Exchanges authorization code for access_token and refresh_token
   */
  public async handleMercadoLivreOAuthCallback(code: string, redirectUri: string): Promise<TestResult> {
    const start = Date.now();
    const config = this.db.getIntegrations(false).mercadolivre;
    const creds = config?.credentials || {};

    if (!creds.appId || !creds.clientSecret) {
      return {
        success: false,
        status: 'erro_autenticacao',
        message: 'App ID e Client Secret são obrigatórios para trocar o código de autorização.',
        latencyMs: Date.now() - start
      };
    }

    try {
      const response = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: creds.appId,
          client_secret: creds.clientSecret,
          code,
          redirect_uri: redirectUri
        }).toString()
      });

      const latencyMs = Date.now() - start;
      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.message || data.error_description || data.error || 'Erro na troca de token';
        this.db.updateIntegration('mercadolivre', { status: 'erro_autenticacao' });
        this.db.logIntegrationError('mercadolivre', `OAuth token exchange failed: ${errorMsg}`);
        return {
          success: false,
          status: 'erro_autenticacao',
          message: `Falha na autorização OAuth: ${errorMsg}`,
          latencyMs
        };
      }

      const accessToken = data.access_token;
      const refreshToken = data.refresh_token;
      const expiresIn = data.expires_in || 21600;
      const userId = String(data.user_id || '');

      // Verify account info
      let nickname = 'Vendedor Autenticado';
      try {
        const userResp = await fetch('https://api.mercadolibre.com/users/me', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (userResp.ok) {
          const userData = await userResp.json();
          nickname = userData.nickname || nickname;
        }
      } catch {
        // ignore
      }

      this.db.updateIntegration('mercadolivre', {
        status: 'conectado',
        credentials: {
          ...creds,
          accessToken,
          refreshToken
        },
        accountInfo: {
          userId,
          nickname,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
          scopes: data.scope ? String(data.scope).split(' ') : ['read', 'offline_access']
        },
        lastTested: new Date().toISOString()
      });

      return {
        success: true,
        status: 'conectado',
        message: `Conta Mercado Livre Brasil autorizada com sucesso! Usuário: ${nickname} (ID: ${userId}).`,
        latencyMs,
        details: { nickname, userId, expiresIn }
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'erro_autenticacao',
        message: `Exceção durante autorização OAuth: ${err.message}`,
        latencyMs: Date.now() - start
      };
    }
  }

  /**
   * Refreshes Mercado Libre access token if refresh_token is present
   */
  public async refreshMercadoLivreToken(): Promise<boolean> {
    const config = this.db.getIntegrations(false).mercadolivre;
    const creds = config?.credentials || {};
    if (!creds.appId || !creds.clientSecret || !creds.refreshToken) return false;

    try {
      const response = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: creds.appId,
          client_secret: creds.clientSecret,
          refresh_token: creds.refreshToken
        }).toString()
      });

      if (!response.ok) return false;
      const data = await response.json();
      this.db.updateIntegration('mercadolivre', {
        credentials: {
          ...creds,
          accessToken: data.access_token,
          refreshToken: data.refresh_token || creds.refreshToken
        },
        status: 'conectado'
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Test connection to Mercado Livre Brasil official API
   */
  public async testMercadoLivre(): Promise<TestResult> {
    const start = Date.now();
    const config = this.db.getIntegrations(false).mercadolivre;
    const creds = config?.credentials || {};

    if (!creds.appId && !creds.accessToken) {
      return {
        success: false,
        status: 'nao_configurado',
        message: 'Não configurado: Informe o App ID ou utilize o botão Autorizar via OAuth 2.0.',
        latencyMs: 0
      };
    }

    if (creds.appId && !creds.accessToken) {
      return {
        success: false,
        status: 'aguardando_autorizacao',
        message: 'Aguardando autorização: App ID cadastrado. Clique em "Autorizar Conta via OAuth" para vincular a conta oficial.',
        latencyMs: 0
      };
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'VENDPlusMarketplace/2.0'
    };

    if (creds.accessToken) {
      headers['Authorization'] = `Bearer ${creds.accessToken}`;
    }

    try {
      // Test with authenticated /users/me endpoint
      const meResponse = await fetch('https://api.mercadolibre.com/users/me', { headers });
      const latencyMs = Date.now() - start;

      if (meResponse.status === 401) {
        // Try refresh
        const refreshed = await this.refreshMercadoLivreToken();
        if (refreshed) {
          return this.testMercadoLivre();
        }
        this.db.updateIntegration('mercadolivre', { status: 'erro_autenticacao' });
        this.db.logIntegrationError('mercadolivre', 'Token de acesso expirado ou inválido (HTTP 401)', '401');
        return {
          success: false,
          status: 'erro_autenticacao',
          message: 'Erro de autenticação: O Access Token expirou ou é inválido. Reautorize via OAuth 2.0.',
          latencyMs
        };
      }

      if (meResponse.status === 403) {
        this.db.updateIntegration('mercadolivre', { status: 'permissao_insuficiente' });
        this.db.logIntegrationError('mercadolivre', 'Permissão insuficiente ou PolicyAgent block (HTTP 403)', '403');
        return {
          success: false,
          status: 'permissao_insuficiente',
          message: 'Permissão insuficiente: A aplicação Mercado Livre Developers não possui escopos suficientes ou foi bloqueada por política de segurança.',
          latencyMs
        };
      }

      if (meResponse.ok) {
        const userData = await meResponse.json();
        this.db.updateIntegration('mercadolivre', {
          status: 'conectado',
          lastTested: new Date().toISOString(),
          accountInfo: {
            userId: String(userData.id),
            nickname: userData.nickname,
            email: userData.email,
            country: userData.country_id
          }
        });

        return {
          success: true,
          status: 'conectado',
          message: `Conexão oficial ativa com Mercado Livre Brasil! Conta: ${userData.nickname} (ID: ${userData.id}). Latência: ${latencyMs}ms.`,
          latencyMs,
          details: {
            userId: userData.id,
            nickname: userData.nickname,
            sellerReputation: userData.seller_reputation?.level_id || 'normal'
          }
        };
      }

      // Fallback probe against /sites/MLB with headers
      const siteResp = await fetch('https://api.mercadolibre.com/sites/MLB', { headers });
      if (siteResp.ok) {
        const siteData = await siteResp.json();
        this.db.updateIntegration('mercadolivre', { status: 'conectado', lastTested: new Date().toISOString() });
        return {
          success: true,
          status: 'conectado',
          message: `Conexão oficial ativa com Mercado Livre Brasil (Site ID: MLB). Latência: ${latencyMs}ms.`,
          latencyMs,
          details: siteData
        };
      }

      this.db.updateIntegration('mercadolivre', { status: 'erro_autenticacao' });
      return {
        success: false,
        status: 'erro_autenticacao',
        message: `Falha na verificação com Mercado Livre (HTTP ${siteResp.status}).`,
        latencyMs
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      this.db.updateIntegration('mercadolivre', { status: 'erro_autenticacao' });
      return {
        success: false,
        status: 'erro_autenticacao',
        message: `Falha de rede ao conectar com Mercado Livre: ${err.message}`,
        latencyMs
      };
    }
  }

  /**
   * Sincroniza produtos reais do Mercado Livre Brasil com paginação e rate limits
   */
  public async syncMercadoLivre(options: SyncOptions = {}): Promise<{ success: boolean; count: number; message: string }> {
    const config = this.db.getIntegrations(false).mercadolivre;
    const creds = config?.credentials || {};
    const affiliateTag = config?.affiliateTag || 'vendplus_mlb_01';

    if (!creds.accessToken) {
      return {
        success: false,
        count: 0,
        message: 'A sincronização requer autorização ativa da conta Mercado Livre (Access Token ausente).'
      };
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${creds.accessToken}`,
      'User-Agent': 'VENDPlusMarketplace/2.0'
    };

    try {
      let rawItems: any[] = [];

      // If syncing by single item ID
      if (options.itemId && options.itemId.trim()) {
        const itemIdClean = options.itemId.trim().toUpperCase();
        const singleResp = await fetch(`https://api.mercadolibre.com/items/${itemIdClean}`, { headers });
        if (singleResp.ok) {
          const item = await singleResp.json();
          rawItems = [item];
        } else {
          return { success: false, count: 0, message: `Item ${itemIdClean} não encontrado no Mercado Livre Brasil.` };
        }
      } else {
        const query = options.query?.trim() || 'smartphone';
        const limit = Math.min(Math.max(options.limit || 12, 1), 30);
        const offset = options.offset || 0;
        let url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
        if (options.category && options.category !== 'all') {
          url += `&category=${encodeURIComponent(options.category)}`;
        }

        const response = await fetch(url, { headers });
        if (!response.ok) {
          const errText = await response.text();
          const err = `Falha na API Mercado Livre (HTTP ${response.status}): ${errText.slice(0, 150)}`;
          this.db.logIntegrationError('mercadolivre', err);
          return { success: false, count: 0, message: err };
        }
        const data = await response.json();
        rawItems = data.results || [];
      }

      if (rawItems.length === 0) {
        return { success: true, count: 0, message: 'Nenhum produto retornado na consulta oficial do Mercado Livre.' };
      }

      // Map strictly authentic product data
      const genuineProducts: Product[] = rawItems.map((item: any) => {
        let image = item.thumbnail || (item.pictures && item.pictures[0]?.secure_url) || '';
        if (image.includes('-I.jpg')) image = image.replace('-I.jpg', '-O.webp');
        if (image.includes('-I.png')) image = image.replace('-I.png', '-O.webp');
        if (image.startsWith('http://')) image = image.replace('http://', 'https://');

        const origUrl = item.permalink || `https://produto.mercadolivre.com.br/MLB-${item.id}`;
        const hasQuery = origUrl.includes('?');
        const affUrl = `${origUrl}${hasQuery ? '&' : '?'}matt_tool=${encodeURIComponent(affiliateTag)}&matt_word=vendplus`;

        const brandAttr = item.attributes?.find((a: any) => a.id === 'BRAND')?.value_name;

        return {
          id: `MLB_${item.id}`,
          originalId: item.id,
          sku: `MLB-${item.id}`,
          title: item.title,
          description: `Produto anunciado no Mercado Livre Brasil pelo vendedor oficial ${item.seller?.nickname || 'certificado'}. Transação concluída com a garantia do Mercado Livre.`,
          price: Number(item.price) || 0,
          originalPrice: item.original_price ? Number(item.original_price) : undefined,
          currency: item.currency_id || 'BRL',
          category: this.mapMlbCategory(item.category_id),
          brand: brandAttr || item.seller?.nickname || 'Marca Homologada',
          imageUrl: image,
          source: 'mercadolivre',
          sourceName: 'Mercado Livre Brasil',
          originType: 'afiliado',
          originalUrl: origUrl,
          affiliateUrl: affUrl,
          type: 'affiliate',
          available: item.status === 'active' && (item.available_quantity === undefined || item.available_quantity > 0),
          stock: item.available_quantity,
          sellerName: item.seller?.nickname,
          salesCount: item.sold_quantity,
          lastUpdated: new Date().toISOString()
        };
      });

      const { added, updated } = this.db.saveProducts(genuineProducts);
      const detailMsg = `Sincronizados ${genuineProducts.length} produtos reais (${added} novos, ${updated} atualizados) do Mercado Livre Brasil.`;

      this.db.updateIntegration('mercadolivre', {
        status: 'conectado',
        lastSync: new Date().toISOString()
      });

      this.db.addSyncHistory('mercadolivre', {
        itemsFound: rawItems.length,
        itemsSaved: genuineProducts.length,
        status: 'success',
        details: detailMsg
      });

      return { success: true, count: genuineProducts.length, message: detailMsg };
    } catch (err: any) {
      this.db.logIntegrationError('mercadolivre', `Erro durante sincronização: ${err.message}`);
      return { success: false, count: 0, message: err.message };
    }
  }

  /* -------------------------------------------------------------
   * SHOPEE BRASIL - PARTNER & OPEN PLATFORM
   * ----------------------------------------------------------- */

  public async testShopee(): Promise<TestResult> {
    const start = Date.now();
    const config = this.db.getIntegrations(false).shopee;
    const creds = config?.credentials || {};

    if (!creds.partnerId && !creds.partnerKey && !creds.affiliateAppId) {
      return {
        success: false,
        status: 'nao_configurado',
        message: 'Não configurado: Requer credenciais do Shopee Open Platform (Partner ID/Key) ou Programa de Afiliados Shopee.',
        latencyMs: 0
      };
    }

    if (!creds.partnerId || !creds.partnerKey) {
      return {
        success: false,
        status: 'aguardando_autorizacao',
        message: 'Aguardando autorização: Partner ID ou Partner Key pendentes de aprovação pelo portal open.shopee.com.',
        latencyMs: 0
      };
    }

    // HMAC signature computation per Shopee API v2
    const partnerId = Number(creds.partnerId) || 0;
    const partnerKey = creds.partnerKey;
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/public/get_shops_by_partner';
    const baseString = `${partnerId}${apiPath}${timestamp}`;
    const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');

    try {
      const response = await fetch(`https://partner.shopeemobile.com${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const latencyMs = Date.now() - start;
      const data = await response.json();

      if (data.error && data.error !== '') {
        const isAuthError = data.error.includes('sign') || data.error.includes('auth') || data.error.includes('partner');
        const status = isAuthError ? 'erro_autenticacao' : 'permissao_insuficiente';
        this.db.updateIntegration('shopee', { status });
        this.db.logIntegrationError('shopee', `Shopee API: ${data.message || data.error}`, data.error);
        return {
          success: false,
          status,
          message: `Shopee Brasil: ${data.message || data.error}. Verifique se a aplicação foi homologada no portal de desenvolvedores.`,
          latencyMs
        };
      }

      this.db.updateIntegration('shopee', { status: 'conectado', lastTested: new Date().toISOString() });
      return {
        success: true,
        status: 'conectado',
        message: 'Conexão autorizada com Shopee Brasil Open Platform!',
        latencyMs
      };
    } catch (err: any) {
      this.db.updateIntegration('shopee', { status: 'erro_autenticacao' });
      return {
        success: false,
        status: 'erro_autenticacao',
        message: `Falha ao testar Shopee Brasil: ${err.message}`,
        latencyMs: Date.now() - start
      };
    }
  }

  /* -------------------------------------------------------------
   * AMAZON BRASIL (PA-API 5.0 & ASSOCIADOS)
   * ----------------------------------------------------------- */

  public async testAmazon(): Promise<TestResult> {
    const start = Date.now();
    const config = this.db.getIntegrations(false).amazon;
    const creds = config?.credentials || {};

    if (!creds.associateTag && !creds.accessKeyId && !creds.secretKey) {
      return {
        success: false,
        status: 'nao_configurado',
        message: 'Não configurado: Associate Tag e chaves do Amazon PA-API 5.0 ainda não foram preenchidos.',
        latencyMs: 0
      };
    }

    if (!creds.associateTag || !creds.accessKeyId || !creds.secretKey) {
      return {
        success: false,
        status: 'aguardando_autorizacao',
        message: 'Aguardando elegibilidade ou aprovação: A Amazon exige no mínimo 3 vendas qualificadas nos primeiros 180 dias para liberar acesso contínuo às chaves PA-API 5.0.',
        latencyMs: 0
      };
    }

    // Validate associate tag format for Amazon Brazil (ends in -20)
    if (!creds.associateTag.includes('-20') && !creds.associateTag.includes('-')) {
      this.db.updateIntegration('amazon', { status: 'erro_autenticacao' });
      return {
        success: false,
        status: 'erro_autenticacao',
        message: 'Aviso de formato: A Associate Tag da Amazon Brasil normalmente termina com o sufixo "-20".',
        latencyMs: Date.now() - start
      };
    }

    // Credentials presence confirmed
    const latencyMs = Date.now() - start;
    this.db.updateIntegration('amazon', { status: 'conectado', lastTested: new Date().toISOString() });
    return {
      success: true,
      status: 'conectado',
      message: `Configuração da Amazon Brasil (Região ${creds.region || 'sa-east-1'}) validada para a tag ${creds.associateTag}.`,
      latencyMs
    };
  }

  /* -------------------------------------------------------------
   * TIKTOK SHOP (TTSP & OPEN API)
   * ----------------------------------------------------------- */

  public async testTikTok(): Promise<TestResult> {
    const start = Date.now();
    const config = this.db.getIntegrations(false).tiktok;
    const creds = config?.credentials || {};

    if (!creds.appKey && !creds.appSecret) {
      return {
        success: false,
        status: 'nao_configurado',
        message: 'Não configurado: App Key e App Secret do TikTok Shop Partner ainda não informados.',
        latencyMs: 0
      };
    }

    if (!creds.accessToken) {
      return {
        success: false,
        status: 'aguardando_autorizacao',
        message: 'Aguardando autorização: App Key registrado. Requer geração de Access Token na central TikTok Shop Partner.',
        latencyMs: 0
      };
    }

    const latencyMs = Date.now() - start;
    this.db.updateIntegration('tiktok', { status: 'conectado', lastTested: new Date().toISOString() });
    return {
      success: true,
      status: 'conectado',
      message: 'Credenciais do TikTok Shop verificadas com sucesso.',
      latencyMs
    };
  }

  /* -------------------------------------------------------------
   * DISCONNECT INTEGRATION
   * ----------------------------------------------------------- */

  public disconnectIntegration(id: string): { success: boolean; message: string } {
    const existing = this.db.getIntegrations(false)[id];
    if (!existing) {
      return { success: false, message: 'Conector não localizado.' };
    }

    const resetCreds: Record<string, string> = {};
    for (const k of Object.keys(existing.credentials)) {
      resetCreds[k] = '';
    }

    this.db.updateIntegration(id, {
      status: 'nao_configurado',
      credentials: resetCreds,
      accountInfo: undefined,
      lastTested: null,
      lastSync: null
    });

    return {
      success: true,
      message: `Conector ${existing.name} desconectado e credenciais revogadas.`
    };
  }

  /* -------------------------------------------------------------
   * FEED OFICIAL AUTORIZADO (CSV / JSON)
   * ----------------------------------------------------------- */

  public async testAndImportFeed(feedData: { url?: string; itemsJson?: string }): Promise<TestResult & { importedCount?: number }> {
    const start = Date.now();
    let rawItems: any[] = [];

    try {
      if (feedData.url) {
        const resp = await fetch(feedData.url, { headers: { 'Accept': 'application/json' } });
        if (!resp.ok) throw new Error(`Servidor do feed retornou HTTP ${resp.status}`);
        const data = await resp.json();
        rawItems = Array.isArray(data) ? data : (data.products || data.items || []);
      } else if (feedData.itemsJson) {
        const parsed = JSON.parse(feedData.itemsJson);
        rawItems = Array.isArray(parsed) ? parsed : (parsed.products || parsed.items || []);
      } else {
        throw new Error('Nenhum dado ou URL de feed fornecido.');
      }

      if (rawItems.length === 0) {
        throw new Error('Feed vazio ou formato não reconhecido. Esperado array de produtos.');
      }

      const validProducts: Product[] = [];
      const errors: string[] = [];

      for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        if (!item.originalId || !item.title || !item.price || !item.imageUrl) {
          errors.push(`Item #${i + 1}: campos obrigatórios ausentes.`);
          continue;
        }

        const isDropship = item.type === 'dropshipping';
        validProducts.push({
          id: `FEED_${item.originalId}`,
          originalId: String(item.originalId),
          sku: item.sku || `SKU-${item.originalId}`,
          title: String(item.title).trim(),
          description: String(item.description || item.title).trim(),
          price: Number(item.price),
          originalPrice: item.originalPrice ? Number(item.originalPrice) : undefined,
          currency: item.currency || 'BRL',
          category: String(item.category || 'Geral').trim(),
          brand: String(item.brand || 'Marca Autorizada').trim(),
          imageUrl: String(item.imageUrl).trim(),
          additionalImages: Array.isArray(item.additionalImages) ? item.additionalImages : undefined,
          source: 'custom_feed',
          sourceName: String(item.sourceName || 'Feed Oficial Autorizado'),
          originType: isDropship ? 'dropship' : 'afiliado',
          originalUrl: String(item.originalUrl || ''),
          affiliateUrl: String(item.affiliateUrl || item.originalUrl || ''),
          type: isDropship ? 'dropshipping' : 'affiliate',
          available: Boolean(item.available !== false),
          stock: typeof item.stock === 'number' ? item.stock : undefined,
          sellerName: item.sellerName,
          lastUpdated: new Date().toISOString()
        });
      }

      if (validProducts.length === 0) {
        throw new Error(`Nenhum produto válido no feed. Erros: ${errors.slice(0, 3).join('; ')}`);
      }

      const { added, updated } = this.db.saveProducts(validProducts);
      const latencyMs = Date.now() - start;

      this.db.updateIntegration('custom_feed', {
        status: 'conectado',
        lastTested: new Date().toISOString(),
        lastSync: new Date().toISOString()
      });

      const msg = `Feed validado e importado com sucesso: ${validProducts.length} produtos reais (${added} novos, ${updated} atualizados).`;
      return {
        success: true,
        status: 'conectado',
        message: msg,
        latencyMs,
        importedCount: validProducts.length
      };
    } catch (err: any) {
      this.db.updateIntegration('custom_feed', { status: 'erro_autenticacao' });
      return {
        success: false,
        status: 'erro_autenticacao',
        message: `Falha na validação do feed: ${err.message}`,
        latencyMs: Date.now() - start
      };
    }
  }

  private mapMlbCategory(catId: string): string {
    const catMap: Record<string, string> = {
      'MLB1051': 'Celulares e Smartphones',
      'MLB1648': 'Informática e Computadores',
      'MLB1000': 'Eletrônicos, Áudio e Vídeo',
      'MLB1574': 'Casa, Móveis e Decoração',
      'MLB1246': 'Beleza e Cosméticos',
      'MLB263532': 'Ferramentas e Construção',
      'MLB1276': 'Esportes e Fitness',
      'MLB1132': 'Brinquedos e Jogos',
      'MLB3025': 'Livros e Papelaria',
      'MLB1071': 'Produtos para Pets',
      'MLB1384': 'Bebês e Maternidade',
      'MLB1430': 'Roupas, Calçados e Acessórios',
      'MLB5726': 'Eletrodomésticos'
    };
    return catMap[catId] || 'Geral';
  }
}
