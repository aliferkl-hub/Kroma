import React, { useState, useEffect } from 'react';
import {
  Layers,
  ShoppingBag,
  Truck,
  MousePointerClick,
  Sliders,
  Settings,
  ShieldCheck,
  RefreshCw,
  LogOut,
  TrendingUp,
  AlertCircle,
  Package,
  Zap,
  ArrowRight
} from 'lucide-react';
import { IntegrationsTab } from './IntegrationsTab';
import { ProductsTab } from './ProductsTab';
import { DropshipTab } from './DropshipTab';
import { ClicksTab } from './ClicksTab';
import { SettingsTab } from './SettingsTab';
import { Product, IntegrationConfig, AdminStats } from '../../types';

interface AdminDashboardProps {
  onBackToStore: () => void;
  adminToken: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToStore,
  adminToken
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'integrations' | 'products' | 'dropship' | 'clicks' | 'settings'>('integrations');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [integrations, setIntegrations] = useState<Record<string, IntegrationConfig>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductSource, setSelectedProductSource] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, intRes, prodRes] = await Promise.all([
        fetch('/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'x-admin-token': adminToken
          }
        }),
        fetch('/api/integrations', {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'x-admin-token': adminToken
          }
        }),
        fetch('/api/products')
      ]);

      const [statsData, intData, prodData] = await Promise.all([
        statsRes.json(),
        intRes.json(),
        prodRes.json()
      ]);

      setStats(statsData);
      setIntegrations(intData);
      setProducts(prodData.products || []);
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [adminToken]);

  const handleViewImportedProducts = (source: string) => {
    setSelectedProductSource(source);
    setActiveTab('products');
  };

  return (
    <div className="min-h-screen bg-[#080B12] text-slate-200">
      
      {/* Admin Top Navigation */}
      <div className="border-b border-slate-800 bg-[#0B0F19] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-purple-900/40">
              V+
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>VEND+ Master Owner</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.2 rounded font-mono">
                  Sessão Ativa
                </span>
              </h2>
              <span className="text-[10px] text-purple-400 font-mono">Central de Integrações Oficiais & Governança</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Recarregar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onBackToStore}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Voltar ao Marketplace</span>
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto no-scrollbar text-xs border-t border-slate-800/60">
          <button
            onClick={() => setActiveTab('integrations')}
            className={`py-3 px-4 font-semibold whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'integrations'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Central de Integrações ({Object.keys(integrations).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 font-semibold whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => {
              setSelectedProductSource('all');
              setActiveTab('products');
            }}
            className={`py-3 px-4 font-semibold whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'products'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Catálogo VEND+ ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('dropship')}
            className={`py-3 px-4 font-semibold whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'dropship'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Fornecedores & Dropship</span>
          </button>

          <button
            onClick={() => setActiveTab('clicks')}
            className={`py-3 px-4 font-semibold whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'clicks'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MousePointerClick className="w-4 h-4" />
            <span>Cliques & Afiliados ({stats?.totalClicks || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 font-semibold whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações & Visual</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'integrations' && (
          <IntegrationsTab
            integrations={integrations}
            onRefresh={fetchDashboardData}
            adminToken={adminToken}
            onViewImportedProducts={handleViewImportedProducts}
          />
        )}

        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-4 rounded-xl bg-[#111624] border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Total de Produtos</div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {stats?.totalProducts ?? 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">100% itens reais</div>
              </div>

              <div className="p-4 rounded-xl bg-[#111624] border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Itens de Afiliados</div>
                <div className="text-2xl font-bold text-purple-400 tabular-nums">
                  {stats?.affiliateProducts ?? 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Redirecionamento oficial</div>
              </div>

              <div className="p-4 rounded-xl bg-[#111624] border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Itens Dropshipping</div>
                <div className="text-2xl font-bold text-emerald-400 tabular-nums">
                  {stats?.dropshipProducts ?? 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Envio homologado</div>
              </div>

              <div className="p-4 rounded-xl bg-[#111624] border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Cliques Auditados</div>
                <div className="text-2xl font-bold text-cyan-400 tabular-nums">
                  {stats?.totalClicks ?? 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Tráfego registrado</div>
              </div>

              <div className="p-4 rounded-xl bg-[#111624] border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Fornecedores</div>
                <div className="text-2xl font-bold text-amber-400 tabular-nums">
                  {stats?.totalSuppliers ?? 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Com CNPJ verificado</div>
              </div>

              <div className="p-4 rounded-xl bg-[#111624] border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Conectores Ativos</div>
                <div className="text-2xl font-bold text-blue-400 tabular-nums">
                  {stats?.connectedIntegrations ?? 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Com resposta de rede</div>
              </div>
            </div>

            {/* Quick Actions & Governance Guidance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-[#111624] border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Central de Integrações Oficiais</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Gerencie chaves, execute testes de conexão em tempo real e sincronize produtos autênticos do Mercado Livre Brasil, Shopee, Amazon e TikTok Shop.
                </p>
                <button
                  onClick={() => setActiveTab('integrations')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-purple-900/30"
                >
                  <span>Abrir Central de Integrações</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-[#111624] border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Governança VEND+ & Supabase</h3>
                </div>
                <ul className="text-xs text-slate-400 space-y-2 mb-4">
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Migração idempotente gerada em <code className="text-purple-300 font-mono">/supabase/migrations/</code>.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Credenciais criptografadas via AES-256-GCM sem exposição no frontend.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Diferenciação clara entre produtos próprios, dropshipping e afiliados.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Distribution Summary */}
            <div className="p-6 rounded-2xl bg-[#111624] border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-4">Distribuição do Catálogo por Plataforma Parceira</h3>
              {Object.keys(stats?.productsBySource || {}).length === 0 ? (
                <div className="text-xs text-slate-500">
                  Nenhum produto cadastrado até o momento. Acesse a aba "Central de Integrações" para sincronizar itens reais.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  {Object.entries(stats?.productsBySource || {}).map(([src, count]) => (
                    <div key={src} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
                      <span className="capitalize font-medium text-slate-300">{src.replace(/_/g, ' ')}</span>
                      <span className="font-bold text-purple-400 tabular-nums">{count} itens</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <ProductsTab
            products={products}
            onRefresh={fetchDashboardData}
            adminToken={adminToken}
            initialSourceFilter={selectedProductSource}
          />
        )}

        {activeTab === 'dropship' && (
          <DropshipTab
            adminToken={adminToken}
          />
        )}

        {activeTab === 'clicks' && (
          <ClicksTab
            adminPin={adminToken}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            adminPin={adminToken}
            onRefresh={fetchDashboardData}
          />
        )}
      </main>

    </div>
  );
};
