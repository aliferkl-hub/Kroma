import { Database } from '../db.ts';
import { IntegrationService } from './integrations.ts';

export class SyncScheduler {
  private static instance: SyncScheduler;
  private db: Database;
  private integrationService: IntegrationService;
  private intervalTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  private constructor() {
    this.db = Database.getInstance();
    this.integrationService = new IntegrationService();
  }

  public static getInstance(): SyncScheduler {
    if (!SyncScheduler.instance) {
      SyncScheduler.instance = new SyncScheduler();
    }
    return SyncScheduler.instance;
  }

  /**
   * Start scheduled synchronization background worker (every 30 minutes)
   */
  public startScheduler(intervalMs = 30 * 60 * 1000) {
    if (this.intervalTimer) return;
    console.log('[VEND+ SyncScheduler] Inicializando sincronizador automático em segundo plano...');
    this.intervalTimer = setInterval(() => {
      this.runPeriodicSync().catch((err) => {
        console.error('[VEND+ SyncScheduler] Falha no ciclo de sincronização:', err);
      });
    }, intervalMs);
  }

  public stopScheduler() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  /**
   * Run a sync cycle for all connected integrations
   */
  public async runPeriodicSync(): Promise<{ totalUpdated: number; errors: string[] }> {
    if (this.isSyncing) {
      console.log('[VEND+ SyncScheduler] Ciclo anterior ainda em andamento. Aguardando...');
      return { totalUpdated: 0, errors: ['Sync already in progress'] };
    }

    this.isSyncing = true;
    const errors: string[] = [];
    let totalUpdated = 0;

    try {
      const integrations = this.db.getIntegrations(false); // get raw config

      // 1. Sync Mercado Livre if connected
      const mlb = integrations.mercadolivre;
      if (mlb && mlb.status === 'conectado') {
        try {
          const res = await this.integrationService.syncMercadoLivre({ limit: 20 });
          if (res.success) {
            totalUpdated += res.count;
          } else {
            errors.push(`Mercado Livre sync: ${res.message}`);
          }
        } catch (e: any) {
          errors.push(`Mercado Livre error: ${e.message}`);
        }
      }

      // 2. Validate availability and price updates for existing products
      await this.verifyProductsAvailability();

      return { totalUpdated, errors };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Periodically validates product availability to flag or disable unavailable items
   */
  private async verifyProductsAvailability() {
    const products = this.db.getProducts({ availableOnly: false });
    const integrations = this.db.getIntegrations(false);
    const mlbToken = integrations.mercadolivre?.credentials?.accessToken;

    if (!mlbToken) return;

    // Check a batch of up to 15 items to respect API rate limits
    const mlbProducts = products.filter(p => p.source === 'mercadolivre').slice(0, 15);
    for (const p of mlbProducts) {
      try {
        const resp = await fetch(`https://api.mercadolibre.com/items/${p.originalId}`, {
          headers: {
            'Authorization': `Bearer ${mlbToken}`,
            'Accept': 'application/json'
          }
        });
        if (resp.ok) {
          const item = await resp.json();
          const isAvailable = item.status === 'active' && (item.available_quantity || 0) > 0;
          const currentPrice = Number(item.price) || p.price;
          
          this.db.saveProducts([{
            ...p,
            price: currentPrice,
            available: isAvailable,
            stock: item.available_quantity,
            lastUpdated: new Date().toISOString()
          }]);
        } else if (resp.status === 404) {
          // Item deleted from marketplace, mark unavailable
          this.db.saveProducts([{
            ...p,
            available: false,
            lastUpdated: new Date().toISOString()
          }]);
        }
      } catch (err) {
        // Silently skip item check on transient network failure
      }
    }
  }
}
